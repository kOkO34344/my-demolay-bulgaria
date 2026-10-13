import type { ComponentType } from 'react';
import { matchRoutes } from 'react-router';

import { canAccessRoute, canAny } from '@/auth';
import type { PageSkeletonVariant } from '@/components/common/LoadingSkeletons';
import type { Permission, Subject } from '@/domain';
import { ROUTE_PATTERNS, type RouteId } from '@/lib/routes';

/**
 * Central route table (SHELL agent). Paths come from `@/lib/routes` (core); this file adds the page
 * module, owner, document-title key, skeleton and guard for every route. `router.tsx` builds the
 * React Router tree from it, and the shell uses it for document titles, header breadcrumbs and
 * focus management. Feature agents only edit their page files — not this table.
 */

/** Routes that exist only in the shell table (not in the core `RouteId` union). */
export const SHELL_ROUTE_PATTERNS = {
  /** Attendance recording for one event (events agent). */
  eventAttendance: '/events/:eventId/attendance',
  /** Alias kept for the orchestrator's route list: redirects to `paths.officerWorkspace()`. */
  officerAlias: '/officer',
} as const;

export type ShellRouteId = keyof typeof SHELL_ROUTE_PATTERNS;
export type AppRouteId = RouteId | ShellRouteId | 'notFound';

/** Link builders for shell-only routes (core builders live in `paths` from '@/lib/routes'). */
export const shellPaths = {
  eventAttendance: (eventId: string) => `/events/${encodeURIComponent(eventId)}/attendance`,
} as const;

/** Nav item that is highlighted / shown in the header for a route. */
export type NavSection =
  | 'home'
  | 'news'
  | 'events'
  | 'chapter'
  | 'resources'
  | 'notifications'
  | 'profile'
  | 'more'
  | 'officerWorkspace'
  | 'content'
  | 'members'
  | 'invitations'
  | 'verification'
  | 'admin';

export type FeatureOwner =
  | 'shell'
  | 'auth'
  | 'home'
  | 'news'
  | 'events'
  | 'chapter'
  | 'resources'
  | 'notifications'
  | 'profile'
  | 'officer'
  | 'content'
  | 'members'
  | 'invitations'
  | 'verification'
  | 'admin'
  | 'access'
  | 'sync';

type PageModule = { default: ComponentType };

export interface AppRouteDefinition {
  id: AppRouteId;
  path: string;
  /** i18n key of the page name (document title + header breadcrumb). */
  titleKey: string;
  /** Section shown in the header / bottom bar context. */
  section: NavSection | null;
  owner: FeatureOwner;
  /** Source file (documentation). */
  file: string;
  /** Lazy page module (default export = page component). */
  load?: () => Promise<PageModule>;
  /** Suspense fallback shape while the page chunk loads. */
  skeleton: PageSkeletonVariant;
  /**
   * Access: `routeId` = core ROUTE_ACCESS entry (preferred, single source of truth);
   * `anyOf` = explicit permissions for shell-only routes; omitted = any signed-in user.
   */
  access?: { routeId: RouteId } | { anyOf: readonly Permission[] };
  /** Lives under /admin (rendered inside AdminLayout). */
  admin?: boolean;
}

const P = ROUTE_PATTERNS;

/** Authenticated application routes, in match-priority-independent order (React Router ranks them). */
export const APP_ROUTES: readonly AppRouteDefinition[] = [
  {
    id: 'home',
    path: P.home,
    titleKey: 'nav.home',
    section: 'home',
    owner: 'home',
    file: 'src/features/home/pages/HomePage.tsx',
    load: () => import('@/features/home/pages/HomePage'),
    skeleton: 'dashboard',
    access: { routeId: 'home' },
  },
  {
    id: 'news',
    path: P.news,
    titleKey: 'nav.news',
    section: 'news',
    owner: 'news',
    file: 'src/features/news/pages/NewsFeedPage.tsx',
    load: () => import('@/features/news/pages/NewsFeedPage'),
    skeleton: 'list',
    access: { routeId: 'news' },
  },
  {
    id: 'newsDetail',
    path: P.newsDetail,
    titleKey: 'shell.routes.newsDetail',
    section: 'news',
    owner: 'news',
    file: 'src/features/news/pages/NewsDetailPage.tsx',
    load: () => import('@/features/news/pages/NewsDetailPage'),
    skeleton: 'detail',
    access: { routeId: 'newsDetail' },
  },
  {
    id: 'events',
    path: P.events,
    titleKey: 'nav.events',
    section: 'events',
    owner: 'events',
    file: 'src/features/events/pages/EventsPage.tsx',
    load: () => import('@/features/events/pages/EventsPage'),
    skeleton: 'cards',
    access: { routeId: 'events' },
  },
  {
    id: 'eventCreate',
    path: P.eventCreate,
    titleKey: 'shell.routes.eventCreate',
    section: 'events',
    owner: 'events',
    file: 'src/features/events/pages/EventEditorPage.tsx (create mode)',
    load: () => import('@/features/events/pages/EventEditorPage'),
    skeleton: 'form',
    access: { routeId: 'eventCreate' },
  },
  {
    id: 'eventDetail',
    path: P.eventDetail,
    titleKey: 'shell.routes.eventDetail',
    section: 'events',
    owner: 'events',
    file: 'src/features/events/pages/EventDetailPage.tsx',
    load: () => import('@/features/events/pages/EventDetailPage'),
    skeleton: 'detail',
    access: { routeId: 'eventDetail' },
  },
  {
    id: 'eventEdit',
    path: P.eventEdit,
    titleKey: 'shell.routes.eventEdit',
    section: 'events',
    owner: 'events',
    file: 'src/features/events/pages/EventEditorPage.tsx (edit mode)',
    load: () => import('@/features/events/pages/EventEditorPage'),
    skeleton: 'form',
    access: { routeId: 'eventEdit' },
  },
  {
    id: 'eventAttendance',
    path: SHELL_ROUTE_PATTERNS.eventAttendance,
    titleKey: 'shell.routes.eventAttendance',
    section: 'events',
    owner: 'events',
    file: 'src/features/events/pages/EventAttendancePage.tsx',
    load: () => import('@/features/events/pages/EventAttendancePage'),
    skeleton: 'table',
    access: { anyOf: ['attendance.read', 'attendance.manage'] },
  },
  {
    id: 'chapter',
    path: P.chapter,
    titleKey: 'nav.chapter',
    section: 'chapter',
    owner: 'chapter',
    file: 'src/features/chapter/pages/MyChapterPage.tsx',
    load: () => import('@/features/chapter/pages/MyChapterPage'),
    skeleton: 'dashboard',
    access: { routeId: 'chapter' },
  },
  {
    id: 'resources',
    path: P.resources,
    titleKey: 'nav.resources',
    section: 'resources',
    owner: 'resources',
    file: 'src/features/resources/pages/ResourcesPage.tsx',
    load: () => import('@/features/resources/pages/ResourcesPage'),
    skeleton: 'list',
    access: { routeId: 'resources' },
  },
  {
    id: 'notifications',
    path: P.notifications,
    titleKey: 'nav.notifications',
    section: 'notifications',
    owner: 'notifications',
    file: 'src/features/notifications/pages/NotificationsPage.tsx',
    load: () => import('@/features/notifications/pages/NotificationsPage'),
    skeleton: 'list',
    access: { routeId: 'notifications' },
  },
  {
    id: 'profile',
    path: P.profile,
    titleKey: 'nav.profile',
    section: 'profile',
    owner: 'profile',
    file: 'src/features/profile/pages/ProfilePage.tsx',
    load: () => import('@/features/profile/pages/ProfilePage'),
    skeleton: 'form',
    access: { routeId: 'profile' },
  },
  {
    id: 'onboarding',
    path: P.onboarding,
    titleKey: 'onboarding.title',
    section: 'profile',
    owner: 'profile',
    file: 'src/features/onboarding/pages/OnboardingPage.tsx',
    load: () => import('@/features/onboarding/pages/OnboardingPage'),
    skeleton: 'form',
    access: { routeId: 'onboarding' },
  },
  {
    id: 'more',
    path: P.more,
    titleKey: 'nav.more',
    section: 'more',
    owner: 'shell',
    file: 'src/features/shell/pages/MorePage.tsx',
    load: () => import('@/features/shell/pages/MorePage'),
    skeleton: 'list',
    access: { routeId: 'more' },
  },
  {
    id: 'officerWorkspace',
    path: P.officerWorkspace,
    titleKey: 'nav.officerWorkspace',
    section: 'officerWorkspace',
    owner: 'officer',
    file: 'src/features/officer/pages/OfficerWorkspacePage.tsx',
    load: () => import('@/features/officer/pages/OfficerWorkspacePage'),
    skeleton: 'dashboard',
    access: { routeId: 'officerWorkspace' },
  },
  {
    id: 'content',
    path: P.content,
    titleKey: 'nav.contentManagement',
    section: 'content',
    owner: 'content',
    file: 'src/features/content/pages/ContentManagementPage.tsx',
    load: () => import('@/features/content/pages/ContentManagementPage'),
    skeleton: 'table',
    access: { routeId: 'content' },
  },
  {
    id: 'contentCreate',
    path: P.contentCreate,
    titleKey: 'shell.routes.contentCreate',
    section: 'content',
    owner: 'content',
    file: 'src/features/content/pages/AnnouncementEditorPage.tsx (create mode)',
    load: () => import('@/features/content/pages/AnnouncementEditorPage'),
    skeleton: 'form',
    access: { routeId: 'contentCreate' },
  },
  {
    id: 'contentEdit',
    path: P.contentEdit,
    titleKey: 'shell.routes.contentEdit',
    section: 'content',
    owner: 'content',
    file: 'src/features/content/pages/AnnouncementEditorPage.tsx (edit mode)',
    load: () => import('@/features/content/pages/AnnouncementEditorPage'),
    skeleton: 'form',
    access: { routeId: 'contentEdit' },
  },
  {
    id: 'members',
    path: P.members,
    titleKey: 'nav.memberManagement',
    section: 'members',
    owner: 'members',
    file: 'src/features/members/pages/MemberManagementPage.tsx',
    load: () => import('@/features/members/pages/MemberManagementPage'),
    skeleton: 'table',
    access: { routeId: 'members' },
  },
  {
    id: 'invitations',
    path: P.invitations,
    titleKey: 'nav.invitations',
    section: 'invitations',
    owner: 'invitations',
    file: 'src/features/invitations/pages/InvitationsPage.tsx',
    load: () => import('@/features/invitations/pages/InvitationsPage'),
    skeleton: 'list',
    access: { routeId: 'invitations' },
  },
  {
    id: 'verification',
    path: P.verification,
    titleKey: 'nav.verification',
    section: 'verification',
    owner: 'verification',
    file: 'src/features/verification/pages/VerificationQueuePage.tsx',
    load: () => import('@/features/verification/pages/VerificationQueuePage'),
    skeleton: 'list',
    access: { routeId: 'verification' },
  },
  {
    id: 'admin',
    path: P.admin,
    titleKey: 'nav.administration',
    section: 'admin',
    owner: 'admin',
    file: 'src/features/admin/pages/AdminLayout.tsx (layout; index redirects to the first allowed tab)',
    load: () => import('@/features/admin/pages/AdminLayout'),
    skeleton: 'table',
    access: { routeId: 'admin' },
  },
  ...(
    [
      [
        'adminMembers',
        P.adminMembers,
        'nav.admin.members',
        'admin',
        'src/features/admin/pages/AdminMembersPage.tsx',
        () => import('@/features/admin/pages/AdminMembersPage'),
      ],
      [
        'adminChapters',
        P.adminChapters,
        'nav.admin.chapters',
        'admin',
        'src/features/admin/pages/AdminChaptersPage.tsx',
        () => import('@/features/admin/pages/AdminChaptersPage'),
      ],
      [
        'adminContent',
        P.adminContent,
        'nav.admin.content',
        'admin',
        'src/features/admin/pages/AdminContentPage.tsx',
        () => import('@/features/admin/pages/AdminContentPage'),
      ],
      [
        'adminEvents',
        P.adminEvents,
        'nav.admin.events',
        'admin',
        'src/features/admin/pages/AdminEventsPage.tsx',
        () => import('@/features/admin/pages/AdminEventsPage'),
      ],
      [
        'adminRoles',
        P.adminRoles,
        'nav.admin.roles',
        'access',
        'src/features/access/pages/RolesPage.tsx',
        () => import('@/features/access/pages/RolesPage'),
      ],
      [
        'adminPermissions',
        P.adminPermissions,
        'nav.admin.permissions',
        'access',
        'src/features/access/pages/PermissionsPage.tsx',
        () => import('@/features/access/pages/PermissionsPage'),
      ],
      [
        'adminMappings',
        P.adminMappings,
        'nav.admin.mappings',
        'access',
        'src/features/access/pages/PositionMappingPage.tsx',
        () => import('@/features/access/pages/PositionMappingPage'),
      ],
      [
        'adminTranslations',
        P.adminTranslations,
        'nav.admin.translations',
        'admin',
        'src/features/admin/pages/AdminTranslationsPage.tsx',
        () => import('@/features/admin/pages/AdminTranslationsPage'),
      ],
      [
        'adminAudit',
        P.adminAudit,
        'nav.admin.audit',
        'admin',
        'src/features/admin/pages/AdminAuditPage.tsx',
        () => import('@/features/admin/pages/AdminAuditPage'),
      ],
      [
        'adminSync',
        P.adminSync,
        'nav.admin.sync',
        'sync',
        'src/features/sync/pages/SyncPage.tsx',
        () => import('@/features/sync/pages/SyncPage'),
      ],
    ] as const
  ).map(([id, path, titleKey, owner, file, load]): AppRouteDefinition => ({
    id,
    path,
    titleKey,
    section: 'admin',
    owner,
    file,
    load,
    skeleton: 'table',
    access: { routeId: id },
    admin: true,
  })),
];

/** Public (signed-out) routes. Authenticated visitors are redirected home. */
export const PUBLIC_ROUTES: readonly AppRouteDefinition[] = [
  {
    id: 'login',
    path: P.login,
    titleKey: 'auth.login.title',
    section: null,
    owner: 'auth',
    file: 'src/features/auth/pages/LoginPage.tsx',
    load: () => import('@/features/auth/pages/LoginPage'),
    skeleton: 'form',
  },
  {
    id: 'signup',
    path: P.signup,
    titleKey: 'signup.title',
    section: null,
    owner: 'auth',
    file: 'src/features/auth/pages/SignupPage.tsx',
    load: () => import('@/features/auth/pages/SignupPage'),
    skeleton: 'form',
  },
  {
    id: 'invite',
    path: P.invite,
    titleKey: 'invitations.accept.title',
    section: null,
    owner: 'auth',
    file: 'src/features/auth/pages/InvitationSignupPage.tsx',
    load: () => import('@/features/auth/pages/InvitationSignupPage'),
    skeleton: 'form',
  },
  {
    id: 'forgotPassword',
    path: P.forgotPassword,
    titleKey: 'auth.forgot.title',
    section: null,
    owner: 'auth',
    file: 'src/features/auth/pages/ForgotPasswordPage.tsx',
    load: () => import('@/features/auth/pages/ForgotPasswordPage'),
    skeleton: 'form',
  },
];

export const NOT_FOUND_ROUTE: AppRouteDefinition = {
  id: 'notFound',
  path: '*',
  titleKey: 'common.states.notFoundTitle',
  section: null,
  owner: 'shell',
  file: 'src/features/shell/pages/NotFoundPage.tsx',
  load: () => import('@/features/shell/pages/NotFoundPage'),
  skeleton: 'detail',
};

const ALL_ROUTES: readonly AppRouteDefinition[] = [
  ...PUBLIC_ROUTES,
  ...APP_ROUTES,
  NOT_FOUND_ROUTE,
];

const MATCHABLE = ALL_ROUTES.map((route) => ({ path: route.path, id: route.id }));

/**
 * Finds the route definition for a pathname using React Router's ranking (static segments beat
 * params, so /events/new → eventCreate). Unknown paths resolve to the not-found route.
 */
export function matchAppRoute(pathname: string): AppRouteDefinition {
  const matches = matchRoutes(MATCHABLE, pathname);
  const id = matches?.[matches.length - 1]?.route.id;
  return ALL_ROUTES.find((route) => route.id === id) ?? NOT_FOUND_ROUTE;
}

/**
 * Validates a `?redirect=` target: only same-origin, absolute in-app paths (no protocol-relative
 * `//host`, no backslashes, never back to /login). Prevents open redirects.
 */
export function safeRedirectTarget(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  if (raw === ROUTE_PATTERNS.login || raw.startsWith(`${ROUTE_PATTERNS.login}?`)) return null;
  return raw;
}

/**
 * Whether `subject` may open a route definition (same rules the route guards apply). Used by the
 * demo role switcher to leave pages the new role cannot see.
 */
export function canAccessAppRoute(
  subject: Subject | null | undefined,
  route: AppRouteDefinition,
): boolean {
  if (!route.access) return true;
  if ('routeId' in route.access) return canAccessRoute(subject, route.access.routeId);
  return canAny(subject, route.access.anyOf);
}
