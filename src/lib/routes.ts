/**
 * Canonical routes. Use `paths.*()` to build links (never hand-write URLs) and ROUTE_PATTERNS
 * when declaring routes. Notification links stored in mock data use these paths too.
 * Access rules per route live in src/auth/routeAccess.ts.
 */

export const ADMIN_SECTIONS = [
  'members',
  'chapters',
  'content',
  'events',
  'roles',
  'permissions',
  'mappings',
  'translations',
  'audit',
  'sync',
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const ROUTE_PATTERNS = {
  login: '/login',
  forgotPassword: '/forgot-password',
  home: '/',
  news: '/news',
  newsDetail: '/news/:postId',
  events: '/events',
  eventCreate: '/events/new',
  eventDetail: '/events/:eventId',
  eventEdit: '/events/:eventId/edit',
  chapter: '/chapter',
  resources: '/resources',
  notifications: '/notifications',
  profile: '/profile',
  more: '/more',
  officerWorkspace: '/workspace',
  content: '/content',
  contentCreate: '/content/new',
  contentEdit: '/content/:postId/edit',
  members: '/members',
  admin: '/admin',
  adminMembers: '/admin/members',
  adminChapters: '/admin/chapters',
  adminContent: '/admin/content',
  adminEvents: '/admin/events',
  adminRoles: '/admin/roles',
  adminPermissions: '/admin/permissions',
  adminMappings: '/admin/mappings',
  adminTranslations: '/admin/translations',
  adminAudit: '/admin/audit',
  adminSync: '/admin/sync',
} as const;

export type RouteId = keyof typeof ROUTE_PATTERNS;
export const ROUTE_IDS = Object.keys(ROUTE_PATTERNS) as RouteId[];

const enc = encodeURIComponent;

function withQuery(path: string, query?: Record<string, string | undefined>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const paths = {
  login: (redirectTo?: string) => withQuery(ROUTE_PATTERNS.login, { redirect: redirectTo }),
  forgotPassword: () => ROUTE_PATTERNS.forgotPassword,
  home: () => ROUTE_PATTERNS.home,
  news: (query?: { feed?: string; q?: string }) => withQuery(ROUTE_PATTERNS.news, query),
  newsDetail: (postId: string) => `/news/${enc(postId)}`,
  events: (query?: { tab?: 'upcoming' | 'past'; scope?: string; q?: string }) =>
    withQuery(ROUTE_PATTERNS.events, query),
  eventCreate: () => ROUTE_PATTERNS.eventCreate,
  eventDetail: (eventId: string) => `/events/${enc(eventId)}`,
  eventEdit: (eventId: string) => `/events/${enc(eventId)}/edit`,
  chapter: () => ROUTE_PATTERNS.chapter,
  resources: (query?: { category?: string; q?: string }) =>
    withQuery(ROUTE_PATTERNS.resources, query),
  notifications: () => ROUTE_PATTERNS.notifications,
  profile: (section?: string) =>
    section ? `${ROUTE_PATTERNS.profile}#${section}` : ROUTE_PATTERNS.profile,
  more: () => ROUTE_PATTERNS.more,
  officerWorkspace: () => ROUTE_PATTERNS.officerWorkspace,
  content: (query?: { status?: string }) => withQuery(ROUTE_PATTERNS.content, query),
  contentCreate: () => ROUTE_PATTERNS.contentCreate,
  contentEdit: (postId: string) => `/content/${enc(postId)}/edit`,
  members: (query?: { member?: string }) => withQuery(ROUTE_PATTERNS.members, query),
  /** Member Management with the profile drawer open. */
  memberDetail: (userId: string) => withQuery(ROUTE_PATTERNS.members, { member: userId }),
  admin: () => ROUTE_PATTERNS.admin,
  adminSection: (section: AdminSection) => `/admin/${section}`,
} as const;
