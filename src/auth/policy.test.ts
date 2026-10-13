import { describe, expect, it } from 'vitest';

import type {
  Announcement,
  AnnouncementStatus,
  DemoPersonaId,
  Event,
  Permission,
  PolicyTarget,
  Role,
  SpecialAssignment,
  Subject,
} from '@/domain';
import { PERMISSIONS, ROLES } from '@/domain';
import { buildSubject, personaSubject, roleSubject, subjectsByPersona } from '@/test/subjects';

import {
  allowedAnnouncementTransitions,
  allowedScopesFor,
  can,
  canCreateSpecialAssignment,
  canManageMember,
  canPayFor,
  canPublishEvent,
  canRsvp,
  canVerifyAccount,
  canViewAnnouncement,
  canViewEvent,
  canViewMemberPrivateFields,
  canViewParticipants,
  canViewResource,
  checkAssignRole,
  effectivePermissions,
  specialAssignmentState,
} from './policy';
import { ROLE_DEFINITIONS } from './roles';
import { canAccessRoute, visibleAdminTabs, visibleNavItems } from './routeAccess';
import { chapterScope, resolveGrantScope, scopeCovers } from './scope';

const S = subjectsByPersona();
const NOW = new Date('2026-10-12T09:00:00.000Z');

const IN_CH1: PolicyTarget = { chapterId: 'ch-1' };
const OUT_CH4: PolicyTarget = { chapterId: 'ch-4' };
const NATIONAL: PolicyTarget = { chapterId: null, level: 'national' };

// ---------------------------------------------------------------------------------------------
// docs/ROLES-AND-PERMISSIONS.md §4 — the permission matrix, cell for cell
// ---------------------------------------------------------------------------------------------

/** Matrix columns in document order; `parent` is a member type, not a role. */
type Column = Role | 'parent';
const COLUMNS: Column[] = [
  'sysadmin',
  'exec_director',
  'nat_rep',
  'nat_sec',
  'nat_coord',
  'nat_mc',
  'nat_treas',
  'ch_chairman',
  'ch_mc',
  'ch_sc', // the matrix's "ch_sc / ch_jc" column; ch_jc is checked against the same cells
  'ch_sec',
  'ch_treas',
  'advisor',
  'parent',
];

/** Y allowed, C own chapter only, S submit for approval, '' not allowed. */
type Cell = 'Y' | 'C' | 'S' | '';

interface MatrixRow {
  capability: string;
  permissions: Permission[];
  /** 'chapter' rows are checked against ch-1 (own) and ch-4 (other); 'national' against national objects. */
  target: 'chapter' | 'national' | 'self';
  cells: Cell[];
}

// prettier-ignore
const MATRIX: MatrixRow[] = [
  { capability: 'Read feed, calendar, documents, rituals, library', permissions: ['feed.read', 'event.read', 'resource.read', 'ritual.read'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'] },
  { capability: 'Read member directory', permissions: ['chapter.read'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', ''] },
  { capability: 'Publish national post', permissions: ['post.publish'], target: 'national',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', '', '', '', '', '', '', '', ''] },
  { capability: 'Publish chapter post', permissions: ['post.publish'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', '', '', 'C', 'C', '', '', '', '', ''] },
  { capability: 'Submit post for approval', permissions: ['post.submit'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', '', '', 'Y', 'Y', 'S', 'S', '', '', ''] },
  { capability: 'Approve chapter post', permissions: ['post.approve'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', '', '', 'C', '', '', '', '', '', ''] },
  { capability: 'Upload national document', permissions: ['resource.upload'], target: 'national',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', '', '', '', '', '', '', '', '', ''] },
  { capability: 'Upload chapter minutes', permissions: ['resource.upload'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', '', '', '', 'C', '', '', 'C', '', '', ''] },
  { capability: 'Create chapter event', permissions: ['event.create'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', '', '', 'C', 'C', '', '', '', '', ''] },
  { capability: 'Approve chapter event', permissions: ['event.approve'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', '', '', 'C', '', '', '', '', '', ''] },
  { capability: 'Approve new accounts', permissions: ['account.verify'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', '', '', '', '', '', '', '', '', ''] },
  { capability: 'Assign roles', permissions: ['role.assign'], target: 'chapter',
    cells: ['Y', '', '', '', '', '', '', '', '', '', '', '', '', ''] },
  { capability: 'View all payments and dues', permissions: ['payment.read.all'], target: 'national',
    cells: ['Y', 'Y', 'Y', '', '', '', 'Y', '', '', '', '', '', '', ''] },
  { capability: 'View chapter dues status', permissions: ['payment.read.chapter'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', '', '', '', 'Y', 'C', '', '', '', 'C', '', ''] },
  { capability: 'Record cash or transfer payment', permissions: ['payment.record'], target: 'chapter',
    cells: ['Y', '', '', '', '', '', 'Y', '', '', '', '', 'C', '', ''] },
  { capability: 'Send mass email', permissions: ['email.send.mass'], target: 'national',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', '', '', '', '', '', '', '', '', ''] },
  { capability: 'Manage chapter roster', permissions: ['member.access.manage'], target: 'chapter',
    cells: ['Y', 'Y', 'Y', 'Y', '', '', '', 'C', '', '', 'C', '', '', ''] },
  { capability: 'Read audit log', permissions: ['audit.read.national', 'audit.read.chapter'], target: 'chapter',
    cells: ['Y', '', '', '', '', '', '', '', '', '', '', '', '', ''] },
  { capability: 'Raise a helpdesk ticket', permissions: ['helpdesk.create'], target: 'self',
    cells: ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'] },
  { capability: 'Answer helpdesk tickets', permissions: ['helpdesk.answer'], target: 'chapter',
    cells: ['Y', '', '', '', '', '', '', '', '', '', '', '', '', ''] },
];

const columnSubject = (column: Column): Subject =>
  column === 'parent' ? personaSubject('parent') : roleSubject(column);

const isNationalColumn = (column: Column): boolean =>
  column !== 'parent' && ROLE_DEFINITIONS[column].level === 'national' && column !== 'advisor';

describe('permission matrix (docs/ROLES-AND-PERMISSIONS.md §4)', () => {
  for (const row of MATRIX) {
    describe(row.capability, () => {
      const columns: Column[] = [...COLUMNS, 'ch_jc'];
      it.each(
        columns.map(
          (column) =>
            [column, row.cells[COLUMNS.indexOf(column === 'ch_jc' ? 'ch_sc' : column)]] as const,
        ),
      )('%s → %s', (column, cell) => {
        const subject = columnSubject(column);
        for (const permission of row.permissions) {
          if (row.target === 'self') {
            expect(can(subject, permission, { ownerId: subject.userId }, NOW)).toBe(cell !== '');
            expect(can(subject, permission, { ownerId: 'someone-else' }, NOW)).toBe(false);
            continue;
          }
          if (row.target === 'national') {
            expect(can(subject, permission, NATIONAL, NOW)).toBe(cell !== '');
            continue;
          }
          const allowedHere = cell !== '';
          const allowedElsewhere = (cell === 'Y' || cell === 'S') && isNationalColumn(column);
          expect(can(subject, permission, IN_CH1, NOW), `${permission} in ch-1`).toBe(allowedHere);
          expect(can(subject, permission, OUT_CH4, NOW), `${permission} in ch-4`).toBe(
            allowedElsewhere,
          );
        }
      });
    });
  }

  it('"S" means submit only: councillors and secretaries cannot publish', () => {
    for (const role of ['ch_sc', 'ch_jc', 'ch_sec'] as const) {
      expect(can(roleSubject(role), 'post.submit', IN_CH1, NOW)).toBe(true);
      expect(can(roleSubject(role), 'post.publish', IN_CH1, NOW)).toBe(false);
    }
  });

  it('the matrix covers every role', () => {
    expect([...COLUMNS, 'ch_jc'].filter((c) => c !== 'parent').sort()).toEqual([...ROLES].sort());
  });

  it('system administrators hold every permission', () => {
    const sysadmin = new Set(ROLE_DEFINITIONS.sysadmin.grants.map((g) => g.permission));
    expect([...sysadmin].sort()).toEqual([...PERMISSIONS].sort());
  });
});

// ---------------------------------------------------------------------------------------------
// Member types and the rules behind the matrix (§2, §5)
// ---------------------------------------------------------------------------------------------

describe('member types', () => {
  it('a person with no role reads everything in their chapter and publishes nothing', () => {
    for (const memberType of ['active', 'senior', 'advisor'] as const) {
      const subject = buildSubject(memberType, []);
      expect(can(subject, 'feed.read', IN_CH1, NOW)).toBe(true);
      expect(can(subject, 'chapter.read', IN_CH1, NOW)).toBe(true);
      expect(can(subject, 'ritual.read', IN_CH1, NOW)).toBe(true);
      expect(can(subject, 'post.create', undefined, NOW)).toBe(false);
      expect(can(subject, 'event.create', undefined, NOW)).toBe(false);
    }
  });

  it('seniors have the same access as advisors', () => {
    const perms = (s: Subject) =>
      effectivePermissions(s, NOW)
        .map((g) => g.permission)
        .sort();
    expect(perms(buildSubject('senior', []))).toEqual(perms(buildSubject('advisor', [])));
  });

  it('parents never see the directory, never post, and pay only for their linked children', () => {
    const parent = S.parent;
    expect(can(parent, 'chapter.read', IN_CH1, NOW)).toBe(false);
    expect(can(parent, 'post.create', undefined, NOW)).toBe(false);
    expect(can(parent, 'event.rsvp', undefined, NOW)).toBe(false);
    expect(canPayFor(parent, 'u-member', NOW)).toBe(true);
    expect(canPayFor(parent, parent.userId, NOW)).toBe(true);
    expect(canPayFor(parent, 'u-officer', NOW)).toBe(false);
  });

  it('members pay their own dues, never someone else’s', () => {
    expect(canPayFor(S.active_member, S.active_member.userId, NOW)).toBe(true);
    expect(canPayFor(S.active_member, 'u-officer', NOW)).toBe(false);
  });

  it('suspended, expelled and pending accounts hold no permissions at all', () => {
    for (const accountStatus of ['suspended', 'expelled', 'pending'] as const) {
      const subject = personaSubject('sysadmin', { accountStatus });
      expect(effectivePermissions(subject, NOW)).toEqual([]);
      expect(can(subject, 'feed.read', IN_CH1, NOW)).toBe(false);
    }
  });

  it('roles add up: one person can hold several, each at its own scope', () => {
    const subject = buildSubject('active', [
      { role: 'ch_sec', scope: chapterScope('ch-1') },
      { role: 'ch_chairman', scope: chapterScope('ch-5') },
    ]);
    expect(can(subject, 'post.approve', { chapterId: 'ch-5' }, NOW)).toBe(true);
    expect(can(subject, 'post.approve', IN_CH1, NOW)).toBe(false);
    expect(can(subject, 'post.submit', IN_CH1, NOW)).toBe(true);
    expect(can(subject, 'resource.upload', IN_CH1, NOW)).toBe(true);
  });

  it('national-only grants never reach chapter content (National Master Councillor)', () => {
    const natMc = roleSubject('nat_mc');
    expect(can(natMc, 'post.publish', NATIONAL, NOW)).toBe(true);
    expect(can(natMc, 'post.publish', IN_CH1, NOW)).toBe(false);
    expect(can(natMc, 'post.publish', undefined, NOW)).toBe(true);
    expect(allowedScopesFor(natMc, 'post.create', ['ch-1', 'ch-2'], NOW)).toEqual({
      national: true,
      chapterIds: [],
      multiChapter: false,
    });
  });
});

describe('scope resolution', () => {
  it('a national grant is capped by a chapter assignment (no escalation through scope)', () => {
    expect(
      resolveGrantScope('national', { level: 'chapter', chapterIds: ['ch-1'] }, 'ch-1'),
    ).toEqual({ level: 'chapter', chapterIds: ['ch-1'] });
    expect(resolveGrantScope('system', { level: 'national' }, 'ch-2')).toEqual({
      level: 'national',
    });
  });

  it('self scope covers only own records', () => {
    expect(scopeCovers({ level: 'self' }, { ownerId: 'u-1' }, 'u-1')).toBe(true);
    expect(scopeCovers({ level: 'self' }, { ownerId: 'u-2' }, 'u-1')).toBe(false);
    expect(scopeCovers({ level: 'self' }, { chapterId: 'ch-1' }, 'u-1')).toBe(false);
  });

  it('a capability check without target is true when held at any scope', () => {
    expect(can(S.chapter_secretary, 'post.create', undefined, NOW)).toBe(true);
    expect(can(S.active_member, 'post.create', undefined, NOW)).toBe(false);
    expect(can(null, 'feed.read')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Special assignments
// ---------------------------------------------------------------------------------------------

function specialAssignment(overrides: Partial<SpecialAssignment> = {}): SpecialAssignment {
  return {
    id: 'sa-1',
    userId: 'u-member',
    permission: 'event.create',
    scope: { level: 'chapter', chapterIds: ['ch-1'] },
    startsAt: '2026-10-10T00:00:00.000Z',
    endsAt: '2026-10-20T00:00:00.000Z',
    reason: 'Helps organise the autumn service day',
    approverId: 'u-advisor',
    createdBy: 'u-admin',
    createdAt: '2026-10-09T00:00:00.000Z',
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
    ...overrides,
  };
}

describe('special assignment windows', () => {
  const cases: Array<[string, Partial<SpecialAssignment>, string, boolean]> = [
    ['before start', { startsAt: '2026-10-13T00:00:00.000Z' }, 'scheduled', false],
    ['active', {}, 'active', true],
    ['expired', { endsAt: '2026-10-11T00:00:00.000Z' }, 'expired', false],
    ['revoked', { revokedAt: '2026-10-11T00:00:00.000Z', revokedBy: 'u-admin' }, 'revoked', false],
  ];

  it.each(cases)('%s', (_label, overrides, state, grants) => {
    const sa = specialAssignment(overrides);
    const member = personaSubject('active_member', { specialAssignments: [sa] });
    expect(specialAssignmentState(sa, NOW)).toBe(state);
    expect(can(member, 'event.create', IN_CH1, NOW)).toBe(grants);
    expect(can(member, 'event.create', OUT_CH4, NOW)).toBe(false);
  });

  it('ignores assignments that belong to someone else', () => {
    const member = personaSubject('active_member', {
      specialAssignments: [specialAssignment({ userId: 'u-other' })],
    });
    expect(can(member, 'event.create', IN_CH1, NOW)).toBe(false);
  });

  it('reports the source of effective grants', () => {
    const member = personaSubject('active_member', { specialAssignments: [specialAssignment()] });
    const grants = effectivePermissions(member, NOW);
    expect(grants.find((g) => g.permission === 'event.create')).toMatchObject({
      source: 'special_assignment',
      sourceId: 'sa-1',
    });
    expect(grants.find((g) => g.permission === 'feed.read')).toMatchObject({
      source: 'member_type',
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Role assignment: system administrators alone (§5)
// ---------------------------------------------------------------------------------------------

describe('role assignment & escalation prevention', () => {
  const ch1 = chapterScope('ch-1');

  it('only system administrators assign roles', () => {
    for (const role of ROLES.filter((r) => r !== 'sysadmin')) {
      expect(checkAssignRole(roleSubject(role), 'ch_sc', ch1, { userId: 'u-x' }, NOW)).toEqual({
        allowed: false,
        reason: 'missing_permission',
      });
    }
    expect(checkAssignRole(S.sysadmin, 'ch_chairman', ch1, { userId: 'u-x' }, NOW)).toEqual({
      allowed: true,
    });
    expect(
      checkAssignRole(S.sysadmin, 'sysadmin', { level: 'system' }, { userId: 'u-x' }, NOW),
    ).toEqual({ allowed: true });
  });

  it('nobody grants themselves a role', () => {
    expect(
      checkAssignRole(S.sysadmin, 'nat_treas', { level: 'national' }, { userId: 'u-admin' }, NOW),
    ).toEqual({ allowed: false, reason: 'self_assignment' });
  });

  it('roles are assigned only at the scope level they are held at', () => {
    expect(
      checkAssignRole(S.sysadmin, 'ch_chairman', { level: 'national' }, { userId: 'u-x' }, NOW),
    ).toEqual({ allowed: false, reason: 'scope_not_allowed_for_role' });
    expect(checkAssignRole(S.sysadmin, 'nat_sec', ch1, { userId: 'u-x' }, NOW)).toEqual({
      allowed: false,
      reason: 'scope_not_allowed_for_role',
    });
  });

  it('special permissions: only what you hold, within your role.assign scope, never to yourself', () => {
    expect(canCreateSpecialAssignment(S.sysadmin, 'event.create', ch1, 'u-member', NOW)).toBe(true);
    expect(canCreateSpecialAssignment(S.sysadmin, 'event.create', ch1, 'u-admin', NOW)).toBe(false);
    expect(
      canCreateSpecialAssignment(S.chapter_chairman, 'event.create', ch1, 'u-member', NOW),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------------------------

function post(status: AnnouncementStatus, overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'a-1',
    status,
    audience: { scope: 'chapter', chapterIds: ['ch-1'], visibility: 'all_members' },
    chapterId: 'ch-1',
    pinned: false,
    translations: { en: { title: 'T', summary: 'S', body: 'B' } },
    translationStatus: { en: 'reviewed', bg: 'missing' },
    authorId: 'u-officer',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    submittedAt: null,
    publishedAt: null,
    archivedAt: null,
    reviewerId: null,
    reviewNote: null,
    attachments: [],
    relatedIds: [],
    ...overrides,
  };
}

const nationalPost = (status: AnnouncementStatus) =>
  post(status, {
    audience: { scope: 'national', chapterIds: [], visibility: 'all_members' },
    chapterId: null,
    authorId: 'u-national-officer',
  });

describe('announcement workflow transitions', () => {
  const REVIEWER = {
    draft: ['edit', 'submit', 'publish'],
    submitted: ['edit', 'publish', 'return_to_draft'],
    published: ['edit', 'archive'],
    archived: ['restore'],
  };
  const NONE = { draft: [], submitted: [], published: [], archived: [] };
  const EXPECTED: Record<DemoPersonaId, Record<AnnouncementStatus, string[]>> = {
    active_member: NONE,
    parent: NONE,
    chapter_secretary: {
      draft: ['edit', 'submit'],
      submitted: ['withdraw'],
      published: [],
      archived: [],
    },
    chapter_chairman: REVIEWER,
    chapter_treasurer: NONE,
    national_coordinator: REVIEWER,
    sysadmin: REVIEWER,
  };

  for (const persona of Object.keys(EXPECTED) as DemoPersonaId[]) {
    it(`${persona} on a chapter (ch-1) announcement authored by the secretary`, () => {
      for (const status of ['draft', 'submitted', 'published', 'archived'] as const) {
        expect(allowedAnnouncementTransitions(S[persona], post(status), NOW)).toEqual(
          EXPECTED[persona][status],
        );
      }
    });
  }

  it('the Master Councillor publishes chapter posts but cannot approve submissions', () => {
    const mc = roleSubject('ch_mc');
    expect(allowedAnnouncementTransitions(mc, post('draft'), NOW)).toEqual([
      'edit',
      'submit',
      'publish',
    ]);
    expect(allowedAnnouncementTransitions(mc, post('submitted'), NOW)).toEqual([]);
  });

  it('chapter roles cannot touch national or other-chapter content', () => {
    for (const persona of ['chapter_secretary', 'chapter_chairman'] as const) {
      expect(allowedAnnouncementTransitions(S[persona], nationalPost('draft'), NOW)).toEqual([]);
      expect(
        allowedAnnouncementTransitions(
          S[persona],
          post('submitted', {
            chapterId: 'ch-4',
            audience: { scope: 'chapter', chapterIds: ['ch-4'], visibility: 'all_members' },
          }),
          NOW,
        ),
      ).toEqual([]);
    }
  });
});

describe('announcement visibility', () => {
  it('members and parents see national and own-chapter published content only', () => {
    for (const subject of [S.active_member, S.parent]) {
      expect(canViewAnnouncement(subject, nationalPost('published'), NOW)).toBe(true);
      expect(canViewAnnouncement(subject, post('published'), NOW)).toBe(true);
      expect(
        canViewAnnouncement(
          subject,
          post('published', {
            chapterId: 'ch-4',
            audience: { scope: 'chapter', chapterIds: ['ch-4'], visibility: 'all_members' },
          }),
          NOW,
        ),
      ).toBe(false);
      expect(canViewAnnouncement(subject, post('draft'), NOW)).toBe(false);
    }
  });

  it('leadership-only content is hidden from members without a publishing role', () => {
    const leadership = post('published', {
      audience: { scope: 'chapter', chapterIds: ['ch-1'], visibility: 'leadership' },
    });
    expect(canViewAnnouncement(S.active_member, leadership, NOW)).toBe(false);
    expect(canViewAnnouncement(S.chapter_treasurer, leadership, NOW)).toBe(false);
    expect(canViewAnnouncement(S.chapter_secretary, leadership, NOW)).toBe(true);
  });

  it('submissions are visible to their author and approvers in scope', () => {
    expect(canViewAnnouncement(S.chapter_secretary, post('submitted'), NOW)).toBe(true);
    expect(canViewAnnouncement(S.chapter_chairman, post('submitted'), NOW)).toBe(true);
    expect(canViewAnnouncement(S.active_member, post('submitted'), NOW)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Events, resources, members
// ---------------------------------------------------------------------------------------------

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e-1',
    status: 'published',
    scope: 'chapter',
    chapterId: 'ch-1',
    category: 'meeting',
    translations: { en: { title: 'T', summary: 'S', description: 'D' } },
    translationStatus: { en: 'reviewed', bg: 'missing' },
    startsAt: '2026-10-20T15:00:00.000Z',
    endsAt: '2026-10-20T17:00:00.000Z',
    location: {
      name: { en: 'Hall', bg: 'Зала' },
      address: { en: '', bg: '' },
      online: false,
      url: null,
    },
    organizerId: 'u-officer',
    capacity: 30,
    registrationDeadline: null,
    participantVisibility: 'organizers',
    notes: [],
    cancelledReason: null,
    cancelledAt: null,
    publishedAt: '2026-10-01T00:00:00.000Z',
    imageUrl: null,
    createdBy: 'u-officer',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('events', () => {
  it('publishing a draft is its approval: the Chairman approves, the Master Councillor cannot', () => {
    const draft = event({ status: 'draft' });
    expect(canPublishEvent(S.chapter_chairman, draft, NOW)).toBe(true);
    expect(canPublishEvent(roleSubject('ch_mc'), draft, NOW)).toBe(false);
    expect(canViewEvent(roleSubject('ch_mc'), draft, NOW)).toBe(true);
    expect(canViewEvent(S.active_member, draft, NOW)).toBe(false);
  });

  it('organizer-only participant lists are hidden from members, visible to event staff', () => {
    expect(canViewParticipants(S.active_member, event(), NOW)).toBe(false);
    expect(canViewParticipants(S.chapter_secretary, event(), NOW)).toBe(true);
    expect(canViewParticipants(S.national_coordinator, event(), NOW)).toBe(true);
  });

  it('RSVP requires a visible published event; parents do not RSVP', () => {
    expect(canRsvp(S.active_member, event(), NOW)).toBe(true);
    expect(canRsvp(S.active_member, event({ status: 'cancelled' }), NOW)).toBe(false);
    expect(canRsvp(S.active_member, event({ chapterId: 'ch-4' }), NOW)).toBe(false);
    expect(canRsvp(S.active_member, event({ scope: 'national', chapterId: null }), NOW)).toBe(true);
    expect(canRsvp(S.parent, event(), NOW)).toBe(false);
  });
});

describe('resources & member data', () => {
  const base = { chapterId: 'ch-1', status: 'active' as const, visibility: 'all_members' as const };

  it('resource visibility respects chapter, leadership and archive state', () => {
    expect(canViewResource(S.active_member, base, NOW)).toBe(true);
    expect(canViewResource(S.active_member, { ...base, chapterId: null }, NOW)).toBe(true);
    expect(canViewResource(S.active_member, { ...base, chapterId: 'ch-4' }, NOW)).toBe(false);
    expect(canViewResource(S.active_member, { ...base, visibility: 'leadership' }, NOW)).toBe(
      false,
    );
    expect(canViewResource(S.chapter_secretary, { ...base, status: 'archived' }, NOW)).toBe(true);
    expect(canViewResource(S.active_member, { ...base, status: 'archived' }, NOW)).toBe(false);
  });

  it('rituals are readable by members, advisors and parents', () => {
    const ritual = { ...base, chapterId: null, category: 'rituals' as const };
    for (const subject of [S.active_member, S.chapter_chairman, S.parent]) {
      expect(canViewResource(subject, ritual, NOW)).toBe(true);
    }
  });

  it('restricted member fields: self, roster managers in scope and national officers', () => {
    const ch1Member = { userId: 'u-x', chapterId: 'ch-1' };
    expect(
      canViewMemberPrivateFields(S.active_member, { userId: 'u-member', chapterId: 'ch-1' }, NOW),
    ).toBe(true);
    expect(canViewMemberPrivateFields(S.active_member, ch1Member, NOW)).toBe(false);
    expect(canViewMemberPrivateFields(S.chapter_treasurer, ch1Member, NOW)).toBe(false);
    expect(canViewMemberPrivateFields(S.chapter_secretary, ch1Member, NOW)).toBe(true);
    expect(canViewMemberPrivateFields(S.chapter_chairman, ch1Member, NOW)).toBe(true);
    expect(
      canViewMemberPrivateFields(S.chapter_chairman, { userId: 'u-y', chapterId: 'ch-4' }, NOW),
    ).toBe(false);
    expect(canViewMemberPrivateFields(S.national_coordinator, ch1Member, NOW)).toBe(false);
    expect(canViewMemberPrivateFields(S.sysadmin, ch1Member, NOW)).toBe(true);
  });

  it('account management and verification exclude yourself', () => {
    expect(canManageMember(S.chapter_chairman, { userId: 'u-x', chapterId: 'ch-1' }, NOW)).toBe(
      true,
    );
    expect(
      canManageMember(S.chapter_chairman, { userId: 'u-advisor', chapterId: 'ch-1' }, NOW),
    ).toBe(false);
    expect(canManageMember(S.chapter_treasurer, { userId: 'u-x', chapterId: 'ch-1' }, NOW)).toBe(
      false,
    );
    expect(
      canVerifyAccount(S.national_coordinator, { userId: 'u-x', chapterId: 'ch-4' }, NOW),
    ).toBe(true);
    expect(canVerifyAccount(S.chapter_chairman, { userId: 'u-x', chapterId: 'ch-1' }, NOW)).toBe(
      false,
    );
  });

  it('allowedScopesFor lists the audiences a subject may target', () => {
    const all = ['ch-1', 'ch-2', 'ch-3', 'ch-4'];
    expect(allowedScopesFor(S.chapter_secretary, 'post.create', all, NOW)).toEqual({
      national: false,
      chapterIds: ['ch-1'],
      multiChapter: false,
    });
    expect(allowedScopesFor(S.national_coordinator, 'post.create', all, NOW)).toEqual({
      national: true,
      chapterIds: all,
      multiChapter: true,
    });
    expect(allowedScopesFor(S.active_member, 'post.create', all, NOW)).toEqual({
      national: false,
      chapterIds: [],
      multiChapter: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Navigation & routes
// ---------------------------------------------------------------------------------------------

describe('navigation visibility per persona', () => {
  const ids = (persona: DemoPersonaId) =>
    visibleNavItems(S[persona], 'sidebar', NOW).map((i) => i.id);
  const BASE = ['home', 'news', 'events', 'chapter', 'resources', 'notifications'];

  it.each<[DemoPersonaId, string[]]>([
    ['active_member', [...BASE, 'profile']],
    ['parent', ['home', 'news', 'events', 'resources', 'notifications', 'profile']],
    ['chapter_secretary', [...BASE, 'officerWorkspace', 'members', 'invitations', 'profile']],
    [
      'chapter_chairman',
      [...BASE, 'officerWorkspace', 'content', 'members', 'invitations', 'profile'],
    ],
    ['chapter_treasurer', [...BASE, 'profile']],
    [
      'national_coordinator',
      [...BASE, 'officerWorkspace', 'content', 'invitations', 'verification', 'profile'],
    ],
    [
      'sysadmin',
      [
        ...BASE,
        'officerWorkspace',
        'content',
        'members',
        'invitations',
        'verification',
        'admin',
        'profile',
      ],
    ],
  ])('%s sidebar', (persona, expected) => {
    expect(ids(persona)).toEqual(expected);
  });

  it('mobile bottom navigation: My Chapter is hidden from parents (it holds the directory)', () => {
    expect(visibleNavItems(S.active_member, 'mobileBottom', NOW).map((i) => i.id)).toEqual([
      'home',
      'news',
      'events',
      'chapter',
      'more',
    ]);
    expect(visibleNavItems(S.parent, 'mobileBottom', NOW).map((i) => i.id)).toEqual([
      'home',
      'news',
      'events',
      'more',
    ]);
  });

  it('route guards follow the same table', () => {
    expect(canAccessRoute(S.active_member, 'admin', NOW)).toBe(false);
    expect(canAccessRoute(S.active_member, 'contentCreate', NOW)).toBe(false);
    expect(canAccessRoute(S.chapter_secretary, 'contentCreate', NOW)).toBe(true);
    expect(canAccessRoute(S.chapter_secretary, 'content', NOW)).toBe(false);
    expect(canAccessRoute(S.parent, 'chapter', NOW)).toBe(false);
    expect(canAccessRoute(S.national_coordinator, 'members', NOW)).toBe(false);
    expect(canAccessRoute(S.national_coordinator, 'verification', NOW)).toBe(true);
    expect(canAccessRoute(S.chapter_chairman, 'verification', NOW)).toBe(false);
    expect(canAccessRoute(null, 'signup', NOW)).toBe(true);
    expect(canAccessRoute(null, 'login', NOW)).toBe(true);
    expect(canAccessRoute(null, 'home', NOW)).toBe(false);
    expect(visibleAdminTabs(S.sysadmin, NOW)).toHaveLength(10);
    expect(visibleAdminTabs(S.national_coordinator, NOW)).toHaveLength(0);
  });
});
