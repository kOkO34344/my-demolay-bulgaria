import { db } from '@/data/store';
import { assignmentNeedsUpdate, resolveMemberRole, type RoleResolution } from '@/domain/rules/mappings';
import type { ID, RoleAssignment, RoleChange, Subject } from '@/domain';
import { paths } from '@/lib/routes';

import { chapterName, msg } from '../helpers';

import { roleLabel, scopeLabel } from './labels';
import { notifyUsers } from './notify';

/**
 * Applies the position-to-role mapping rules to one member (used by the demo synchronisation and
 * by resolving an "unmapped position" exception). Manual assignments are never touched.
 * Returns the role change, or null when nothing changed.
 */
export function applyMappedRole(
  userId: ID,
  context: { at: string; actor: Subject | null },
): { change: RoleChange | null; resolution: RoleResolution } {
  const member = db.require('members', userId, 'member');
  const current = db.get('roleAssignments', `ra-${userId}`) ?? null;
  const resolution = resolveMemberRole({
    position: member.importedPosition,
    homeChapterId: member.chapterId,
    mappings: db.list('positionMappings'),
    current,
  });
  if (resolution.kind !== 'mapped') return { change: null, resolution };
  if (!assignmentNeedsUpdate(current, resolution.role, resolution.scope, resolution.mapping.id)) {
    return { change: null, resolution };
  }
  const assignment: RoleAssignment = {
    id: `ra-${userId}`,
    userId,
    role: resolution.role,
    scope: resolution.scope,
    source: 'mapping',
    mappingId: resolution.mapping.id,
    assignedBy: null,
    assignedAt: context.at,
    reason: null,
  };
  db.upsert('roleAssignments', assignment);
  const change: RoleChange = {
    userId,
    displayName: member.displayName,
    fromRole: current?.role ?? null,
    toRole: resolution.role,
    scope: resolution.scope,
    mappingId: resolution.mapping.id,
  };
  if (change.fromRole !== change.toRole) {
    notifyUsers([userId], {
      category: 'account',
      title: msg('messages.notifications.roleChanged.title'),
      body: msg('messages.notifications.roleChanged.body', {
        role: roleLabel(resolution.role),
        scope: scopeLabel(resolution.scope, chapterName),
      }),
      link: { to: paths.profile(), entityType: 'role_assignment', entityId: assignment.id },
      actorId: context.actor?.userId ?? null,
    });
  }
  return { change, resolution };
}
