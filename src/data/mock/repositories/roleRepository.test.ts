import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import { ROLES, type PositionMappingInput, type SpecialAssignmentInput } from '@/domain';
import { clock } from '@/lib/clock';

import { SEED_IDS } from '../seed';
import { auditEntries, notificationsOf, signInAs } from '../testing';

import { createMockRoleRepository } from './roleRepository';

const roles = createMockRoleRepository();
const IDS = SEED_IDS.roles;

const days = (n: number) => new Date(clock.now().getTime() + n * 86_400_000).toISOString();

const special = (overrides: Partial<SpecialAssignmentInput> = {}): SpecialAssignmentInput => ({
  userId: 'u-s08',
  permission: 'event.create',
  scope: { level: 'chapter', chapterIds: ['ch-1'] },
  startsAt: days(0),
  endsAt: days(14),
  reason: 'Organising the winter charity concert.',
  approverId: 'u-s12',
  ...overrides,
});

const deaconMapping: PositionMappingInput = {
  positionCode: 'CH_SENIOR_DEACON',
  positionTitle: { en: 'Senior Deacon', bg: 'Старши дякон' },
  role: null,
  scopeLevel: 'chapter',
  priority: 50,
  active: true,
  notes: 'Ritual office without portal duties.',
};

describe('role repository — reads', () => {
  it('members cannot read role data', async () => {
    signInAs('active_member');
    await expect(roles.listAssignments()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(roles.listMappings()).rejects.toBeInstanceOf(ForbiddenError);
    expect(await roles.listRoleDefinitions()).toHaveLength(ROLES.length);
  });

  it('chairmen see the active assignments of their chapter only; admins see all', async () => {
    signInAs('chapter_chairman');
    const own = await roles.listAssignments();
    const chapters = new Set(own.map((a) => db.get('members', a.userId)?.chapterId));
    expect([...chapters]).toEqual(['ch-1']);
    signInAs('sysadmin');
    expect(await roles.listAssignments()).toHaveLength(
      db.count('roleAssignments', (a) => a.endedAt === null),
    );
    const chairmen = await roles.listAssignments({ role: 'ch_chairman' });
    expect(chairmen.map((a) => a.userId).sort()).toEqual(['u-advisor', 'u-s12', 'u-s12']);
  });

  it('lists imported positions with their mapping status and previews rules', async () => {
    signInAs('sysadmin');
    const positions = await roles.listImportedPositions();
    expect(positions.find((p) => p.code === 'NAT_INSPECTOR')).toMatchObject({ mappingId: null });
    expect(positions.find((p) => p.code === 'CH_SECRETARY')).toMatchObject({
      mappingId: 'map-ch-secretary',
    });
    expect(await roles.previewMapping('ch_secretary')).toMatchObject({
      positionCode: 'CH_SECRETARY',
      role: 'ch_sec',
      exampleScope: { level: 'chapter' },
      affectedMemberCount: db.count('members', (m) => m.importedPosition?.code === 'CH_SECRETARY'),
    });
    expect(await roles.previewMapping('CH_CHAPLAIN')).toMatchObject({
      role: null,
      exampleScope: null,
    });
    expect(await roles.previewMapping('NAT_INSPECTOR')).toMatchObject({
      matchedMapping: null,
      affectedMemberCount: 1,
    });
  });

  it('special assignments: active + scheduled by default, everything on request', async () => {
    signInAs('sysadmin');
    const current = (await roles.listSpecialAssignments()).map((s) => s.id);
    expect(current).toEqual(
      expect.arrayContaining([IDS.activeSpecialAssignment, IDS.scheduledSpecialAssignment]),
    );
    expect(current).not.toContain(IDS.expiredSpecialAssignment);
    const all = await roles.listSpecialAssignments({ includeInactive: true });
    expect(all.map((s) => s.id)).toEqual(
      expect.arrayContaining([IDS.expiredSpecialAssignment, IDS.revokedSpecialAssignment]),
    );
  });
});

describe('role repository — assignments', () => {
  it('the system administrator adds a role on top of the position role → audit, notification', async () => {
    signInAs('sysadmin');
    const before = db.find('roleAssignments', (a) => a.userId === 'u-s01' && a.endedAt === null);
    const assignment = await roles.assignRole({
      userId: 'u-s01',
      role: 'ch_sec',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
      reason: 'Covers the Secretary while he is abroad this term.',
    });
    expect(assignment).toMatchObject({
      id: 'ra-u-s01-ch_sec',
      role: 'ch_sec',
      source: 'manual',
      assignedBy: 'u-admin',
      endedAt: null,
    });
    const after = db.find('roleAssignments', (a) => a.userId === 'u-s01' && a.endedAt === null);
    expect(after).toHaveLength(before.length + 1);
    expect(auditEntries('role.assigned', 'ra-u-s01-ch_sec')[0]).toMatchObject({
      actorId: 'u-admin',
      metadata: { to: 'ch_sec', source: 'manual' },
    });
    expect(notificationsOf('u-s01')[0]).toMatchObject({
      category: 'account',
      link: { to: '/profile', entityType: 'role_assignment' },
    });
  });

  it('ends a role term, keeping the history', async () => {
    signInAs('sysadmin');
    const ended = await roles.removeRole({
      assignmentId: 'ra-u-s12-ch_chairman',
      reason: 'Veliko Tarnovo advisors completed their training.',
    });
    expect(ended.endedAt).not.toBeNull();
    expect(db.get('roleAssignments', 'ra-u-s12-ch_chairman')?.endedAt).toBe(ended.endedAt);
    expect(auditEntries('role.removed', 'ra-u-s12-ch_chairman')).toHaveLength(1);
    expect(notificationsOf('u-s12')[0]?.title).toMatchObject({
      key: 'messages.notifications.roleRemoved.title',
    });
    await expect(
      roles.removeRole({ assignmentId: 'ra-u-s12-ch_chairman', reason: 'Twice is too many.' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('role assignment belongs to system administrators alone, never to yourself', async () => {
    for (const persona of ['chapter_chairman', 'national_coordinator'] as const) {
      signInAs(persona);
      await expect(
        roles.assignRole({
          userId: 'u-s07',
          role: 'ch_sc',
          scope: { level: 'chapter', chapterIds: ['ch-1'] },
          reason: 'Only system administrators assign roles.',
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    }
    signInAs('sysadmin');
    await expect(
      roles.assignRole({
        userId: 'u-admin',
        role: 'nat_treas',
        scope: { level: 'national' },
        reason: 'Assigning myself.',
      }),
    ).rejects.toMatchObject({ reason: 'self_action' });
    await expect(
      roles.assignRole({
        userId: 'u-s07',
        role: 'ch_chairman',
        scope: { level: 'national' },
        reason: 'Chapter roles are held per chapter.',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('creates and revokes special assignments with audit + notifications', async () => {
    signInAs('sysadmin');
    const created = await roles.createSpecialAssignment(special());
    expect(created).toMatchObject({ userId: 'u-s08', createdBy: 'u-admin', revokedAt: null });
    expect(auditEntries('special_assignment.created', created.id)).toHaveLength(1);
    expect(notificationsOf('u-s08')[0]?.title).toMatchObject({
      key: 'messages.notifications.specialAssignmentGranted.title',
    });
    const revoked = await roles.revokeSpecialAssignment(created.id, 'Concert postponed.');
    expect(revoked).toMatchObject({ revokedBy: 'u-admin', revokeReason: 'Concert postponed.' });
    expect(auditEntries('special_assignment.revoked', created.id)).toHaveLength(1);
    await expect(roles.revokeSpecialAssignment(created.id, 'Again please')).rejects.toMatchObject({
      reason: 'invalid_transition',
    });
  });

  it('special assignments: only administrators, never to yourself, never backdated', async () => {
    signInAs('chapter_chairman');
    await expect(roles.createSpecialAssignment(special())).rejects.toBeInstanceOf(ForbiddenError);
    signInAs('sysadmin');
    await expect(
      roles.createSpecialAssignment(special({ userId: 'u-admin', approverId: 'u-s12' })),
    ).rejects.toMatchObject({ reason: 'self_action' });
    const past = await roles
      .createSpecialAssignment(special({ startsAt: days(-10), endsAt: days(-2) }))
      .catch((e: unknown) => e);
    expect((past as ValidationError).fieldErrors).toEqual({ endsAt: 'validation.mustBeInFuture' });
    const badApprover = await roles
      .createSpecialAssignment(special({ approverId: 'u-s10' }))
      .catch((e: unknown) => e);
    expect((badApprover as ValidationError).fieldErrors).toEqual({
      approverId: 'messages.validation.approverInvalid',
    });
  });
});

describe('role repository — position mappings', () => {
  it('only administrators manage mappings', async () => {
    signInAs('chapter_chairman');
    await expect(roles.createMapping(deaconMapping)).rejects.toMatchObject({
      permission: 'role.mapping.manage',
    });
    signInAs('national_coordinator');
    await expect(roles.updateMapping(IDS.mappingToEdit, deaconMapping)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('create → update → delete with audit entries', async () => {
    signInAs('sysadmin');
    const created = await roles.createMapping(deaconMapping);
    expect(created).toMatchObject({ id: 'map-ch-senior-deacon', updatedBy: 'u-admin' });
    const updated = await roles.updateMapping(created.id, { ...deaconMapping, priority: 60 });
    expect(updated.priority).toBe(60);
    await roles.deleteMapping(created.id);
    expect(db.get('positionMappings', created.id)).toBeUndefined();
    for (const action of ['mapping.created', 'mapping.updated', 'mapping.deleted'] as const) {
      expect(auditEntries(action, created.id)).toHaveLength(1);
    }
  });

  it('refuses duplicates, deleting mappings in use and invalid codes', async () => {
    signInAs('sysadmin');
    await expect(
      roles.createMapping({ ...deaconMapping, positionCode: 'CH_SECRETARY', priority: 100 }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(roles.deleteMapping('map-ch-secretary')).rejects.toMatchObject({
      reasonKey: 'messages.errors.mappingInUse',
    });
    const invalid = await roles
      .createMapping({ ...deaconMapping, positionCode: '1-bad code' })
      .catch((e: unknown) => e);
    expect((invalid as ValidationError).fieldErrors).toEqual({
      positionCode: 'messages.validation.positionCodeFormat',
    });
    // The inactive legacy rule can be edited without clashing with the active one.
    const legacy = db.require('positionMappings', IDS.inactiveMapping);
    const edited = await roles.updateMapping(IDS.inactiveMapping, {
      positionCode: legacy.positionCode,
      positionTitle: legacy.positionTitle,
      role: legacy.role,
      scopeLevel: legacy.scopeLevel,
      priority: legacy.priority,
      active: false,
      notes: 'Kept for reference.',
    });
    expect(edited.notes).toBe('Kept for reference.');
  });
});
