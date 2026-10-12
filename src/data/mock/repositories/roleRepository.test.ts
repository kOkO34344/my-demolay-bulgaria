import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, NotFoundError, type ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import type { PositionMappingInput, SpecialAssignmentInput } from '@/domain';
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
  role: 'member',
  scopeLevel: 'chapter',
  priority: 50,
  active: true,
  notes: 'Ritual office without portal duties.',
};

describe('role repository — reads', () => {
  it('members cannot read role data', async () => {
    signInAs('member');
    await expect(roles.listAssignments()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(roles.listMappings()).rejects.toBeInstanceOf(ForbiddenError);
    expect(await roles.listRoleDefinitions()).toHaveLength(5);
  });

  it('advisors see the assignments of their chapter only; admins see all', async () => {
    signInAs('chapter_advisor');
    const own = await roles.listAssignments();
    const chapters = new Set(own.map((a) => db.get('members', a.userId)?.chapterId));
    expect([...chapters]).toEqual(['ch-1']);
    signInAs('national_admin');
    expect(await roles.listAssignments()).toHaveLength(db.count('roleAssignments'));
    const advisors = await roles.listAssignments({ role: 'chapter_advisor' });
    expect(advisors.every((a) => a.role === 'chapter_advisor')).toBe(true);
  });

  it('lists imported positions with their mapping status and previews rules', async () => {
    signInAs('national_admin');
    const positions = await roles.listImportedPositions();
    expect(positions.find((p) => p.code === 'NAT_INSPECTOR')).toMatchObject({ mappingId: null });
    expect(positions.find((p) => p.code === 'CH_SCRIBE')).toMatchObject({
      mappingId: 'map-ch-scribe',
    });
    expect(await roles.previewMapping('ch_scribe')).toMatchObject({
      positionCode: 'CH_SCRIBE',
      role: 'chapter_officer',
      exampleScope: { level: 'chapter' },
      affectedMemberCount: db.count('members', (m) => m.importedPosition?.code === 'CH_SCRIBE'),
    });
    expect(await roles.previewMapping('NAT_INSPECTOR')).toMatchObject({
      matchedMapping: null,
      affectedMemberCount: 1,
    });
  });

  it('special assignments: active + scheduled by default, everything on request', async () => {
    signInAs('national_admin');
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
  it('advisor promotes a chapter member to officer → manual assignment, audit, notification', async () => {
    signInAs('chapter_advisor');
    const assignment = await roles.assignRole({
      userId: 'u-s07',
      role: 'chapter_officer',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
      reason: 'Elected Orator with event duties for this term.',
    });
    expect(assignment).toMatchObject({
      id: 'ra-u-s07',
      role: 'chapter_officer',
      source: 'manual',
      assignedBy: 'u-advisor',
    });
    expect(auditEntries('role.assigned', 'ra-u-s07')[0]).toMatchObject({
      actorId: 'u-advisor',
      metadata: { from: 'member', to: 'chapter_officer' },
    });
    expect(notificationsOf('u-s07')[0]).toMatchObject({
      category: 'account',
      link: { to: '/profile', entityType: 'role_assignment' },
    });
  });

  it('prevents escalation, self-assignment and out-of-scope targets', async () => {
    signInAs('chapter_advisor');
    await expect(
      roles.assignRole({
        userId: 'u-s07',
        role: 'chapter_advisor',
        scope: { level: 'chapter', chapterIds: ['ch-1'] },
        reason: 'Same rank as the assigner.',
      }),
    ).rejects.toMatchObject({ reason: 'role_escalation' });
    await expect(
      roles.assignRole({
        userId: 'u-s07',
        role: 'national_admin',
        scope: { level: 'system' },
        reason: 'Trying to escalate.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      roles.assignRole({
        userId: 'u-advisor',
        role: 'chapter_advisor',
        scope: { level: 'chapter', chapterIds: ['ch-1'] },
        reason: 'Assigning myself.',
      }),
    ).rejects.toMatchObject({ reason: 'self_action' });
    await expect(
      roles.assignRole({
        userId: 'u-p01',
        role: 'member',
        scope: { level: 'chapter', chapterIds: ['ch-2'] },
        reason: 'Another chapter.',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    signInAs('national_officer');
    await expect(
      roles.assignRole({
        userId: 'u-s07',
        role: 'chapter_officer',
        scope: { level: 'chapter', chapterIds: ['ch-1'] },
        reason: 'No role.assign.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('creates and revokes special assignments with audit + notifications', async () => {
    signInAs('chapter_advisor');
    const created = await roles.createSpecialAssignment(special());
    expect(created).toMatchObject({ userId: 'u-s08', createdBy: 'u-advisor', revokedAt: null });
    expect(auditEntries('special_assignment.created', created.id)).toHaveLength(1);
    expect(notificationsOf('u-s08')[0]?.title).toMatchObject({
      key: 'messages.notifications.specialAssignmentGranted.title',
    });
    const revoked = await roles.revokeSpecialAssignment(created.id, 'Concert postponed.');
    expect(revoked).toMatchObject({ revokedBy: 'u-advisor', revokeReason: 'Concert postponed.' });
    expect(auditEntries('special_assignment.revoked', created.id)).toHaveLength(1);
    await expect(roles.revokeSpecialAssignment(created.id, 'Again please')).rejects.toMatchObject({
      reason: 'invalid_transition',
    });
  });

  it('special assignments cannot exceed the grantor’s own powers or be backdated', async () => {
    signInAs('chapter_advisor');
    await expect(
      roles.createSpecialAssignment(special({ permission: 'role.mapping.manage' })),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      roles.createSpecialAssignment(special({ userId: 'u-advisor', approverId: 'u-s12' })),
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
    signInAs('chapter_advisor');
    await expect(roles.createMapping(deaconMapping)).rejects.toMatchObject({
      permission: 'role.mapping.manage',
    });
    signInAs('national_officer');
    await expect(roles.updateMapping(IDS.mappingToEdit, deaconMapping)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('create → update → delete with audit entries', async () => {
    signInAs('national_admin');
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
    signInAs('national_admin');
    await expect(
      roles.createMapping({ ...deaconMapping, positionCode: 'CH_SCRIBE', priority: 100 }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(roles.deleteMapping('map-ch-scribe')).rejects.toMatchObject({
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
