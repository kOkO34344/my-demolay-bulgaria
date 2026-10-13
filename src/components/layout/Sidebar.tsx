import { LogOutIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';

import { usePolicy, type NavGroup, type NavItem } from '@/auth';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BRAND_ASSETS } from '@/lib/brand';
import { useMediaQuery } from '@/lib/hooks';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { SidebarDemoPanel } from './DemoRoleSwitcher';
import { useSignOut, useUnreadCount } from './hooks';
import { NavIcon } from './NavIcon';
import { CountBadge } from './NotificationBell';

/**
 * Desktop/tablet navigation (md+). lg+: 280 px navy sidebar with labels and group headings (labels
 * wrap rather than truncate — Bulgarian labels such as „Управление на съдържанието“ are long).
 * md–lg (tablet): 76 px icon rail; labels stay in the accessible name and appear as tooltips.
 * Active item: gold edge indicator + raised surface + bold text + aria-current="page".
 */

/**
 * Item styles. The active state is styled from NavLink's own `aria-current="page"` (string class,
 * not a className function) so it survives Radix Slot merging when the rail wraps links in tooltips.
 */
const ITEM_CLASS = cn(
  'group/nav relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
  'h-11 justify-center lg:h-auto lg:min-h-10 lg:justify-start lg:px-3 lg:py-2 lg:text-left',
  'text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
  'aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-accent-foreground',
  'aria-[current=page]:before:absolute aria-[current=page]:before:top-1.5 aria-[current=page]:before:bottom-1.5 aria-[current=page]:before:-left-3 aria-[current=page]:before:w-1 aria-[current=page]:before:rounded-r-sm aria-[current=page]:before:bg-sidebar-primary',
);

function RailTooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarNavLink({
  item,
  label,
  badge,
  badgeLabel,
  isRail,
}: {
  item: NavItem;
  label: string;
  badge?: number;
  badgeLabel?: string;
  isRail: boolean;
}) {
  return (
    <li>
      <RailTooltip label={label} enabled={isRail}>
        <NavLink to={item.path} end={item.id === 'home'} className={ITEM_CLASS}>
          <span className="relative flex">
            <NavIcon id={item.id} className="size-5 shrink-0 lg:size-[1.125rem]" />
            {badge ? (
              <CountBadge count={badge} className="absolute -top-2 -right-2.5 lg:hidden" />
            ) : null}
          </span>
          <span className="sr-only lg:not-sr-only lg:flex-1 lg:leading-snug">{label}</span>
          {badge ? (
            <>
              <CountBadge count={badge} className="hidden lg:inline-flex" />
              {badgeLabel ? <span className="sr-only">({badgeLabel})</span> : null}
            </>
          ) : null}
        </NavLink>
      </RailTooltip>
    </li>
  );
}

const GROUP_ORDER: NavGroup[] = ['main', 'workspace', 'account'];

export function Sidebar() {
  const { t } = useTranslation();
  const policy = usePolicy();
  const unread = useUnreadCount();
  const { signOut, isSigningOut } = useSignOut();
  const isWide = useMediaQuery('(min-width: 1024px)');
  const isRail = !isWide;
  const items = policy.visibleNavItems('sidebar');

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[4.75rem] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex lg:w-[17.5rem]"
      data-slot="sidebar"
    >
      <Link
        to={paths.home()}
        className="flex h-16 shrink-0 items-center justify-center gap-3 border-b border-sidebar-border px-3 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-ring lg:justify-start lg:px-5"
      >
        <img
          src={BRAND_ASSETS.seal.src}
          width={40}
          height={40}
          alt=""
          className="size-10 shrink-0 object-contain"
        />
        <span className="sr-only flex-col leading-tight lg:not-sr-only lg:flex">
          <span className="text-[1.0625rem] font-bold text-white">{t('app.name')}</span>
          <span className="text-xs text-sidebar-muted-foreground">{t('app.subtitle')}</span>
        </span>
      </Link>

      <nav
        aria-label={t('common.a11y.mainNavigation')}
        className="flex-1 [scrollbar-width:thin] overflow-y-auto px-3 py-4"
      >
        {GROUP_ORDER.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;
          const headingId = `sidebar-group-${group}`;
          return (
            <div key={group} className="mb-4 last:mb-0">
              {group === 'main' ? null : (
                <>
                  <div
                    aria-hidden="true"
                    className={cn(
                      'mx-1 mb-3 h-px bg-sidebar-border',
                      group === 'workspace' && 'lg:hidden',
                    )}
                  />
                  <p
                    id={headingId}
                    className={cn(
                      'sr-only',
                      group === 'workspace' &&
                        'lg:not-sr-only lg:mb-1.5 lg:block lg:px-3 lg:text-xs lg:font-medium lg:text-sidebar-muted-foreground',
                    )}
                  >
                    {t(`nav.groups.${group}`)}
                  </p>
                </>
              )}
              <ul
                className="flex flex-col gap-0.5"
                aria-labelledby={group === 'main' ? undefined : headingId}
              >
                {groupItems.map((item) => (
                  <SidebarNavLink
                    key={item.id}
                    item={item}
                    label={t(item.labelKey)}
                    isRail={isRail}
                    badge={item.id === 'notifications' ? unread : undefined}
                    badgeLabel={
                      item.id === 'notifications' && unread > 0
                        ? t('common.a11y.unreadNotifications', { count: unread })
                        : undefined
                    }
                  />
                ))}
                {group === 'account' ? (
                  <li>
                    <RailTooltip label={t('nav.signOut')} enabled={isRail}>
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        disabled={isSigningOut}
                        className={cn(ITEM_CLASS, 'w-full')}
                      >
                        <LogOutIcon
                          aria-hidden="true"
                          className="size-5 shrink-0 lg:size-[1.125rem]"
                        />
                        <span className="sr-only lg:not-sr-only">{t('nav.signOut')}</span>
                      </button>
                    </RailTooltip>
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="hidden lg:block">
        <SidebarDemoPanel />
      </div>
    </aside>
  );
}
