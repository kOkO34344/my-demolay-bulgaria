import { Suspense, type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import type { AppRouteDefinition } from '@/app/routes';
import { RequirePermission } from '@/auth';
import { ErrorState, OfflineState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/LoadingSkeletons';
import { PermissionDenied } from '@/components/common/PermissionDenied';

/** Lazy chunk failed to download (offline, or a new deployment replaced the hashed file). */
function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch/i.test(
      error.message,
    )
  );
}

/** Route-level error boundary fallback: never a blank screen. */
export function RouteErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const { t } = useTranslation();
  if (isChunkLoadError(error)) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return <OfflineState variant="page" onRetry={resetErrorBoundary} />;
    }
    return (
      <ErrorState
        variant="page"
        title={t('shell.errors.updateTitle')}
        description={t('shell.errors.updateDescription')}
        mapStatus={false}
        onRetry={() => window.location.reload()}
      />
    );
  }
  return (
    <ErrorState
      variant="page"
      error={error}
      title={t('shell.errors.pageTitle')}
      description={t('shell.errors.pageDescription')}
      onRetry={resetErrorBoundary}
    />
  );
}

/**
 * Wraps every routed page: permission guard (core RequirePermission → designed PermissionDenied),
 * error boundary (reset on navigation) and Suspense with a layout-shaped skeleton.
 */
export function RouteView({
  route,
  children,
  fallback,
}: {
  route: AppRouteDefinition;
  children: ReactNode;
  /** Suspense fallback override (default: PageSkeleton shaped like the route). */
  fallback?: ReactNode;
}) {
  const location = useLocation();
  const content = (
    <ErrorBoundary FallbackComponent={RouteErrorFallback} resetKeys={[location.pathname]}>
      <Suspense fallback={fallback ?? <PageSkeleton variant={route.skeleton} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
  if (!route.access) return content;
  return 'routeId' in route.access ? (
    <RequirePermission routeId={route.access.routeId} deniedFallback={<PermissionDenied />}>
      {content}
    </RequirePermission>
  ) : (
    <RequirePermission anyOf={route.access.anyOf} deniedFallback={<PermissionDenied />}>
      {content}
    </RequirePermission>
  );
}
