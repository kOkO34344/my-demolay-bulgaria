import { PERMISSIONS, type Permission, type ScopeLevel } from '@/domain';
import { labelKeys } from '@/i18n/labels';

export { PERMISSIONS, type Permission };

export const PERMISSION_GROUPS = [
  'feed',
  'posts',
  'events',
  'attendance',
  'resources',
  'chapters',
  'members',
  'payments',
  'notifications',
  'helpdesk',
  'roles',
  'translations',
  'audit',
  'integration',
  'system',
] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export interface PermissionMeta {
  permission: Permission;
  group: PermissionGroup;
  /** i18n key: permissions.items.<permission>.label */
  labelKey: string;
  /** i18n key: permissions.items.<permission>.description */
  descriptionKey: string;
  /** Scope levels at which this permission is meaningful (special-assignment form options). */
  scopeLevels: ScopeLevel[];
  /**
   * Set when the feature behind the permission is not built in the prototype yet: the brief's
   * phase it belongs to (docs/ROADMAP.md §5). The permission is still granted per the matrix.
   */
  plannedPhase?: 1 | 2 | 3;
}

const CONTENT_SCOPES: ScopeLevel[] = ['chapter', 'multi_chapter', 'national', 'system'];
const SELF_ONLY: ScopeLevel[] = ['self'];
const SELF_AND_UP: ScopeLevel[] = ['self', 'chapter', 'multi_chapter', 'national', 'system'];
const NATIONAL_UP: ScopeLevel[] = ['national', 'system'];
const SYSTEM_ONLY: ScopeLevel[] = ['system'];

function meta(
  permission: Permission,
  group: PermissionGroup,
  scopeLevels: ScopeLevel[],
  plannedPhase?: PermissionMeta['plannedPhase'],
): PermissionMeta {
  return {
    permission,
    group,
    labelKey: labelKeys.permission(permission),
    descriptionKey: labelKeys.permissionDescription(permission),
    scopeLevels,
    ...(plannedPhase ? { plannedPhase } : {}),
  };
}

/** Metadata for EVERY permission (Record type guarantees completeness at compile time). */
export const PERMISSION_CATALOGUE: Record<Permission, PermissionMeta> = {
  'feed.read': meta('feed.read', 'feed', CONTENT_SCOPES),
  'post.create': meta('post.create', 'posts', CONTENT_SCOPES),
  'post.update': meta('post.update', 'posts', CONTENT_SCOPES),
  'post.submit': meta('post.submit', 'posts', CONTENT_SCOPES),
  'post.approve': meta('post.approve', 'posts', CONTENT_SCOPES),
  'post.publish': meta('post.publish', 'posts', CONTENT_SCOPES),
  'post.archive': meta('post.archive', 'posts', CONTENT_SCOPES),
  'event.read': meta('event.read', 'events', CONTENT_SCOPES),
  'event.create': meta('event.create', 'events', CONTENT_SCOPES),
  'event.update': meta('event.update', 'events', CONTENT_SCOPES),
  'event.approve': meta('event.approve', 'events', CONTENT_SCOPES),
  'event.cancel': meta('event.cancel', 'events', CONTENT_SCOPES),
  'event.rsvp': meta('event.rsvp', 'events', SELF_ONLY),
  'event.participants.read': meta('event.participants.read', 'events', CONTENT_SCOPES),
  'attendance.read': meta('attendance.read', 'attendance', CONTENT_SCOPES),
  'attendance.manage': meta('attendance.manage', 'attendance', CONTENT_SCOPES),
  'resource.read': meta('resource.read', 'resources', CONTENT_SCOPES),
  'resource.upload': meta('resource.upload', 'resources', CONTENT_SCOPES),
  'resource.update': meta('resource.update', 'resources', CONTENT_SCOPES),
  'resource.archive': meta('resource.archive', 'resources', CONTENT_SCOPES),
  'ritual.read': meta('ritual.read', 'resources', CONTENT_SCOPES),
  'chapter.read': meta('chapter.read', 'chapters', CONTENT_SCOPES),
  'chapter.update': meta('chapter.update', 'chapters', CONTENT_SCOPES),
  'chapter.directory.read': meta('chapter.directory.read', 'chapters', CONTENT_SCOPES),
  'member.profile.read': meta('member.profile.read', 'members', SELF_AND_UP),
  'member.profile.update': meta('member.profile.update', 'members', SELF_AND_UP),
  'member.access.manage': meta('member.access.manage', 'members', CONTENT_SCOPES),
  'account.verify': meta('account.verify', 'members', NATIONAL_UP),
  'notification.read': meta('notification.read', 'notifications', SELF_ONLY),
  'notification.send.chapter': meta('notification.send.chapter', 'notifications', CONTENT_SCOPES),
  'notification.send.national': meta('notification.send.national', 'notifications', NATIONAL_UP),
  'email.send.mass': meta('email.send.mass', 'notifications', NATIONAL_UP, 2),
  'payment.read.all': meta('payment.read.all', 'payments', NATIONAL_UP, 2),
  'payment.read.chapter': meta('payment.read.chapter', 'payments', CONTENT_SCOPES, 2),
  'payment.record': meta('payment.record', 'payments', CONTENT_SCOPES, 2),
  'payment.pay': meta('payment.pay', 'payments', SELF_ONLY, 2),
  'helpdesk.create': meta('helpdesk.create', 'helpdesk', SELF_ONLY, 1),
  'helpdesk.answer': meta('helpdesk.answer', 'helpdesk', SYSTEM_ONLY, 1),
  'role.read': meta('role.read', 'roles', CONTENT_SCOPES),
  'role.assign': meta('role.assign', 'roles', CONTENT_SCOPES),
  'role.mapping.manage': meta('role.mapping.manage', 'roles', SYSTEM_ONLY),
  'translation.create': meta('translation.create', 'translations', CONTENT_SCOPES),
  'translation.review': meta('translation.review', 'translations', CONTENT_SCOPES),
  'translation.publish': meta('translation.publish', 'translations', NATIONAL_UP),
  'audit.read.chapter': meta('audit.read.chapter', 'audit', CONTENT_SCOPES),
  'audit.read.national': meta('audit.read.national', 'audit', NATIONAL_UP),
  'integration.read': meta('integration.read', 'integration', SYSTEM_ONLY),
  'integration.manage': meta('integration.manage', 'integration', SYSTEM_ONLY),
  'system.manage': meta('system.manage', 'system', SYSTEM_ONLY),
};

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}

/** Permissions grouped for display (Roles & Permissions administration). */
export function permissionsByGroup(): Array<{
  group: PermissionGroup;
  permissions: PermissionMeta[];
}> {
  return PERMISSION_GROUPS.map((group) => ({
    group,
    permissions: PERMISSIONS.map((p) => PERMISSION_CATALOGUE[p]).filter((m) => m.group === group),
  }));
}
