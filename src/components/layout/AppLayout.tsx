import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';

import { matchAppRoute } from '@/app/routes';
import { useAuth } from '@/auth';
import { cn } from '@/lib/utils';

import { Header } from './Header';
import { useRouteFocus } from './hooks';
import { MobileBottomNav, MobileTopBar } from './MobileNav';
import { OfflineBanner } from './OfflineBanner';
import { Sidebar } from './Sidebar';
import { SkipLink } from './SkipLink';
import { useRouteDocumentTitle } from './useRouteDocumentTitle';

/** Sections whose pages are dense tables and may use the full width. */
const WIDE_SECTIONS = new Set(['admin', 'members', 'content']);

/**
 * Document scroll padding while the app frame is mounted, so focused or scrolled-to elements are never
 * hidden under the sticky header / mobile top bar or the fixed mobile bottom nav (WCAG 2.2 SC 2.4.11).
 */
const SCROLL_PADDING_CLASSES = [
  'scroll-pt-[calc(4.5rem+env(safe-area-inset-top))]',
  'scroll-pb-[calc(5.5rem+env(safe-area-inset-bottom))]',
  'md:scroll-pb-6',
];

/**
 * Authenticated application frame.
 *  - < md: top app bar + bottom navigation (dedicated mobile experience).
 *  - md–lg: icon-rail sidebar + header. lg+: full navy sidebar + header.
 *  - Landmarks: header(s), nav "Main navigation" / "Primary", main#main-content.
 *  - Route title, focus-to-h1 on navigation, offline banner, skip link, scroll padding for the bars.
 * Render pages through <Outlet/> (router) or `children` (tests).
 */
export function AppLayout({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const { isDemoMode } = useAuth();
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const section = matchAppRoute(location.pathname).section;
  const isWide = section !== null && WIDE_SECTIONS.has(section);

  useRouteDocumentTitle();
  useRouteFocus(mainRef);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(...SCROLL_PADDING_CLASSES);
    return () => root.classList.remove(...SCROLL_PADDING_CLASSES);
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SkipLink />
      <Sidebar />
      <div className="flex min-h-dvh flex-col md:pl-[4.75rem] lg:pl-[17.5rem]">
        <MobileTopBar />
        <Header />
        <OfflineBanner />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] outline-none sm:px-6 md:px-8 md:pt-8 md:pb-12"
        >
          <div className={cn('mx-auto w-full', isWide ? 'max-w-[90rem]' : 'max-w-6xl')}>
            {children ?? <Outlet />}
          </div>
        </main>
        {isDemoMode ? (
          <footer className="hidden border-t px-8 py-4 text-xs text-muted-foreground md:block">
            <p className={cn('mx-auto w-full', isWide ? 'max-w-[90rem]' : 'max-w-6xl')}>
              {t('shell.footer.prototypeNotice')}
            </p>
          </footer>
        ) : null}
      </div>
      <MobileBottomNav />
    </div>
  );
}
