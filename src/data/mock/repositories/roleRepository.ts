import {
  can,
  canCreateSpecialAssignment,
  canManageMappings,
  canRevokeSpecialAssignment,
  checkAssignRole,
  specialAssignmentState,
  type AssignRoleDenial,
} from '@/auth/policy';
import { listRoleDefinitions } from '@/auth/roles';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type ForbiddenReason,
} from '@/data/errors';
import type { RoleRepository } from '@/data/repositories';
import { appendAudit, assertCan, assignmentFor, db, mockCall, requireSubject } from '@/data/store';
import { findMappingForPosition, previewPositionMapping } from '@/domain/rules/mappings';
import {
  positionMappingInputSchema,
  revokeSpecialAssignmentSchema,
  roleAssignmentInputSchema,
  specialAssignmentInputSchema,
} from '@/domain/schemas';
import type {
  ID,
  ImportedPositionSummary,
  MappingPreview,
  PositionRoleMapping,
  RoleAssignment,
  Scope,
  SpecialAssignment,
  Subject,
} from '@/domain';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';
import { paths } from '@/lib/routes';

import { mappingIdFor } from '../seed/demoAccounts';
import { chapterName, msg, validateInput } from '../helpers';
import { dateText, permissionLabel, roleLabel, scopeLabel } from '../services/labels';
import { notifyUsers } from '../services/notify';

/**
 * Roles, special (time-boxed) permissions and position-to-role mappings — emulated FastAPI
 * endpoints with escalation prevention (checkAssignRole / canCreateSpecialAssignment), audit
 * entries and notifications to the affected member.
 */

const DENIAL_REASON: Record<AssignRoleDenial, ForbiddenReason> = {
  missing_permission: 'permission_denied',
  scope_not_covered: 'permission_denied',
  scope_not_allowed_for_role: 'role_escalation',
  escalation: 'role_escalation',
  self_assignment: 'self_action',
  target_outranks: 'role_escalation',
};

function memberInRoleScope(subject: Subject, userId: ID): boolean {
  const member = db.get('members', userId);
  if (!member) return false;
  const target = { chapterId: member.chapterId };
  return can(subject, 'role.read', target) || can(subject, 'member.access.manage', target);
}

function assertScopeChaptersExist(scope: Scope, field: string): void {
  if ((scope.chapterIds ?? []).some((id) => !db.get('chapters', id))) {
    throw new ValidationError({ [field]: 'messages.validation.unknownChapter' });
  }
}

function auditMapping(
  subject: Subject,
  action: 'mapping.created' | 'mapping.updated' | 'mapping.deleted',
  mapping: PositionRoleMapping,
): void {
  const key =
    action === 'mapping.created'
      ? 'mappingCreated'
      : action === 'mapping.updated'
        ? 'mappingUpdated'
        : 'mappingDeleted';
  appendAudit(subject, {
    action,
    entityType: 'position_mapping',
    entityId: mapping.id,
    chapterId: null,
    summary: msg(`messages.audit.${key}`, {
      position: mapping.positionTitle,
      role: roleLabel(mapping.role),
    }),
    metadata: {
      positionCode: mapping.positionCode,
      role: mapping.role,
      scopeLevel: mapping.scopeLevel,
      priority: mapping.priority,
      active: mapping.active,
    },
  });
}

function assertNoDuplicateMapping(
  code: string,
  priority: number,
  active: boolean,
  exceptId: ID | null,
): void {
  if (!active) return;
  const clash = db.find(
    'positionMappings',
    (m) => m.active && m.positionCode === code && m.priority === priority && m.id !== exceptId,
  );
  if (clash.length > 0) throw new ConflictError('messages.errors.mappingDuplicate');
}

function newMappingId(code: string): ID {
  const base = mappingIdFor(code);
  if (!db.get('positionMappings', base)) return base;
  let n = 2;
  while (db.get('positionMappings', `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function createMockRoleRepository(): RoleRepository {
  return {
    listRoleDefinitions: () =>
      mockCall(() => {
        requireSubject();
        return listRoleDefinitions();
      }),

    listAssignments: (query = {}) =>
      mockCall((): RoleAssignment[] => {
        const subject = requireSubject();
        assertCan(subject, 'role.read');
        return db
          .list('roleAssignments')
          .filter((a) => {
            const member = db.get('members', a.userId);
            if (!member || !can(subject, 'role.read', { chapterId: member.chapterId }))
              return false;
            if (query.role && query.role !== 'all' && a.role !== query.role) return false;
            if (query.chapterId && member.chapterId !== query.chapterId) return false;
            return true;
          })
          .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
      }),

    assignRole: (input) =>
      mockCall((): RoleAssignment => {
        const subject = requireSubject();
        const data = validateInput(roleAssignmentInputSchema, input);
        if (!memberInRoleScope(subject, data.userId))
          throw new NotFoundError('member', data.userId);
        assertScopeChaptersExist(data.scope, 'scope.chapterIds');
        const current = assignmentFor(data.userId);
        const check = checkAssignRole(subject, data.role, data.scope, {
          userId: data.userId,
          currentRole: current.role,
        });
        if (!check.allowed) {
          throw new ForbiddenError(
            DENIAL_REASON[check.reason ?? 'missing_permission'],
            'role.assign',
          );
        }
        const member = db.require('members', data.userId, 'member');
        const assignment: RoleAssignment = {
          id: `ra-${data.userId}`,
          userId: data.userId,
          role: data.role,
          scope: data.scope,
          source: 'manual',
          mappingId: null,
          assignedBy: subject.userId,
          assignedAt: clock.nowIso(),
          reason: data.reason,
        };
        db.transaction(() => {
          db.upsert('roleAssignments', assignment);
          appendAudit(subject, {
            action: 'role.assigned',
            entityType: 'role_assignment',
            entityId: assignment.id,
            chapterId: member.chapterId,
            summary: msg('messages.audit.roleAssigned', {
              name: member.displayName,
              role: roleLabel(data.role),
              scope: scopeLabel(data.scope, chapterName),
              reason: data.reason,
            }),
            metadata: {
              userId: data.userId,
              from: current.role,
              to: data.role,
              scopeLevel: data.scope.level,
              source: 'manual',
            },
          });
          notifyUsers([data.userId], {
            category: 'account',
            title: msg('messages.notifications.roleChanged.title'),
            body: msg('messages.notifications.roleChanged.body', {
              role: roleLabel(data.role),
              scope: scopeLabel(data.scope, chapterName),
            }),
            link: { to: paths.profile(), entityType: 'role_assignment', entityId: assignment.id },
            actorId: subject.userId,
          });
        });
        return assignment;
      }),

    listSpecialAssignments: (query = {}) =>
      mockCall((): SpecialAssignment[] => {
        const subject = requireSubject();
        assertCan(subject, 'role.read');
        const now = clock.now();
        return db
          .list('specialAssignments')
          .filter((sa) => memberInRoleScope(subject, sa.userId))
          .filter((sa) => !query.userId || sa.userId === query.userId)
          .filter((sa) => {
            if (query.includeInactive) return true;
            const state = specialAssignmentState(sa, now);
            return state === 'active' || state === 'scheduled';
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }),

    createSpecialAssignment: (input) =>
      mockCall((): SpecialAssignment => {
        const subject = requireSubject();
        const data = validateInput(specialAssignmentInputSchema, input);
        if (!memberInRoleScope(subject, data.userId))
          throw new NotFoundError('member', data.userId);
        assertScopeChaptersExist(data.scope, 'scope.chapterIds');
        const approver = db.get('users', data.approverId);
        if (!approver || approver.status !== 'active' || !db.get('members', data.approverId)) {
          throw new ValidationError({ approverId: 'messages.validation.approverInvalid' });
        }
        if (Date.parse(data.endsAt) <= clock.now().getTime()) {
          throw new ValidationError({ endsAt: 'validation.mustBeInFuture' });
        }
        if (!canCreateSpecialAssignment(subject, data.permission, data.scope, data.userId)) {
          throw new ForbiddenError(
            data.userId === subject.userId ? 'self_action' : 'role_escalation',
            data.permission,
          );
        }
        const member = db.require('members', data.userId, 'member');
        const assignment: SpecialAssignment = {
          id: createId('sa'),
          userId: data.userId,
          permission: data.permission,
          scope: data.scope,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          reason: data.reason,
          approverId: data.approverId,
          createdBy: subject.userId,
          createdAt: clock.nowIso(),
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
        };
        db.transaction(() => {
          db.upsert('specialAssignments', assignment);
          appendAudit(subject, {
            action: 'special_assignment.created',
            entityType: 'special_assignment',
            entityId: assignment.id,
            chapterId: member.chapterId,
            summary: msg('messages.audit.specialAssignmentCreated', {
              name: member.displayName,
              permission: permissionLabel(data.permission),
              end: dateText(data.endsAt),
            }),
            metadata: {
              userId: data.userId,
              permission: data.permission,
              scopeLevel: data.scope.level,
              approverId: data.approverId,
              startsAt: data.startsAt,
              endsAt: data.endsAt,
            },
          });
          notifyUsers([data.userId], {
            category: 'account',
            title: msg('messages.notifications.specialAssignmentGranted.title'),
            body: msg('messages.notifications.specialAssignmentGranted.body', {
              permission: permissionLabel(data.permission),
              start: dateText(data.startsAt),
              end: dateText(data.endsAt),
            }),
            link: {
              to: paths.profile(),
              entityType: 'special_assignment',
              entityId: assignment.id,
            },
            actorId: subject.userId,
          });
        });
        return assignment;
      }),

    revokeSpecialAssignment: (id, reason) =>
      mockCall((): SpecialAssignment => {
        const subject = requireSubject();
        const assignment = db.get('specialAssignments', id);
        if (!assignment || !memberInRoleScope(subject, assignment.userId)) {
          throw new NotFoundError('special_assignment', id);
        }
        if (assignment.revokedAt) throw new ForbiddenError('invalid_transition');
        if (!canRevokeSpecialAssignment(subject, assignment)) {
          throw new ForbiddenError('permission_denied', 'role.assign');
        }
        const data = validateInput(revokeSpecialAssignmentSchema, { reason });
        const revoked: SpecialAssignment = {
          ...assignment,
          revokedAt: clock.nowIso(),
          revokedBy: subject.userId,
          revokeReason: data.reason,
        };
        const member = db.require('members', assignment.userId, 'member');
        db.transaction(() => {
          db.upsert('specialAssignments', revoked);
          appendAudit(subject, {
            action: 'special_assignment.revoked',
            entityType: 'special_assignment',
            entityId: id,
            chapterId: member.chapterId,
            summary: msg('messages.audit.specialAssignmentRevoked', {
              name: member.displayName,
              permission: permissionLabel(assignment.permission),
              reason: data.reason,
            }),
            metadata: { userId: assignment.userId, permission: assignment.permission },
          });
          notifyUsers([assignment.userId], {
            category: 'account',
            title: msg('messages.notifications.specialAssignmentRevoked.title'),
            body: msg('messages.notifications.specialAssignmentRevoked.body', {
              permission: permissionLabel(assignment.permission),
              reason: data.reason,
            }),
            link: { to: paths.profile(), entityType: 'special_assignment', entityId: id },
            actorId: subject.userId,
          });
        });
        return revoked;
      }),

    listMappings: () =>
      mockCall((): PositionRoleMapping[] => {
        const subject = requireSubject();
        assertCan(subject, 'role.read');
        return db
          .list('positionMappings')
          .sort(
            (a, b) =>
              a.positionCode.localeCompare(b.positionCode) ||
              b.priority - a.priority ||
              a.id.localeCompare(b.id),
          );
      }),

    createMapping: (input) =>
      mockCall((): PositionRoleMapping => {
        const subject = requireSubject();
        if (!canManageMappings(subject))
          throw new ForbiddenError('permission_denied', 'role.mapping.manage');
        const data = validateInput(positionMappingInputSchema, input);
        assertNoDuplicateMapping(data.positionCode, data.priority, data.active, null);
        const mapping: PositionRoleMapping = {
          id: newMappingId(data.positionCode),
          ...data,
          updatedAt: clock.nowIso(),
          updatedBy: subject.userId,
        };
        db.transaction(() => {
          db.upsert('positionMappings', mapping);
          auditMapping(subject, 'mapping.created', mapping);
        });
        return mapping;
      }),

    updateMapping: (id, input) =>
      mockCall((): PositionRoleMapping => {
        const subject = requireSubject();
        assertCan(subject, 'role.read');
        const existing = db.get('positionMappings', id);
        if (!existing) throw new NotFoundError('position_mapping', id);
        if (!canManageMappings(subject))
          throw new ForbiddenError('permission_denied', 'role.mapping.manage');
        const data = validateInput(positionMappingInputSchema, input);
        assertNoDuplicateMapping(data.positionCode, data.priority, data.active, id);
        const mapping: PositionRoleMapping = {
          ...existing,
          ...data,
          updatedAt: clock.nowIso(),
          updatedBy: subject.userId,
        };
        db.transaction(() => {
          db.upsert('positionMappings', mapping);
          auditMapping(subject, 'mapping.updated', mapping);
        });
        return mapping;
      }),

    deleteMapping: (id) =>
      mockCall(() => {
        const subject = requireSubject();
        assertCan(subject, 'role.read');
        const existing = db.get('positionMappings', id);
        if (!existing) throw new NotFoundError('position_mapping', id);
        if (!canManageMappings(subject))
          throw new ForbiddenError('permission_denied', 'role.mapping.manage');
        if (db.count('roleAssignments', (a) => a.source === 'mapping' && a.mappingId === id) > 0) {
          throw new ConflictError('messages.errors.mappingInUse');
        }
        db.transaction(() => {
          db.remove('positionMappings', id);
          auditMapping(subject, 'mapping.deleted', existing);
        });
      }),

    previewMapping: (positionCode) =>
      mockCall((): MappingPreview => {
        const subject = requireSubject();
        assertCan(subject, 'role.read');
        const code = positionCode.trim().toUpperCase();
        const holders = db
          .find('members', (m) => m.importedPosition?.code === code)
          .map((m) => ({ chapterId: m.chapterId, position: m.importedPosition }));
        return previewPositionMapping(
          code,
          db.list('positionMappings'),
          holders,
          subject.homeChapterId,
        );
      }),

    listImportedPositions: () =>
      mockCall((): ImportedPositionSummary[] => {
        const subject = requireSubject();
        assertCan(subject, 'role.read');
        const mappings = db.list('positionMappings');
        const byCode = new Map<string, ImportedPositionSummary>();
        for (const member of db.list('members')) {
          const position = member.importedPosition;
          if (!position || !can(subject, 'role.read', { chapterId: member.chapterId })) continue;
          const existing = byCode.get(position.code);
          if (existing) {
            existing.memberCount += 1;
            continue;
          }
          byCode.set(position.code, {
            code: position.code,
            title: position.title,
            level: position.level,
            memberCount: 1,
            mappingId: findMappingForPosition(position.code, mappings)?.id ?? null,
          });
        }
        return [...byCode.values()].sort(
          (a, b) => a.level.localeCompare(b.level) || a.code.localeCompare(b.code),
        );
      }),
  };
}
