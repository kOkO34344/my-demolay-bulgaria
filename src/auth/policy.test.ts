import { describe, expect, it } from 'vitest';

import type {
  Announcement,
  AnnouncementStatus,
  Event,
  Permission,
  PolicyTarget,
  Role,
  SpecialAssignment,
} from '@/domain';
import { buildSubjectFor, subjectsByRole } from '@/test/subjects';

import {
  allowedAnnouncementTransitions,
  allowedScopesFor,
  can,
  canCreateSpecialAssignment,
  canManageMember,
  canRevokeSpecialAssignment,
  canRsvp,
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
import { resolveGrantScope, scopeCovers } from './scope';

const S = subjectsByRole();
const NOW = new Date('2026-10-12T09:00:00.000Z');

const IN_CH1: PolicyTarget = { chapterId: 'ch-1' };
const OUT_CH4: PolicyTarget = { chapterId: 'ch-4' };
const NATIONAL: PolicyTarget = { chapterId: null, level: 'national' };

// ---------------------------------------------------------------------------------------------
// Role × permission × scope matrix
// ---------------------------------------------------------------------------------------------

type Expectation = [permission: Permission, inCh1: boolean, outCh4: boolean, national: boolean];

const MATRIX: Record<Role, Expectation[]> = {
  member: [
    ['feed.read', true, false, false],
    ['event.read', true, false, false],
    ['resource.read', true, false, false],
    ['chapter.read', true, false, false],
    ['post.create', false, false, false],
    ['post.publish', false, false, false],
    ['event.create', false, false, false],
    ['event.participants.read', false, false, false],
    ['attendance.manage', false, false, false],
    ['resource.upload', false, false, false],
    ['chapter.directory.read', false, false, false],
    ['member.profile.read', false, false, false],
    ['member.access.manage', false, false, false],
    ['role.assign', false, false, false],
    ['audit.read.chapter', false, false, false],
    ['system.manage', false, false, false],
  ],
  chapter_officer: [
    ['feed.read', true, false, false],
    ['post.create', true, false, false],
    ['post.update', true, false, false],
    ['post.submit', true, false, false],
    ['post.approve', false, false, false],
    ['post.publish', false, false, false],
    ['post.archive', false, false, false],
    ['event.create', true, false, false],
    ['event.update', true, false, false],
    ['event.cancel', false, false, false],
    ['event.participants.read', true, false, false],
    ['attendance.read', true, false, false],
    ['attendance.manage', true, false, false],
    ['resource.upload', true, false, false],
    ['resource.update', true, false, false],
    ['resource.archive', true, false, false],
    ['chapter.directory.read', true, false, false],
    ['notification.send.chapter', true, false, false],
    ['notification.send.national', false, false, false],
    ['member.profile.read', false, false, false],
    ['member.access.manage', false, false, false],
    ['role.assign', false, false, false],
    ['audit.read.chapter', false, false, false],
    ['system.manage', false, false, false],
  ],
  chapter_advisor: [
    ['post.create', true, false, false],
    ['post.approve', true, false, false],
    ['post.publish', true, false, false],
    ['post.archive', true, false, false],
    ['event.cancel', true, false, false],
    ['attendance.manage', true, false, false],
    ['member.profile.read', true, false, false],
    ['member.access.manage', true, false, false],
    ['role.read', true, false, false],
    ['role.assign', true, false, false],
    ['role.mapping.manage', false, false, false],
    ['audit.read.chapter', true, false, false],
    ['audit.read.national', false, false, false],
    ['translation.review', true, false, false],
    ['notification.send.national', false, false, false],
    ['integration.read', false, false, false],
    ['system.manage', false, false, false],
  ],
  national_officer: [
    ['feed.read', true, true, true],
    ['post.create', true, true, true],
    ['post.publish', true, true, true],
    ['post.archive', true, true, true],
    ['event.create', true, true, true],
    ['event.cancel', true, true, true],
    ['event.participants.read', true, true, true],
    ['attendance.manage', true, true, true],
    ['resource.upload', true, true, true],
    ['chapter.read', true, true, true],
    ['chapter.directory.read', true, true, true],
    ['notification.send.national', true, true, true],
    ['translation.publish', true, true, true],
    ['audit.read.chapter', true, true, true],
    ['audit.read.national', false, false, false],
    ['member.profile.read', false, false, false],
    ['member.access.manage', false, false, false],
    ['role.assign', false, false, false],
    ['role.mapping.manage', false, false, false],
    ['chapter.update', false, false, false],
    ['integration.read', false, false, false],
    ['system.manage', false, false, false],
  ],
  national_admin: [
    ['feed.read', true, true, true],
    ['post.publish', true, true, true],
    ['event.cancel', true, true, true],
    ['member.profile.read', true, true, true],
    ['member.access.manage', true, true, true],
    ['chapter.update', true, true, true],
    ['role.assign', true, true, true],
    ['role.mapping.manage', true, true, true],
    ['translation.publish', true, true, true],
    ['audit.read.national', true, true, true],
    ['integration.read', true, true, true],
    ['integration.manage', true, true, true],
    ['system.manage', true, true, true],
  ],
};

describe('role × permission × scope', () => {
  for (const role of Object.keys(MATRIX) as Role[]) {
    describe(role, () => {
      it.each(MATRIX[role])(
        '%s → in ch-1: %s, out ch-4: %s, national: %s',
        (permission, inCh1, outCh4, national) => {
          const subject = S[role];
          expect(can(subject, permission, IN_CH1, NOW)).toBe(inCh1);
          expect(can(subject, permission, OUT_CH4, NOW)).toBe(outCh4);
          expect(can(subject, permission, NATIONAL, NOW)).toBe(national);
        },
      );
    });
  }

  it('every role can RSVP and read notifications only for itself', () => {
    for (const subject of Object.values(S)) {
      expect(can(subject, 'event.rsvp', { ownerId: subject.userId }, NOW)).toBe(true);
      expect(can(subject, 'event.rsvp', { ownerId: 'someone-else' }, NOW)).toBe(false);
      expect(can(subject, 'notification.read', { ownerId: subject.userId }, NOW)).toBe(true);
    }
  });

  it('a capability check without target is true when held at any scope', () => {
    expect(can(S.chapter_officer, 'post.create', undefined, NOW)).toBe(true);
    expect(can(S.member, 'post.create', undefined, NOW)).toBe(false);
    expect(can(null, 'feed.read')).toBe(false);
  });

  it('role definitions grant only catalogue permissions, admin holds all', () => {
    expect(new Set(ROLE_DEFINITIONS.national_admin.grants.map((g) => g.permission)).size).toBe(39);
    const memberPerms = ROLE_DEFINITIONS.member.grants.map((g) => g.permission);
    for (const p of memberPerms)
      expect(ROLE_DEFINITIONS.chapter_officer.grants.map((g) => g.permission)).toContain(p);
  });
});

describe('scope resolution', () => {
  it('chapter-level grants follow the assignment (multi-chapter advisors)', () => {
    const advisor = buildSubjectFor('chapter_advisor', {
      scope: { level: 'multi_chapter', chapterIds: ['ch-1', 'ch-3'] },
    });
    expect(can(advisor, 'post.publish', { chapterId: 'ch-3' }, NOW)).toBe(true);
    expect(can(advisor, 'post.publish', { chapterId: 'ch-4' }, NOW)).toBe(false);
    expect(
      can(advisor, 'post.publish', { chapterId: null, chapterIds: ['ch-1', 'ch-3'] }, NOW),
    ).toBe(true);
    expect(
      can(advisor, 'post.publish', { chapterId: null, chapterIds: ['ch-1', 'ch-4'] }, NOW),
    ).toBe(false);
  });

  it('a national grant is capped by a chapter assignment (no escalation through scope)', () => {
    expect(
      resolveGrantScope('national', { level: 'chapter', chapterIds: ['ch-1'] }, 'ch-1'),
    ).toEqual({
      level: 'chapter',
      chapterIds: ['ch-1'],
    });
    expect(resolveGrantScope('system', { level: 'national' }, 'ch-2')).toEqual({
      level: 'national',
    });
  });

  it('self scope covers only own records', () => {
    expect(scopeCovers({ level: 'self' }, { ownerId: 'u-1' }, 'u-1')).toBe(true);
    expect(scopeCovers({ level: 'self' }, { ownerId: 'u-2' }, 'u-1')).toBe(false);
    expect(scopeCovers({ level: 'self' }, { chapterId: 'ch-1' }, 'u-1')).toBe(false);
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
    createdBy: 'u-advisor',
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
    [
      'revoked',
      { revokedAt: '2026-10-11T00:00:00.000Z', revokedBy: 'u-advisor' },
      'revoked',
      false,
    ],
  ];

  it.each(cases)('%s', (_label, overrides, state, grants) => {
    const sa = specialAssignment(overrides);
    const member = buildSubjectFor('member', { specialAssignments: [sa] });
    expect(specialAssignmentState(sa, NOW)).toBe(state);
    expect(can(member, 'event.create', IN_CH1, NOW)).toBe(grants);
    expect(can(member, 'event.create', OUT_CH4, NOW)).toBe(false);
  });

  it('ignores assignments that belong to someone else', () => {
    const member = buildSubjectFor('member', {
      specialAssignments: [specialAssignment({ userId: 'u-other' })],
    });
    expect(can(member, 'event.create', IN_CH1, NOW)).toBe(false);
  });

  it('reports the source of effective grants', () => {
    const member = buildSubjectFor('member', { specialAssignments: [specialAssignment()] });
    const grant = effectivePermissions(member, NOW).find((g) => g.permission === 'event.create');
    expect(grant).toMatchObject({ source: 'special_assignment', sourceId: 'sa-1' });
  });
});

// ---------------------------------------------------------------------------------------------
// Escalation prevention
// ---------------------------------------------------------------------------------------------

describe('role assignment & escalation prevention', () => {
  const ch1 = { level: 'chapter' as const, chapterIds: ['ch-1'] };
  const ch4 = { level: 'chapter' as const, chapterIds: ['ch-4'] };

  it('advisor may assign lower roles inside their chapter only', () => {
    expect(
      checkAssignRole(
        S.chapter_advisor,
        'chapter_officer',
        ch1,
        { userId: 'u-x', currentRole: 'member' },
        NOW,
      ),
    ).toEqual({ allowed: true });
    expect(
      checkAssignRole(
        S.chapter_advisor,
        'member',
        ch1,
        { userId: 'u-x', currentRole: 'chapter_officer' },
        NOW,
      ).allowed,
    ).toBe(true);
    expect(checkAssignRole(S.chapter_advisor, 'chapter_advisor', ch1, undefined, NOW).reason).toBe(
      'escalation',
    );
    expect(checkAssignRole(S.chapter_advisor, 'chapter_officer', ch4, undefined, NOW).reason).toBe(
      'scope_not_covered',
    );
    expect(
      checkAssignRole(S.chapter_advisor, 'national_officer', { level: 'national' }, undefined, NOW)
        .reason,
    ).toBe('scope_not_covered');
    expect(
      checkAssignRole(
        S.chapter_advisor,
        'member',
        ch1,
        { userId: 'u-x', currentRole: 'chapter_advisor' },
        NOW,
      ).reason,
    ).toBe('target_outranks');
  });

  it('nobody can change their own role', () => {
    expect(
      checkAssignRole(
        S.national_admin,
        'member',
        { level: 'chapter', chapterIds: ['ch-3'] },
        { userId: 'u-admin' },
        NOW,
      ).reason,
    ).toBe('self_assignment');
  });

  it('roles without role.assign cannot assign', () => {
    expect(checkAssignRole(S.member, 'member', ch1, undefined, NOW).reason).toBe(
      'missing_permission',
    );
    expect(checkAssignRole(S.chapter_officer, 'member', ch1, undefined, NOW).reason).toBe(
      'missing_permission',
    );
    expect(checkAssignRole(S.national_officer, 'member', ch1, undefined, NOW).reason).toBe(
      'missing_permission',
    );
  });

  it('admin can assign any role at a valid scope; invalid scope levels are rejected', () => {
    expect(
      checkAssignRole(
        S.national_admin,
        'national_admin',
        { level: 'system' },
        { userId: 'u-x' },
        NOW,
      ).allowed,
    ).toBe(true);
    expect(
      checkAssignRole(
        S.national_admin,
        'national_officer',
        { level: 'national' },
        { userId: 'u-x' },
        NOW,
      ).allowed,
    ).toBe(true);
    expect(
      checkAssignRole(S.national_admin, 'member', { level: 'national' }, { userId: 'u-x' }, NOW)
        .reason,
    ).toBe('scope_not_allowed_for_role');
    expect(
      checkAssignRole(
        S.national_admin,
        'chapter_officer',
        { level: 'chapter', chapterIds: [] },
        { userId: 'u-x' },
        NOW,
      ).reason,
    ).toBe('scope_not_allowed_for_role');
  });

  it('special assignments: only permissions you hold, within your scope, never to yourself', () => {
    expect(
      canCreateSpecialAssignment(S.chapter_advisor, 'event.create', ch1, 'u-member', NOW),
    ).toBe(true);
    expect(
      canCreateSpecialAssignment(S.chapter_advisor, 'event.create', ch4, 'u-member', NOW),
    ).toBe(false);
    expect(
      canCreateSpecialAssignment(
        S.chapter_advisor,
        'system.manage',
        { level: 'system' },
        'u-member',
        NOW,
      ),
    ).toBe(false);
    expect(
      canCreateSpecialAssignment(
        S.chapter_advisor,
        'notification.send.national',
        { level: 'national' },
        'u-member',
        NOW,
      ),
    ).toBe(false);
    expect(
      canCreateSpecialAssignment(S.chapter_advisor, 'event.create', ch1, 'u-advisor', NOW),
    ).toBe(false);
    expect(
      canCreateSpecialAssignment(S.national_officer, 'event.create', ch1, 'u-member', NOW),
    ).toBe(false);
    expect(
      canCreateSpecialAssignment(
        S.national_admin,
        'integration.manage',
        { level: 'system' },
        'u-member',
        NOW,
      ),
    ).toBe(true);
    expect(canRevokeSpecialAssignment(S.chapter_advisor, specialAssignment(), NOW)).toBe(true);
    expect(
      canRevokeSpecialAssignment(S.chapter_advisor, specialAssignment({ scope: ch4 }), NOW),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Announcement workflow
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
  const EXPECTED: Record<Role, Record<AnnouncementStatus, string[]>> = {
    member: { draft: [], submitted: [], published: [], archived: [] },
    chapter_officer: {
      draft: ['edit', 'submit'],
      submitted: ['withdraw'],
      published: [],
      archived: [],
    },
    chapter_advisor: REVIEWER,
    national_officer: REVIEWER,
    national_admin: REVIEWER,
  };

  for (const role of Object.keys(EXPECTED) as Role[]) {
    it(`${role} on a chapter (ch-1) announcement authored by the officer`, () => {
      for (const status of ['draft', 'submitted', 'published', 'archived'] as const) {
        expect(allowedAnnouncementTransitions(S[role], post(status), NOW)).toEqual(
          EXPECTED[role][status],
        );
      }
    });
  }

  it('chapter roles cannot touch national or other-chapter content', () => {
    for (const role of ['chapter_officer', 'chapter_advisor'] as const) {
      expect(allowedAnnouncementTransitions(S[role], nationalPost('draft'), NOW)).toEqual([]);
      expect(
        allowedAnnouncementTransitions(
          S[role],
          post('submitted', {
            chapterId: 'ch-4',
            audience: { scope: 'chapter', chapterIds: ['ch-4'], visibility: 'all_members' },
          }),
          NOW,
        ),
      ).toEqual([]);
    }
  });

  it('national officer manages national content; admin can override', () => {
    expect(allowedAnnouncementTransitions(S.national_officer, nationalPost('draft'), NOW)).toEqual([
      'edit',
      'submit',
      'publish',
    ]);
    expect(
      allowedAnnouncementTransitions(S.national_admin, nationalPost('published'), NOW),
    ).toEqual(['edit', 'archive']);
  });
});

describe('announcement visibility', () => {
  it('members see national and own-chapter published content only', () => {
    expect(canViewAnnouncement(S.member, nationalPost('published'), NOW)).toBe(true);
    expect(canViewAnnouncement(S.member, post('published'), NOW)).toBe(true);
    expect(
      canViewAnnouncement(
        S.member,
        post('published', {
          chapterId: 'ch-4',
          audience: { scope: 'chapter', chapterIds: ['ch-4'], visibility: 'all_members' },
        }),
        NOW,
      ),
    ).toBe(false);
    expect(canViewAnnouncement(S.member, post('draft'), NOW)).toBe(false);
  });

  it('multi-chapter content is visible to members of any addressed chapter', () => {
    const multi = post('published', {
      chapterId: null,
      audience: { scope: 'multi_chapter', chapterIds: ['ch-1', 'ch-2'], visibility: 'all_members' },
    });
    expect(canViewAnnouncement(S.member, multi, NOW)).toBe(true);
    expect(
      canViewAnnouncement(buildSubjectFor('member', { homeChapterId: 'ch-4' }), multi, NOW),
    ).toBe(false);
  });

  it('leadership-only content is hidden from ordinary members', () => {
    const leadership = post('published', {
      audience: { scope: 'chapter', chapterIds: ['ch-1'], visibility: 'leadership' },
    });
    const nationalLeadership = post('published', {
      chapterId: null,
      audience: { scope: 'national', chapterIds: [], visibility: 'leadership' },
    });
    expect(canViewAnnouncement(S.member, leadership, NOW)).toBe(false);
    expect(canViewAnnouncement(S.chapter_officer, leadership, NOW)).toBe(true);
    expect(canViewAnnouncement(S.member, nationalLeadership, NOW)).toBe(false);
    expect(canViewAnnouncement(S.chapter_officer, nationalLeadership, NOW)).toBe(true);
  });

  it('drafts are visible to their author and reviewers in scope', () => {
    expect(canViewAnnouncement(S.chapter_officer, post('submitted'), NOW)).toBe(true);
    expect(canViewAnnouncement(S.chapter_advisor, post('submitted'), NOW)).toBe(true);
    expect(canViewAnnouncement(S.member, post('submitted'), NOW)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// Events, participants, resources, members
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

describe('event participant visibility & RSVP', () => {
  it('organizer-only lists are hidden from members but visible to officers in scope', () => {
    expect(canViewParticipants(S.member, event(), NOW)).toBe(false);
    expect(canViewParticipants(S.chapter_officer, event(), NOW)).toBe(true);
    expect(canViewParticipants(S.national_officer, event(), NOW)).toBe(true);
  });

  it('member-visible lists are shown to members who can see the event', () => {
    expect(canViewParticipants(S.member, event({ participantVisibility: 'members' }), NOW)).toBe(
      true,
    );
    expect(
      canViewParticipants(
        S.member,
        event({ participantVisibility: 'members', chapterId: 'ch-4' }),
        NOW,
      ),
    ).toBe(false);
  });

  it('RSVP requires a visible published event', () => {
    expect(canRsvp(S.member, event(), NOW)).toBe(true);
    expect(canRsvp(S.member, event({ status: 'cancelled' }), NOW)).toBe(false);
    expect(canRsvp(S.member, event({ chapterId: 'ch-4' }), NOW)).toBe(false);
    expect(canRsvp(S.member, event({ scope: 'national', chapterId: null }), NOW)).toBe(true);
  });

  it('draft events are visible only to managers', () => {
    expect(canViewEvent(S.member, event({ status: 'draft' }), NOW)).toBe(false);
    expect(canViewEvent(S.chapter_officer, event({ status: 'draft' }), NOW)).toBe(true);
  });
});

describe('resources & member data', () => {
  it('resource visibility respects chapter, leadership and archive state', () => {
    const base = {
      chapterId: 'ch-1',
      status: 'active' as const,
      visibility: 'all_members' as const,
    };
    expect(canViewResource(S.member, base, NOW)).toBe(true);
    expect(canViewResource(S.member, { ...base, chapterId: null }, NOW)).toBe(true);
    expect(canViewResource(S.member, { ...base, chapterId: 'ch-4' }, NOW)).toBe(false);
    expect(canViewResource(S.member, { ...base, visibility: 'leadership' }, NOW)).toBe(false);
    expect(canViewResource(S.chapter_officer, { ...base, visibility: 'leadership' }, NOW)).toBe(
      true,
    );
    expect(canViewResource(S.member, { ...base, status: 'archived' }, NOW)).toBe(false);
    expect(canViewResource(S.chapter_officer, { ...base, status: 'archived' }, NOW)).toBe(true);
  });

  it('restricted member fields: self, advisors in scope and admins only', () => {
    const ch1Member = { userId: 'u-x', chapterId: 'ch-1' };
    expect(
      canViewMemberPrivateFields(S.member, { userId: 'u-member', chapterId: 'ch-1' }, NOW),
    ).toBe(true);
    expect(canViewMemberPrivateFields(S.member, ch1Member, NOW)).toBe(false);
    expect(canViewMemberPrivateFields(S.chapter_officer, ch1Member, NOW)).toBe(false);
    expect(canViewMemberPrivateFields(S.chapter_advisor, ch1Member, NOW)).toBe(true);
    expect(
      canViewMemberPrivateFields(S.chapter_advisor, { userId: 'u-y', chapterId: 'ch-4' }, NOW),
    ).toBe(false);
    expect(canViewMemberPrivateFields(S.national_officer, ch1Member, NOW)).toBe(false);
    expect(canViewMemberPrivateFields(S.national_admin, ch1Member, NOW)).toBe(true);
  });

  it('account management excludes yourself', () => {
    expect(canManageMember(S.chapter_advisor, { userId: 'u-x', chapterId: 'ch-1' }, NOW)).toBe(
      true,
    );
    expect(
      canManageMember(S.chapter_advisor, { userId: 'u-advisor', chapterId: 'ch-1' }, NOW),
    ).toBe(false);
    expect(canManageMember(S.chapter_officer, { userId: 'u-x', chapterId: 'ch-1' }, NOW)).toBe(
      false,
    );
  });

  it('allowedScopesFor lists the audiences a subject may target', () => {
    const all = ['ch-1', 'ch-2', 'ch-3', 'ch-4'];
    expect(allowedScopesFor(S.chapter_officer, 'post.create', all, NOW)).toEqual({
      national: false,
      chapterIds: ['ch-1'],
      multiChapter: false,
    });
    expect(allowedScopesFor(S.national_officer, 'post.create', all, NOW)).toEqual({
      national: true,
      chapterIds: all,
      multiChapter: true,
    });
    expect(allowedScopesFor(S.member, 'post.create', all, NOW)).toEqual({
      national: false,
      chapterIds: [],
      multiChapter: false,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Navigation & routes
// ---------------------------------------------------------------------------------------------

describe('navigation visibility per role', () => {
  const ids = (role: Role) => visibleNavItems(S[role], 'sidebar', NOW).map((i) => i.id);
  const BASE = ['home', 'news', 'events', 'chapter', 'resources', 'notifications'];

  it.each<[Role, string[]]>([
    ['member', [...BASE, 'profile']],
    ['chapter_officer', [...BASE, 'officerWorkspace', 'profile']],
    ['chapter_advisor', [...BASE, 'officerWorkspace', 'content', 'members', 'profile']],
    ['national_officer', [...BASE, 'officerWorkspace', 'content', 'profile']],
    ['national_admin', [...BASE, 'officerWorkspace', 'content', 'members', 'admin', 'profile']],
  ])('%s sidebar', (role, expected) => {
    expect(ids(role)).toEqual(expected);
  });

  it('mobile bottom navigation is the same five destinations for everyone', () => {
    for (const subject of Object.values(S)) {
      expect(visibleNavItems(subject, 'mobileBottom', NOW).map((i) => i.id)).toEqual([
        'home',
        'news',
        'events',
        'chapter',
        'more',
      ]);
    }
  });

  it('route guards follow the same table', () => {
    expect(canAccessRoute(S.member, 'admin', NOW)).toBe(false);
    expect(canAccessRoute(S.member, 'contentCreate', NOW)).toBe(false);
    expect(canAccessRoute(S.chapter_officer, 'contentCreate', NOW)).toBe(true);
    expect(canAccessRoute(S.chapter_officer, 'content', NOW)).toBe(false);
    expect(canAccessRoute(S.national_officer, 'members', NOW)).toBe(false);
    expect(canAccessRoute(null, 'login', NOW)).toBe(true);
    expect(canAccessRoute(null, 'home', NOW)).toBe(false);
    expect(visibleAdminTabs(S.national_admin, NOW)).toHaveLength(10);
    expect(visibleAdminTabs(S.national_officer, NOW)).toHaveLength(0);
  });
});
