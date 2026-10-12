import type {
  Announcement,
  AnnouncementAction,
  AnnouncementStatus,
  Audience,
  EffectiveGrant,
  Event,
  ID,
  Permission,
  PolicyTarget,
  Resource,
  Role,
  Scope,
  SpecialAssignment,
  SpecialAssignmentState,
  Subject,
} from '@/domain';
import { clock } from '@/lib/clock';

import { PERMISSION_CATALOGUE } from './permissions';
import { ROLE_DEFINITIONS, roleRank } from './roles';
import { normalizeScope, resolveGrantScope, scopeContains, scopeCovers } from './scope';

/**
 * Pure authorization policy. Every function takes the acting Subject explicitly so it can be
 * reused by mock repositories (server-side enforcement) and by the UI (visibility of actions).
 * In production the same rules run in FastAPI; the UI checks are for UX only.
 */

// ---------------------------------------------------------------------------------------------
// Special assignments & effective permissions
// ---------------------------------------------------------------------------------------------

export function specialAssignmentState(
  sa: SpecialAssignment,
  now: Date = clock.now(),
): SpecialAssignmentState {
  const t = now.getTime();
  if (sa.revokedAt && Date.parse(sa.revokedAt) <= t) return 'revoked';
  if (t < Date.parse(sa.startsAt)) return 'scheduled';
  if (t >= Date.parse(sa.endsAt)) return 'expired';
  return 'active';
}

export function activeSpecialAssignments(
  subject: Subject,
  now: Date = clock.now(),
): SpecialAssignment[] {
  return subject.specialAssignments.filter(
    (sa) => sa.userId === subject.userId && specialAssignmentState(sa, now) === 'active',
  );
}

/** Role grants resolved against the subject's scope, plus active special assignments. */
export function effectivePermissions(subject: Subject, now: Date = clock.now()): EffectiveGrant[] {
  const definition = ROLE_DEFINITIONS[subject.role];
  const fromRole: EffectiveGrant[] = definition.grants.map((g) => ({
    permission: g.permission,
    scope: resolveGrantScope(g.scope, subject.scope, subject.homeChapterId),
    source: 'role',
    sourceId: null,
  }));
  const fromSpecial: EffectiveGrant[] = activeSpecialAssignments(subject, now).map((sa) => ({
    permission: sa.permission,
    scope: normalizeScope(sa.scope),
    source: 'special_assignment',
    sourceId: sa.id,
  }));
  return [...fromRole, ...fromSpecial];
}

/** Distinct permissions the subject holds at any scope. */
export function permissionSet(subject: Subject, now: Date = clock.now()): Set<Permission> {
  return new Set(effectivePermissions(subject, now).map((g) => g.permission));
}

/**
 * Core check. Without a target: "does the subject hold this permission anywhere?"
 * With a target: does any grant's scope cover the object (see scopeCovers for the rules).
 */
export function can(
  subject: Subject | null | undefined,
  permission: Permission,
  target?: PolicyTarget,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  return effectivePermissions(subject, now).some(
    (g) => g.permission === permission && scopeCovers(g.scope, target, subject.userId),
  );
}

export function canAny(
  subject: Subject | null | undefined,
  permissions: readonly Permission[],
  target?: PolicyTarget,
  now: Date = clock.now(),
): boolean {
  return permissions.some((p) => can(subject, p, target, now));
}

export { scopeCovers, scopeContains };

// ---------------------------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------------------------

export function audienceTarget(
  audience: Audience,
  owningChapterId: ID | null = null,
): PolicyTarget {
  switch (audience.scope) {
    case 'national':
      return { chapterId: null, level: 'national' };
    case 'chapter':
      return { chapterId: owningChapterId ?? audience.chapterIds[0] ?? null };
    case 'multi_chapter':
      return { chapterId: null, chapterIds: [...audience.chapterIds] };
  }
}

export function announcementTarget(
  post: Pick<Announcement, 'audience' | 'chapterId'>,
): PolicyTarget {
  return audienceTarget(post.audience, post.chapterId);
}

export function eventTarget(event: Pick<Event, 'scope' | 'chapterId'>): PolicyTarget {
  return event.scope === 'national' || event.chapterId === null
    ? { chapterId: null, level: 'national' }
    : { chapterId: event.chapterId };
}

export function resourceTarget(resource: Pick<Resource, 'chapterId'>): PolicyTarget {
  return resource.chapterId === null
    ? { chapterId: null, level: 'national' }
    : { chapterId: resource.chapterId };
}

/**
 * Read access to audience-addressed content: national content is readable with the permission at
 * any scope; chapter / multi-chapter content needs a grant covering at least ONE addressed chapter.
 */
function canReadAddressed(
  subject: Subject,
  permission: Permission,
  scope: 'national' | 'chapter' | 'multi_chapter',
  chapterIds: ID[],
  now: Date,
): boolean {
  if (scope === 'national') return can(subject, permission, undefined, now);
  return chapterIds.some((chapterId) => can(subject, permission, { chapterId }, now));
}

/**
 * "Leadership" audience = subjects who can author content or run events for the addressed
 * chapter(s); for national leadership content, anyone holding those permissions anywhere.
 */
export function isLeadershipFor(
  subject: Subject | null | undefined,
  scope: 'national' | 'chapter' | 'multi_chapter',
  chapterIds: ID[],
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  const leaderPerms: Permission[] = ['post.create', 'event.create'];
  if (scope === 'national') return canAny(subject, leaderPerms, undefined, now);
  return chapterIds.some((chapterId) => canAny(subject, leaderPerms, { chapterId }, now));
}

// ---------------------------------------------------------------------------------------------
// Announcements (Draft → Submitted → Published → Archived; Submitted → Draft on return/withdraw)
// ---------------------------------------------------------------------------------------------

type PostLike = Pick<Announcement, 'status' | 'audience' | 'chapterId' | 'authorId'>;

export function canCreateAnnouncement(
  subject: Subject | null | undefined,
  audience?: Audience,
  now: Date = clock.now(),
): boolean {
  return can(subject, 'post.create', audience ? audienceTarget(audience) : undefined, now);
}

export function canEditAnnouncement(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  const target = announcementTarget(post);
  switch (post.status) {
    case 'draft':
      return can(subject, 'post.update', target, now) || can(subject, 'post.publish', target, now);
    case 'submitted':
      return can(subject, 'post.approve', target, now);
    case 'published':
      return can(subject, 'post.publish', target, now);
    case 'archived':
      return false;
  }
}

export function canSubmitAnnouncement(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): boolean {
  return post.status === 'draft' && can(subject, 'post.submit', announcementTarget(post), now);
}

export function canWithdrawAnnouncement(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): boolean {
  return (
    !!subject &&
    post.status === 'submitted' &&
    post.authorId === subject.userId &&
    can(subject, 'post.submit', announcementTarget(post), now)
  );
}

export function canPublishAnnouncement(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): boolean {
  const target = announcementTarget(post);
  if (post.status === 'draft') return can(subject, 'post.publish', target, now);
  if (post.status === 'submitted') {
    return can(subject, 'post.publish', target, now) && can(subject, 'post.approve', target, now);
  }
  return false;
}

export function canReturnAnnouncementToDraft(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): boolean {
  return post.status === 'submitted' && can(subject, 'post.approve', announcementTarget(post), now);
}

export function canArchiveAnnouncement(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): boolean {
  return post.status === 'published' && can(subject, 'post.archive', announcementTarget(post), now);
}

export function canRestoreAnnouncement(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): boolean {
  return post.status === 'archived' && can(subject, 'post.archive', announcementTarget(post), now);
}

/** Status reached by each workflow action. */
export const ANNOUNCEMENT_TRANSITIONS: Record<
  AnnouncementAction,
  { from: AnnouncementStatus[]; to: AnnouncementStatus | null }
> = {
  edit: { from: ['draft', 'submitted', 'published'], to: null },
  submit: { from: ['draft'], to: 'submitted' },
  withdraw: { from: ['submitted'], to: 'draft' },
  publish: { from: ['draft', 'submitted'], to: 'published' },
  return_to_draft: { from: ['submitted'], to: 'draft' },
  archive: { from: ['published'], to: 'archived' },
  restore: { from: ['archived'], to: 'draft' },
};

/** Workflow actions the subject may perform on this announcement right now. */
export function allowedAnnouncementTransitions(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): AnnouncementAction[] {
  const checks: Array<[AnnouncementAction, boolean]> = [
    ['edit', canEditAnnouncement(subject, post, now)],
    ['submit', canSubmitAnnouncement(subject, post, now)],
    ['withdraw', canWithdrawAnnouncement(subject, post, now)],
    ['publish', canPublishAnnouncement(subject, post, now)],
    ['return_to_draft', canReturnAnnouncementToDraft(subject, post, now)],
    ['archive', canArchiveAnnouncement(subject, post, now)],
    ['restore', canRestoreAnnouncement(subject, post, now)],
  ];
  return checks.filter(([, ok]) => ok).map(([action]) => action);
}

export function canViewAnnouncement(
  subject: Subject | null | undefined,
  post: PostLike,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  if (post.status !== 'published') {
    if (post.authorId === subject.userId) return true;
    const target = announcementTarget(post);
    return (
      canEditAnnouncement(subject, post, now) ||
      can(subject, 'post.approve', target, now) ||
      can(subject, 'post.archive', target, now)
    );
  }
  const { scope, chapterIds, visibility } = post.audience;
  if (!canReadAddressed(subject, 'feed.read', scope, chapterIds, now)) return false;
  return visibility === 'all_members' || isLeadershipFor(subject, scope, chapterIds, now);
}

// ---------------------------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------------------------

type EventLike = Pick<
  Event,
  'status' | 'scope' | 'chapterId' | 'participantVisibility' | 'organizerId'
>;

export function canCreateEvent(
  subject: Subject | null | undefined,
  target?: { scope: Event['scope']; chapterId: ID | null },
  now: Date = clock.now(),
): boolean {
  return can(subject, 'event.create', target ? eventTarget(target) : undefined, now);
}

export function canManageEvent(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  return event.status !== 'cancelled' && can(subject, 'event.update', eventTarget(event), now);
}

export function canPublishEvent(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  return event.status === 'draft' && can(subject, 'event.update', eventTarget(event), now);
}

export function canCancelEvent(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  return event.status === 'published' && can(subject, 'event.cancel', eventTarget(event), now);
}

export function canViewEvent(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  if (event.status === 'draft') return can(subject, 'event.update', eventTarget(event), now);
  return event.scope === 'national' || event.chapterId === null
    ? can(subject, 'event.read', undefined, now)
    : can(subject, 'event.read', { chapterId: event.chapterId }, now);
}

/** RSVP permission only — deadline/capacity rules live in '@/domain/rules'. */
export function canRsvp(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  return (
    !!subject &&
    event.status === 'published' &&
    canViewEvent(subject, event, now) &&
    can(subject, 'event.rsvp', { ownerId: subject.userId }, now)
  );
}

/**
 * Participant list: always for holders of event.participants.read in scope; otherwise only when
 * the event's participantVisibility is 'members' and the subject can see the event.
 */
export function canViewParticipants(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  if (can(subject, 'event.participants.read', eventTarget(event), now)) return true;
  return event.participantVisibility === 'members' && canViewEvent(subject, event, now);
}

export function canViewAttendance(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  return can(subject, 'attendance.read', eventTarget(event), now);
}

export function canManageAttendance(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  return event.status === 'published' && can(subject, 'attendance.manage', eventTarget(event), now);
}

export function canViewEventNotes(
  subject: Subject | null | undefined,
  event: EventLike,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  return (
    event.organizerId === subject.userId || can(subject, 'event.update', eventTarget(event), now)
  );
}

// ---------------------------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------------------------

type ResourceLike = Pick<Resource, 'chapterId' | 'status' | 'visibility'>;

export function canViewResource(
  subject: Subject | null | undefined,
  resource: ResourceLike,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  const target = resourceTarget(resource);
  if (resource.status === 'archived') return can(subject, 'resource.archive', target, now);
  const scope = resource.chapterId === null ? 'national' : 'chapter';
  const chapterIds = resource.chapterId === null ? [] : [resource.chapterId];
  if (!canReadAddressed(subject, 'resource.read', scope, chapterIds, now)) return false;
  return resource.visibility === 'all_members' || isLeadershipFor(subject, scope, chapterIds, now);
}

export function canUploadResource(
  subject: Subject | null | undefined,
  chapterId?: ID | null,
  now: Date = clock.now(),
): boolean {
  if (chapterId === undefined) return can(subject, 'resource.upload', undefined, now);
  return can(subject, 'resource.upload', resourceTarget({ chapterId }), now);
}

export function canManageResource(
  subject: Subject | null | undefined,
  resource: Pick<Resource, 'chapterId'>,
  action: 'update' | 'archive',
  now: Date = clock.now(),
): boolean {
  return can(
    subject,
    action === 'update' ? 'resource.update' : 'resource.archive',
    resourceTarget(resource),
    now,
  );
}

// ---------------------------------------------------------------------------------------------
// Members & chapters
// ---------------------------------------------------------------------------------------------

interface MemberRef {
  userId: ID;
  chapterId: ID;
}

/** Restricted fields (email, phone, birth date, address): self, or member.profile.read covering the member. */
export function canViewMemberPrivateFields(
  subject: Subject | null | undefined,
  member: MemberRef,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  if (member.userId === subject.userId) return true;
  return can(
    subject,
    'member.profile.read',
    { chapterId: member.chapterId, ownerId: member.userId },
    now,
  );
}

export function canEditMemberProfile(
  subject: Subject | null | undefined,
  member: MemberRef,
  now: Date = clock.now(),
): boolean {
  return can(
    subject,
    'member.profile.update',
    { chapterId: member.chapterId, ownerId: member.userId },
    now,
  );
}

/** Activate / suspend an account (never your own). */
export function canManageMember(
  subject: Subject | null | undefined,
  member: MemberRef,
  now: Date = clock.now(),
): boolean {
  return (
    !!subject &&
    member.userId !== subject.userId &&
    can(subject, 'member.access.manage', { chapterId: member.chapterId }, now)
  );
}

/** Privacy-safe directory (name, photo, chapter, position, contact action). */
export function canViewDirectory(
  subject: Subject | null | undefined,
  chapterId: ID,
  now: Date = clock.now(),
): boolean {
  return can(subject, 'chapter.read', { chapterId }, now);
}

/** Staff roster (roles, account status — still no contact data). */
export function canViewRoster(
  subject: Subject | null | undefined,
  chapterId: ID,
  now: Date = clock.now(),
): boolean {
  return can(subject, 'chapter.directory.read', { chapterId }, now);
}

export function canUpdateChapter(
  subject: Subject | null | undefined,
  chapterId: ID,
  now: Date = clock.now(),
): boolean {
  return can(subject, 'chapter.update', { chapterId }, now);
}

export function canReadAuditFor(
  subject: Subject | null | undefined,
  chapterId: ID | null,
  now: Date = clock.now(),
): boolean {
  return chapterId === null
    ? can(subject, 'audit.read.national', undefined, now)
    : can(subject, 'audit.read.chapter', { chapterId }, now) ||
        can(subject, 'audit.read.national', undefined, now);
}

// ---------------------------------------------------------------------------------------------
// Roles, special assignments & escalation prevention
// ---------------------------------------------------------------------------------------------

export type AssignRoleDenial =
  | 'missing_permission'
  | 'scope_not_covered'
  | 'scope_not_allowed_for_role'
  | 'escalation'
  | 'self_assignment'
  | 'target_outranks';

export interface AssignRoleCheck {
  allowed: boolean;
  reason?: AssignRoleDenial;
}

function holdsAtScope(subject: Subject, permission: Permission, scope: Scope, now: Date): boolean {
  return effectivePermissions(subject, now).some(
    (g) => g.permission === permission && scopeContains(g.scope, scope),
  );
}

/**
 * Can the subject assign `targetRole` at `targetScope`?
 * Prevents privilege escalation: you need role.assign covering the scope, the scope must be valid
 * for the role, every permission the role would grant at that scope must already be yours at an
 * equal or wider scope, the role must rank below yours (unless you hold role.assign at system
 * scope), and you cannot change your own role or the role of someone who outranks you.
 */
export function checkAssignRole(
  subject: Subject | null | undefined,
  targetRole: Role,
  targetScope: Scope,
  targetUser?: { userId: ID; currentRole?: Role | null },
  now: Date = clock.now(),
): AssignRoleCheck {
  if (!subject || !can(subject, 'role.assign', undefined, now))
    return { allowed: false, reason: 'missing_permission' };
  if (targetUser && targetUser.userId === subject.userId)
    return { allowed: false, reason: 'self_assignment' };
  const scope = normalizeScope(targetScope);
  const definition = ROLE_DEFINITIONS[targetRole];
  if (!definition.allowedScopeLevels.includes(scope.level)) {
    return { allowed: false, reason: 'scope_not_allowed_for_role' };
  }
  if (
    (scope.level === 'chapter' || scope.level === 'multi_chapter') &&
    (scope.chapterIds?.length ?? 0) === 0
  ) {
    return { allowed: false, reason: 'scope_not_allowed_for_role' };
  }
  if (scope.level === 'chapter' && (scope.chapterIds?.length ?? 0) !== 1) {
    return { allowed: false, reason: 'scope_not_allowed_for_role' };
  }
  if (!holdsAtScope(subject, 'role.assign', scope, now))
    return { allowed: false, reason: 'scope_not_covered' };

  const systemAssigner = holdsAtScope(subject, 'role.assign', { level: 'system' }, now);
  const subjectRank = roleRank(subject.role);
  if (!systemAssigner) {
    if (roleRank(targetRole) >= subjectRank) return { allowed: false, reason: 'escalation' };
    if (targetUser?.currentRole && roleRank(targetUser.currentRole) >= subjectRank) {
      return { allowed: false, reason: 'target_outranks' };
    }
  }
  const homeChapter = scope.chapterIds?.[0] ?? subject.homeChapterId;
  const exceeds = definition.grants.some((g) => {
    const resolved = resolveGrantScope(g.scope, scope, homeChapter);
    if (resolved.level === 'self') return !can(subject, g.permission, undefined, now);
    return !holdsAtScope(subject, g.permission, resolved, now);
  });
  if (exceeds) return { allowed: false, reason: 'escalation' };
  return { allowed: true };
}

export function canAssignRole(
  subject: Subject | null | undefined,
  targetRole: Role,
  targetScope: Scope,
  targetUser?: { userId: ID; currentRole?: Role | null },
  now: Date = clock.now(),
): boolean {
  return checkAssignRole(subject, targetRole, targetScope, targetUser, now).allowed;
}

/** Roles the subject could assign at the given scope (for pickers). */
export function assignableRoles(
  subject: Subject | null | undefined,
  targetScope: Scope,
  now: Date = clock.now(),
): Role[] {
  return (Object.keys(ROLE_DEFINITIONS) as Role[]).filter((role) =>
    canAssignRole(subject, role, targetScope, undefined, now),
  );
}

/** Special (time-boxed) permission: you can only grant what you hold yourself, within your role.assign scope. */
export function canCreateSpecialAssignment(
  subject: Subject | null | undefined,
  permission: Permission,
  scope: Scope,
  targetUserId: ID,
  now: Date = clock.now(),
): boolean {
  if (!subject || targetUserId === subject.userId) return false;
  const normalized = normalizeScope(scope);
  if (!PERMISSION_CATALOGUE[permission].scopeLevels.includes(normalized.level)) return false;
  if (normalized.level === 'self') {
    return (
      holdsAtScope(
        subject,
        'role.assign',
        { level: 'chapter', chapterIds: [subject.homeChapterId] },
        now,
      ) && can(subject, permission, undefined, now)
    );
  }
  return (
    holdsAtScope(subject, 'role.assign', normalized, now) &&
    holdsAtScope(subject, permission, normalized, now)
  );
}

export function canRevokeSpecialAssignment(
  subject: Subject | null | undefined,
  sa: SpecialAssignment,
  now: Date = clock.now(),
): boolean {
  if (!subject) return false;
  if (sa.revokedAt) return false;
  const scope = normalizeScope(sa.scope);
  return scope.level === 'self'
    ? can(subject, 'role.assign', undefined, now)
    : holdsAtScope(subject, 'role.assign', scope, now);
}

export function canManageMappings(
  subject: Subject | null | undefined,
  now: Date = clock.now(),
): boolean {
  return can(subject, 'role.mapping.manage', undefined, now);
}

// ---------------------------------------------------------------------------------------------
// Scope options for pickers
// ---------------------------------------------------------------------------------------------

export interface ScopeOptions {
  /** National (whole-organisation) target allowed. */
  national: boolean;
  /** Chapters the subject may target. */
  chapterIds: ID[];
  /** Multi-chapter targeting possible (2+ chapters available). */
  multiChapter: boolean;
}

/**
 * Which audiences/scopes the subject may target with `permission` (default post.create).
 * Pass all known chapter ids so national-scope holders get every chapter as an option.
 */
export function allowedScopesFor(
  subject: Subject | null | undefined,
  permission: Permission = 'post.create',
  allChapterIds: ID[] = [],
  now: Date = clock.now(),
): ScopeOptions {
  if (!subject) return { national: false, chapterIds: [], multiChapter: false };
  const grants = effectivePermissions(subject, now).filter((g) => g.permission === permission);
  let national = false;
  const chapters = new Set<ID>();
  for (const g of grants) {
    if (g.scope.level === 'national' || g.scope.level === 'system') {
      national = true;
      allChapterIds.forEach((id) => chapters.add(id));
    } else if (g.scope.level === 'chapter' || g.scope.level === 'multi_chapter') {
      (g.scope.chapterIds ?? []).forEach((id) => chapters.add(id));
    }
  }
  const chapterIds =
    allChapterIds.length > 0 ? allChapterIds.filter((id) => chapters.has(id)) : [...chapters];
  return { national, chapterIds, multiChapter: chapterIds.length > 1 };
}
