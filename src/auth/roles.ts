import {
  PERMISSIONS,
  ROLES,
  type Permission,
  type PermissionGrant,
  type Role,
  type RoleDefinition,
  type ScopeLevel,
} from '@/domain';
import { labelKeys } from '@/i18n/labels';

export { ROLES, type Role };

const grant = (permission: Permission, scope: ScopeLevel): PermissionGrant => ({
  permission,
  scope,
});

/** Adds/overrides grants by permission (later wins), preserving catalogue order. */
function compose(...layers: PermissionGrant[][]): PermissionGrant[] {
  const byPermission = new Map<Permission, PermissionGrant>();
  for (const layer of layers) for (const g of layer) byPermission.set(g.permission, g);
  return PERMISSIONS.filter((p) => byPermission.has(p)).map(
    (p) => byPermission.get(p) as PermissionGrant,
  );
}

/**
 * Member — reads authorised news/events/resources, RSVPs for themself, views their own chapter
 * (incl. the privacy-safe directory via chapter.read), manages their own profile and notifications.
 */
const MEMBER: PermissionGrant[] = [
  grant('feed.read', 'chapter'),
  grant('event.read', 'chapter'),
  grant('event.rsvp', 'self'),
  grant('resource.read', 'chapter'),
  grant('chapter.read', 'chapter'),
  grant('member.profile.read', 'self'),
  grant('member.profile.update', 'self'),
  grant('notification.read', 'self'),
];

/**
 * Chapter Officer — everything a Member can do, plus: draft/edit/submit chapter announcements,
 * create/update chapter events, see participants, record attendance, manage chapter resources,
 * view the chapter roster (no contact data), notify the chapter, write translations.
 */
const CHAPTER_OFFICER = compose(MEMBER, [
  grant('post.create', 'chapter'),
  grant('post.update', 'chapter'),
  grant('post.submit', 'chapter'),
  grant('event.create', 'chapter'),
  grant('event.update', 'chapter'),
  grant('event.participants.read', 'chapter'),
  grant('attendance.read', 'chapter'),
  grant('attendance.manage', 'chapter'),
  grant('resource.upload', 'chapter'),
  grant('resource.update', 'chapter'),
  grant('resource.archive', 'chapter'),
  grant('chapter.directory.read', 'chapter'),
  grant('notification.send.chapter', 'chapter'),
  grant('translation.create', 'chapter'),
]);

/**
 * Chapter Advisor — everything a Chapter Officer can do, plus: approve/publish/archive chapter
 * content, cancel chapter events, view full member profiles (contact data) and manage member
 * access in the chapter, assign lower roles within the chapter (escalation-limited), review
 * chapter activity (audit) and translations.
 */
const CHAPTER_ADVISOR = compose(CHAPTER_OFFICER, [
  grant('post.approve', 'chapter'),
  grant('post.publish', 'chapter'),
  grant('post.archive', 'chapter'),
  grant('event.cancel', 'chapter'),
  grant('member.profile.read', 'chapter'),
  grant('member.access.manage', 'chapter'),
  grant('role.read', 'chapter'),
  grant('role.assign', 'chapter'),
  grant('audit.read.chapter', 'chapter'),
  grant('translation.review', 'chapter'),
]);

/**
 * National Officer — national content and events, national notifications, national resources,
 * multi-chapter summaries (chapter.read/directory at national scope), moderation across chapters.
 * Does NOT manage member accounts, roles, mappings, integration or system settings.
 */
const NATIONAL_OFFICER: PermissionGrant[] = compose([
  grant('feed.read', 'national'),
  grant('post.create', 'national'),
  grant('post.update', 'national'),
  grant('post.submit', 'national'),
  grant('post.approve', 'national'),
  grant('post.publish', 'national'),
  grant('post.archive', 'national'),
  grant('event.read', 'national'),
  grant('event.create', 'national'),
  grant('event.update', 'national'),
  grant('event.cancel', 'national'),
  grant('event.rsvp', 'self'),
  grant('event.participants.read', 'national'),
  grant('attendance.read', 'national'),
  grant('attendance.manage', 'national'),
  grant('resource.read', 'national'),
  grant('resource.upload', 'national'),
  grant('resource.update', 'national'),
  grant('resource.archive', 'national'),
  grant('chapter.read', 'national'),
  grant('chapter.directory.read', 'national'),
  grant('member.profile.read', 'self'),
  grant('member.profile.update', 'self'),
  grant('notification.read', 'self'),
  grant('notification.send.chapter', 'national'),
  grant('notification.send.national', 'national'),
  grant('role.read', 'national'),
  grant('translation.create', 'national'),
  grant('translation.review', 'national'),
  grant('translation.publish', 'national'),
  grant('audit.read.chapter', 'national'),
]);

/** National Administrator — every permission at system scope (RSVP and notifications stay personal). */
const NATIONAL_ADMIN: PermissionGrant[] = PERMISSIONS.map((permission) =>
  grant(
    permission,
    permission === 'event.rsvp' || permission === 'notification.read' ? 'self' : 'system',
  ),
);

function definition(
  role: Role,
  rank: number,
  allowedScopeLevels: ScopeLevel[],
  grants: PermissionGrant[],
): RoleDefinition {
  return {
    role,
    rank,
    labelKey: labelKeys.role(role),
    descriptionKey: labelKeys.roleDescription(role),
    allowedScopeLevels,
    defaultScopeLevel: allowedScopeLevels[0] ?? 'chapter',
    grants,
  };
}

/** Data-driven role behaviour. The UI must never branch on role names — check permissions. */
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  member: definition('member', 1, ['chapter'], MEMBER),
  chapter_officer: definition('chapter_officer', 2, ['chapter'], CHAPTER_OFFICER),
  chapter_advisor: definition('chapter_advisor', 3, ['chapter', 'multi_chapter'], CHAPTER_ADVISOR),
  national_officer: definition('national_officer', 4, ['national'], NATIONAL_OFFICER),
  national_admin: definition('national_admin', 5, ['system'], NATIONAL_ADMIN),
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function roleRank(role: Role): number {
  return ROLE_DEFINITIONS[role].rank;
}

/** Role definitions in rank order (for tables and pickers). */
export function listRoleDefinitions(): RoleDefinition[] {
  return ROLES.map((r) => ROLE_DEFINITIONS[r]);
}
