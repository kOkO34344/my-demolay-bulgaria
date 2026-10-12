import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';

import type { Permission } from '@/domain';
import { paths, type RouteId } from '@/lib/routes';

import { useAuth, usePolicy } from './hooks';

interface GuardProps {
  children: ReactNode;
  /** Shown while the session is loading (default: nothing). */
  loadingFallback?: ReactNode;
}

function useLoginRedirect(): string {
  const location = useLocation();
  return paths.login(`${location.pathname}${location.search}${location.hash}`);
}

/** Renders children only for a signed-in user; otherwise redirects to /login?redirect=… */
export function RequireAuth({ children, loadingFallback = null }: GuardProps) {
  const { status } = useAuth();
  const loginPath = useLoginRedirect();
  if (status === 'loading') return <>{loadingFallback}</>;
  if (status === 'anonymous') return <Navigate to={loginPath} replace />;
  return <>{children}</>;
}

/** Minimal accessible fallback; the shell passes its designed PermissionDenied state instead. */
function DefaultPermissionDenied() {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="permission-denied-title"
      className="mx-auto max-w-xl px-4 py-16 text-center"
    >
      <h1 id="permission-denied-title" className="text-2xl">
        {t('common.states.permissionDeniedTitle')}
      </h1>
      <p className="mt-2 text-muted-foreground">{t('common.states.permissionDeniedDescription')}</p>
    </section>
  );
}

interface RequirePermissionProps extends GuardProps {
  /** Check the route access table (preferred for route elements). */
  routeId?: RouteId;
  /** Require one permission (any scope). */
  permission?: Permission;
  /** Require at least one of these. */
  anyOf?: readonly Permission[];
  /** Rendered when signed in but not allowed. */
  deniedFallback?: ReactNode;
}

/**
 * Route guard: signed-out users are redirected to login; signed-in users without the permission
 * see `deniedFallback` (a permission-denied state), never a blank page.
 *   <RequirePermission routeId="admin" deniedFallback={<PermissionDenied />}>…</RequirePermission>
 */
export function RequirePermission({
  children,
  routeId,
  permission,
  anyOf,
  deniedFallback,
  loadingFallback = null,
}: RequirePermissionProps) {
  const { status } = useAuth();
  const policy = usePolicy();
  const loginPath = useLoginRedirect();
  if (status === 'loading') return <>{loadingFallback}</>;
  if (status === 'anonymous') return <Navigate to={loginPath} replace />;
  const allowed =
    (!routeId || policy.canAccessRoute(routeId)) &&
    (!permission || policy.can(permission)) &&
    (!anyOf || policy.canAny(anyOf));
  if (!allowed) return <>{deniedFallback ?? <DefaultPermissionDenied />}</>;
  return <>{children}</>;
}
