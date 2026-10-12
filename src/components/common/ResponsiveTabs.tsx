import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface ResponsiveTab<V extends string> {
  value: V;
  /** Translated label. */
  label: string;
  /** Optional count badge (e.g. pending approvals). */
  count?: number;
  content: ReactNode;
  disabled?: boolean;
}

export interface ResponsiveTabsProps<V extends string> {
  tabs: ReadonlyArray<ResponsiveTab<V>>;
  value: V;
  onValueChange: (value: V) => void;
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
  /** Classes for the panels wrapper (spacing under the tab bar). */
  contentClassName?: string;
}

function CountPill({ count }: { count: number }) {
  return (
    <span className="rounded-sm bg-secondary px-1.5 text-xs font-semibold text-secondary-foreground tabular-nums-lining">
      {count}
    </span>
  );
}

/**
 * In-page tabs (Radix: arrow-key navigation, aria-selected, tabpanels). Underlined "line" style with
 * a hairline track; the list scrolls horizontally on narrow screens instead of wrapping. Keep the
 * selected tab in the URL (`?tab=`) when it should survive reloads.
 */
export function ResponsiveTabs<V extends string>({
  tabs,
  value,
  onValueChange,
  label,
  className,
  contentClassName,
}: ResponsiveTabsProps<V>) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        const match = tabs.find((tab) => tab.value === next);
        if (match) onValueChange(match.value);
      }}
      className={cn('gap-0', className)}
    >
      <div className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        <TabsList variant="line" aria-label={label} className="h-auto! justify-start gap-1 p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              className="h-10 flex-none rounded-none px-3 focus-ring-inset group-data-[orientation=horizontal]/tabs:after:bottom-0 pointer-coarse:h-11"
            >
              {tab.label}
              {tab.count !== undefined ? <CountPill count={tab.count} /> : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className={cn('pt-5', contentClassName)}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export interface LinkTab {
  to: string;
  /** Translated label. */
  label: string;
  /** Match the path exactly (default false: active for nested paths too). */
  end?: boolean;
  count?: number;
}

/**
 * Route-based tabs (sub-navigation such as Administration sections): a labelled <nav> of links with
 * aria-current="page", styled like ResponsiveTabs and horizontally scrollable on phones.
 */
export function LinkTabs({
  tabs,
  label,
  className,
}: {
  tabs: ReadonlyArray<LinkTab>;
  label: string;
  className?: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Keep the active tab visible when the strip scrolls horizontally (phones).
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={cn('-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0', className)}
    >
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'relative inline-flex h-10 items-center gap-1.5 px-3 text-sm whitespace-nowrap focus-ring-inset pointer-coarse:h-11',
                  'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0',
                  isActive
                    ? 'font-semibold text-foreground after:opacity-100'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
              {tab.count !== undefined ? <CountPill count={tab.count} /> : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
