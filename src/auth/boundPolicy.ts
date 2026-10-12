import type {
  Announcement,
  Audience,
  Event,
  ID,
  Permission,
  PolicyTarget,
  Resource,
  Role,
  Scope,
  SpecialAssignment,
  Subject,
} from '@/domain';
import type { RouteId } from '@/lib/routes';

import * as policy from './policy';
import {
  canAccessRoute,
  visibleAdminTabs,
  visibleNavItems,
  type NavPlacement,
} from './routeAccess';

type PostLike = Pick<Announcement, 'status' | 'audience' | 'chapterId' | 'authorId'>;
type EventLike = Pick<
  Event,
  'status' | 'scope' | 'chapterId' | 'participantVisibility' | 'organizerId'
>;
type ResourceLike = Pick<Resource, 'chapterId' | 'status' | 'visibility'>;
interface MemberRef {
  userId: ID;
  chapterId: ID;
}

/** All policy helpers bound to one subject (null = signed out → everything false). */
export function bindPolicy(subject: Subject | null) {
  return {
    subject,
    can: (permission: Permission, target?: PolicyTarget) => policy.can(subject, permission, target),
    canAny: (permissions: readonly Permission[], target?: PolicyTarget) =>
      policy.canAny(subject, permissions, target),
    canAccessRoute: (routeId: RouteId) => canAccessRoute(subject, routeId),
    visibleNavItems: (placement?: NavPlacement) => visibleNavItems(subject, placement),
    visibleAdminTabs: () => visibleAdminTabs(subject),
    effectivePermissions: () => (subject ? policy.effectivePermissions(subject) : []),
    // announcements
    canCreateAnnouncement: (audience?: Audience) => policy.canCreateAnnouncement(subject, audience),
    canViewAnnouncement: (post: PostLike) => policy.canViewAnnouncement(subject, post),
    canEditAnnouncement: (post: PostLike) => policy.canEditAnnouncement(subject, post),
    canSubmitAnnouncement: (post: PostLike) => policy.canSubmitAnnouncement(subject, post),
    canWithdrawAnnouncement: (post: PostLike) => policy.canWithdrawAnnouncement(subject, post),
    canPublishAnnouncement: (post: PostLike) => policy.canPublishAnnouncement(subject, post),
    canReturnAnnouncementToDraft: (post: PostLike) =>
      policy.canReturnAnnouncementToDraft(subject, post),
    canArchiveAnnouncement: (post: PostLike) => policy.canArchiveAnnouncement(subject, post),
    canRestoreAnnouncement: (post: PostLike) => policy.canRestoreAnnouncement(subject, post),
    allowedAnnouncementTransitions: (post: PostLike) =>
      policy.allowedAnnouncementTransitions(subject, post),
    // events
    canCreateEvent: (target?: { scope: Event['scope']; chapterId: ID | null }) =>
      policy.canCreateEvent(subject, target),
    canViewEvent: (event: EventLike) => policy.canViewEvent(subject, event),
    canManageEvent: (event: EventLike) => policy.canManageEvent(subject, event),
    canPublishEvent: (event: EventLike) => policy.canPublishEvent(subject, event),
    canCancelEvent: (event: EventLike) => policy.canCancelEvent(subject, event),
    canRsvp: (event: EventLike) => policy.canRsvp(subject, event),
    canViewParticipants: (event: EventLike) => policy.canViewParticipants(subject, event),
    canViewAttendance: (event: EventLike) => policy.canViewAttendance(subject, event),
    canManageAttendance: (event: EventLike) => policy.canManageAttendance(subject, event),
    canViewEventNotes: (event: EventLike) => policy.canViewEventNotes(subject, event),
    // resources
    canViewResource: (resource: ResourceLike) => policy.canViewResource(subject, resource),
    canUploadResource: (chapterId?: ID | null) => policy.canUploadResource(subject, chapterId),
    canManageResource: (resource: Pick<Resource, 'chapterId'>, action: 'update' | 'archive') =>
      policy.canManageResource(subject, resource, action),
    // members & chapters
    canViewMemberPrivateFields: (member: MemberRef) =>
      policy.canViewMemberPrivateFields(subject, member),
    canEditMemberProfile: (member: MemberRef) => policy.canEditMemberProfile(subject, member),
    canManageMember: (member: MemberRef) => policy.canManageMember(subject, member),
    canViewDirectory: (chapterId: ID) => policy.canViewDirectory(subject, chapterId),
    canViewRoster: (chapterId: ID) => policy.canViewRoster(subject, chapterId),
    canUpdateChapter: (chapterId: ID) => policy.canUpdateChapter(subject, chapterId),
    canReadAuditFor: (chapterId: ID | null) => policy.canReadAuditFor(subject, chapterId),
    // roles
    checkAssignRole: (
      role: Role,
      scope: Scope,
      targetUser?: { userId: ID; currentRole?: Role | null },
    ) => policy.checkAssignRole(subject, role, scope, targetUser),
    canAssignRole: (
      role: Role,
      scope: Scope,
      targetUser?: { userId: ID; currentRole?: Role | null },
    ) => policy.canAssignRole(subject, role, scope, targetUser),
    assignableRoles: (scope: Scope) => policy.assignableRoles(subject, scope),
    canCreateSpecialAssignment: (permission: Permission, scope: Scope, targetUserId: ID) =>
      policy.canCreateSpecialAssignment(subject, permission, scope, targetUserId),
    canRevokeSpecialAssignment: (sa: SpecialAssignment) =>
      policy.canRevokeSpecialAssignment(subject, sa),
    canManageMappings: () => policy.canManageMappings(subject),
    allowedScopesFor: (permission?: Permission, allChapterIds?: ID[]) =>
      policy.allowedScopesFor(subject, permission, allChapterIds),
    isLeadershipFor: (scope: 'national' | 'chapter' | 'multi_chapter', chapterIds: ID[]) =>
      policy.isLeadershipFor(subject, scope, chapterIds),
  };
}

export type BoundPolicy = ReturnType<typeof bindPolicy>;
