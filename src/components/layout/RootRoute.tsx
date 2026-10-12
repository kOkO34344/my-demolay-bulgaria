import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Outlet, ScrollRestoration, useRouteError } from 'react-router';

import { ErrorState, NotFoundState } from '@/components/common/ErrorState';

/** Data-router root: restores scroll per history entry (window scrolling) and renders the tree. */
export function RootRoute() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

/**
 * Last-resort router error element (an error escaped every route boundary, e.g. in a layout).
 * Full-page, translated, with a reload action — never a blank screen.
 */
export function RouterErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  return (
    <main id="main-content" className="min-h-dvh bg-background px-4 text-foreground">
      {isRouteErrorResponse(error) && error.status === 404 ? (
        <NotFoundState />
      ) : (
        <ErrorState
          variant="page"
          mapStatus={false}
          title={t('shell.errors.pageTitle')}
          description={t('shell.errors.appDescription')}
          onRetry={() => window.location.reload()}
        />
      )}
    </main>
  );
}
