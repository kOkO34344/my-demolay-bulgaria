import { BellIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation } from 'react-router';

import { matchAppRoute } from '@/app/routes';
import { usePolicy } from '@/auth';
import { BRAND_ASSETS } from '@/lib/brand';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { DemoChip } from './DemoChip';
import { useUnreadCount } from './hooks';
import { NavIcon } from './NavIcon';
import { CountBadge } from './NotificationBell';
import { MOBILE_BOTTOM_SECTIONS, SECTION_META } from './sections';

/**
 * Phone top app bar (< md): seal + current section, demo chip and a bell that opens the
 * notification centre. Sits under the status bar (safe-area aware).
 */
export function MobileTopBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const unread = useUnreadCount();
  const route = matchAppRoute(location.pathname);
  const title =
    route.section && route.section !== 'home'
      ? t(SECTION_META[route.section].labelKey)
      : t('app.shortName');

  return (
    <header
      className="sticky top-0 z-20 border-b bg-header pt-[env(safe-area-inset-top)] md:hidden"
      data-slot="mobile-top-bar"
    >
      <div className="flex h-14 items-center gap-2 px-3">
        <Link
          to={paths.home()}
          className="flex min-w-0 items-center gap-2.5 rounded-md p-1 focus-ring"
          aria-label={t('shell.nav.homeLink', { app: t('app.name') })}
        >
          <img
            src={BRAND_ASSETS.seal.src}
            width={32}
            height={32}
            alt=""
            className="size-8 shrink-0 object-contain"
          />
        </Link>
        <p className="min-w-0 flex-1 truncate font-heading text-lg font-semibold">{title}</p>
        <DemoChip className="max-w-36" />
        <Link
          to={paths.notifications()}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-md text-foreground focus-ring hover:bg-accent"
          aria-label={
            unread > 0
              ? t('shell.notifications.bellLabelUnread', { count: unread })
              : t('shell.notifications.bellLabel')
          }
        >
          <BellIcon aria-hidden="true" className="size-5" />
          <CountBadge count={unread} className="absolute top-1.5 right-1.5" />
        </Link>
      </div>
    </header>
  );
}

/**
 * Phone bottom navigation (< md): Home · News · Events · Chapter · More on navy, 56 px targets,
 * gold top indicator + bold label + aria-current on the active tab. Pages reached from More
 * (Resources, Administration…) keep "More" highlighted.
 */
export function MobileBottomNav() {
  const { t } = useTranslation();
  const policy = usePolicy();
  const location = useLocation();
  const items = policy.visibleNavItems('mobileBottom');
  const section = matchAppRoute(location.pathname).section;
  const moreActive = section !== null && !MOBILE_BOTTOM_SECTIONS.has(section);

  return (
    <nav
      aria-label={t('common.a11y.mobileNavigation')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      data-slot="mobile-bottom-nav"
    >
      <ul className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col">
        {items.map((item) => {
          return (
            <li key={item.id} className="flex">
              <NavLink
                to={item.path}
                end={item.id === 'home'}
                className={({ isActive }) => {
                  const active = item.id === 'more' ? isActive || moreActive : isActive;
                  return cn(
                    'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-[0.6875rem] leading-tight outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-sidebar-ring',
                    active
                      ? 'font-semibold text-sidebar-accent-foreground before:absolute before:top-0 before:left-1/2 before:h-[3px] before:w-10 before:-translate-x-1/2 before:rounded-b-sm before:bg-sidebar-primary'
                      : 'font-medium text-sidebar-muted-foreground',
                  );
                }}
              >
                <NavIcon id={item.id} className="size-[1.375rem]" />
                <span className="max-w-full truncate">
                  {t(item.shortLabelKey ?? item.labelKey)}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
