import type { Permission, Subject } from '@/domain';
import { ROUTE_PATTERNS, type AdminSection, type RouteId } from '@/lib/routes';

import { can } from './policy';

/**
 * Permission-based route & navigation access table. Route guards and every navigation surface
 * (sidebar, bottom nav, More menu, admin tabs) MUST use canAccessRoute / visibleNavItems —
 * never role names.
 */

export interface RouteAccessRule {
  /** No session required (login, password recovery). */
  public?: boolean;
  /** Subject must hold ALL of these (at any scope). */
  allOf?: Permission[];
  /** Subject must hold AT LEAST ONE of these (at any scope). */
  anyOf?: Permission[];
}

const AUTHENTICATED: RouteAccessRule = {};

export const ROUTE_ACCESS: Record<RouteId, RouteAccessRule> = {
  login: { public: true },
  forgotPassword: { public: true },
  signup: { public: true },
  invite: { public: true },
  home: AUTHENTICATED,
  news: { allOf: ['feed.read'] },
  newsDetail: { allOf: ['feed.read'] },
  events: { allOf: ['event.read'] },
  eventCreate: { allOf: ['event.create'] },
  eventDetail: { allOf: ['event.read'] },
  eventEdit: { allOf: ['event.update'] },
  chapter: { allOf: ['chapter.read'] },
  resources: { allOf: ['resource.read'] },
  notifications: { allOf: ['notification.read'] },
  profile: AUTHENTICATED,
  onboarding: AUTHENTICATED,
  more: AUTHENTICATED,
  officerWorkspace: {
    anyOf: ['post.create', 'event.create', 'attendance.manage', 'resource.upload'],
  },
  content: { anyOf: ['post.approve', 'post.publish'] },
  contentCreate: { allOf: ['post.create'] },
  contentEdit: { anyOf: ['post.update', 'post.approve', 'post.publish'] },
  members: { allOf: ['member.access.manage'] },
  verification: { allOf: ['account.verify'] },
  invitations: { anyOf: ['member.access.manage', 'account.verify'] },
  admin: { allOf: ['system.manage'] },
  adminMembers: { allOf: ['system.manage', 'member.access.manage'] },
  adminChapters: { allOf: ['system.manage', 'chapter.update'] },
  adminContent: { allOf: ['system.manage', 'post.publish'] },
  adminEvents: { allOf: ['system.manage', 'event.update'] },
  adminRoles: { allOf: ['system.manage', 'role.read'] },
  adminPermissions: { allOf: ['system.manage', 'role.read'] },
  adminMappings: { allOf: ['system.manage', 'role.mapping.manage'] },
  adminTranslations: { allOf: ['system.manage', 'translation.review'] },
  adminAudit: { allOf: ['system.manage', 'audit.read.national'] },
  adminSync: { allOf: ['system.manage', 'integration.read'] },
};

/** Route-level check (object-level checks still happen inside pages via policy helpers). */
export function canAccessRoute(
  subject: Subject | null | undefined,
  routeId: RouteId,
  now?: Date,
): boolean {
  const rule = ROUTE_ACCESS[routeId];
  if (rule.public) return true;
  if (!subject) return false;
  if (rule.allOf && !rule.allOf.every((p) => can(subject, p, undefined, now))) return false;
  if (rule.anyOf && !rule.anyOf.some((p) => can(subject, p, undefined, now))) return false;
  return true;
}

export type NavGroup = 'main' | 'workspace' | 'account';
export type NavPlacement = 'sidebar' | 'mobileBottom' | 'mobileMore';

export interface NavItem {
  id: RouteId;
  path: string;
  /** i18n key */
  labelKey: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabelKey?: string;
  group: NavGroup;
  placements: NavPlacement[];
}

/** Ordered navigation model (icons are chosen by the shell per `id`). */
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    path: ROUTE_PATTERNS.home,
    labelKey: 'nav.home',
    group: 'main',
    placements: ['sidebar', 'mobileBottom'],
  },
  {
    id: 'news',
    path: ROUTE_PATTERNS.news,
    labelKey: 'nav.news',
    group: 'main',
    placements: ['sidebar', 'mobileBottom'],
  },
  {
    id: 'events',
    path: ROUTE_PATTERNS.events,
    labelKey: 'nav.events',
    group: 'main',
    placements: ['sidebar', 'mobileBottom'],
  },
  {
    id: 'chapter',
    path: ROUTE_PATTERNS.chapter,
    labelKey: 'nav.chapter',
    shortLabelKey: 'nav.chapterShort',
    group: 'main',
    placements: ['sidebar', 'mobileBottom'],
  },
  {
    id: 'resources',
    path: ROUTE_PATTERNS.resources,
    labelKey: 'nav.resources',
    group: 'main',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'notifications',
    path: ROUTE_PATTERNS.notifications,
    labelKey: 'nav.notifications',
    group: 'main',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'officerWorkspace',
    path: ROUTE_PATTERNS.officerWorkspace,
    labelKey: 'nav.officerWorkspace',
    group: 'workspace',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'content',
    path: ROUTE_PATTERNS.content,
    labelKey: 'nav.contentManagement',
    group: 'workspace',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'members',
    path: ROUTE_PATTERNS.members,
    labelKey: 'nav.memberManagement',
    group: 'workspace',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'invitations',
    path: ROUTE_PATTERNS.invitations,
    labelKey: 'nav.invitations',
    group: 'workspace',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'verification',
    path: ROUTE_PATTERNS.verification,
    labelKey: 'nav.verification',
    group: 'workspace',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'admin',
    path: ROUTE_PATTERNS.admin,
    labelKey: 'nav.administration',
    group: 'workspace',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'profile',
    path: ROUTE_PATTERNS.profile,
    labelKey: 'nav.profile',
    group: 'account',
    placements: ['sidebar', 'mobileMore'],
  },
  {
    id: 'more',
    path: ROUTE_PATTERNS.more,
    labelKey: 'nav.more',
    group: 'account',
    placements: ['mobileBottom'],
  },
];

/** Navigation items the subject may see, optionally for one placement, in display order. */
export function visibleNavItems(
  subject: Subject | null | undefined,
  placement?: NavPlacement,
  now?: Date,
): NavItem[] {
  return NAV_ITEMS.filter(
    (item) =>
      (!placement || item.placements.includes(placement)) && canAccessRoute(subject, item.id, now),
  );
}

export interface AdminTab {
  section: AdminSection;
  routeId: RouteId;
  labelKey: string;
}

export const ADMIN_TABS: AdminTab[] = [
  { section: 'members', routeId: 'adminMembers', labelKey: 'nav.admin.members' },
  { section: 'chapters', routeId: 'adminChapters', labelKey: 'nav.admin.chapters' },
  { section: 'content', routeId: 'adminContent', labelKey: 'nav.admin.content' },
  { section: 'events', routeId: 'adminEvents', labelKey: 'nav.admin.events' },
  { section: 'roles', routeId: 'adminRoles', labelKey: 'nav.admin.roles' },
  { section: 'permissions', routeId: 'adminPermissions', labelKey: 'nav.admin.permissions' },
  { section: 'mappings', routeId: 'adminMappings', labelKey: 'nav.admin.mappings' },
  { section: 'translations', routeId: 'adminTranslations', labelKey: 'nav.admin.translations' },
  { section: 'audit', routeId: 'adminAudit', labelKey: 'nav.admin.audit' },
  { section: 'sync', routeId: 'adminSync', labelKey: 'nav.admin.sync' },
];

export function visibleAdminTabs(subject: Subject | null | undefined, now?: Date): AdminTab[] {
  return ADMIN_TABS.filter((tab) => canAccessRoute(subject, tab.routeId, now));
}
