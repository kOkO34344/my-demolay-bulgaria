import type { NavSection } from '@/app/routes';
import { ROUTE_PATTERNS } from '@/lib/routes';

/** Label key + landing path per navigation section (header breadcrumb, mobile title). */
export const SECTION_META: Record<NavSection, { labelKey: string; path: string }> = {
  home: { labelKey: 'nav.home', path: ROUTE_PATTERNS.home },
  news: { labelKey: 'nav.news', path: ROUTE_PATTERNS.news },
  events: { labelKey: 'nav.events', path: ROUTE_PATTERNS.events },
  chapter: { labelKey: 'nav.chapter', path: ROUTE_PATTERNS.chapter },
  resources: { labelKey: 'nav.resources', path: ROUTE_PATTERNS.resources },
  notifications: { labelKey: 'nav.notifications', path: ROUTE_PATTERNS.notifications },
  profile: { labelKey: 'nav.profile', path: ROUTE_PATTERNS.profile },
  more: { labelKey: 'nav.more', path: ROUTE_PATTERNS.more },
  officerWorkspace: { labelKey: 'nav.officerWorkspace', path: ROUTE_PATTERNS.officerWorkspace },
  content: { labelKey: 'nav.contentManagement', path: ROUTE_PATTERNS.content },
  members: { labelKey: 'nav.memberManagement', path: ROUTE_PATTERNS.members },
  verification: { labelKey: 'nav.verification', path: ROUTE_PATTERNS.verification },
  admin: { labelKey: 'nav.administration', path: ROUTE_PATTERNS.admin },
};

/** Sections reachable from the mobile bottom bar; everything else highlights "More". */
export const MOBILE_BOTTOM_SECTIONS: ReadonlySet<NavSection> = new Set([
  'home',
  'news',
  'events',
  'chapter',
]);
