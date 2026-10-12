import { ChevronRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { matchAppRoute } from '@/app/routes';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { ThemeToggle } from '@/components/common/ThemeToggle';

import { DemoChip } from './DemoChip';
import { NotificationBell } from './NotificationBell';
import { SECTION_META } from './sections';
import { UserMenu } from './UserMenu';

/** Section › page trail for the current route (the page's own <h1> carries the full title). */
function HeaderBreadcrumb() {
  const { t } = useTranslation();
  const location = useLocation();
  const route = matchAppRoute(location.pathname);
  const section = route.section ? SECTION_META[route.section] : null;
  const pageLabel = t(route.titleKey);
  const sectionLabel = section ? t(section.labelKey) : null;
  const showSectionLink = section && section.labelKey !== route.titleKey;

  return (
    <nav aria-label={t('common.a11y.breadcrumb')} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {showSectionLink && sectionLabel ? (
          <>
            <li className="min-w-0 shrink">
              <Link
                to={section.path}
                className="block truncate rounded-sm text-muted-foreground underline-offset-4 focus-ring hover:text-foreground hover:underline"
              >
                {sectionLabel}
              </Link>
            </li>
            <li aria-hidden="true" className="flex text-muted-foreground">
              <ChevronRightIcon className="size-3.5" />
            </li>
          </>
        ) : null}
        <li className="min-w-0 truncate font-semibold text-foreground" aria-current="page">
          {pageLabel}
        </li>
      </ol>
    </nav>
  );
}

/**
 * Compact desktop/tablet header (md+): breadcrumb on the left; demo chip (tablet only — the sidebar
 * has the full demo panel on lg+), EN | BG, theme, notifications and account menu on the right.
 */
export function Header() {
  return (
    <header
      className="sticky top-0 z-20 hidden h-14 items-center gap-4 border-b bg-header px-4 md:flex lg:px-8"
      data-slot="app-header"
    >
      <div className="min-w-0 flex-1">
        <HeaderBreadcrumb />
      </div>
      <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
        <DemoChip className="lg:hidden" />
        <LanguageToggle />
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
