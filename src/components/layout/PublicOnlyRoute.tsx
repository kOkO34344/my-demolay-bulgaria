import { useEffect } from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router';

import { safeRedirectTarget } from '@/app/routes';
import { useAuth } from '@/auth';
import { FullPageLoader } from '@/components/common/LoadingSkeletons';
import { paths } from '@/lib/routes';

import { setSigningOut, useIsSigningOut } from './signOutState';
import { useRouteDocumentTitle } from './useRouteDocumentTitle';

/**
 * Layout route for signed-out pages (login, password recovery). Signed-in visitors — including the
 * moment a sign-in succeeds — are sent to the validated `?redirect=` target or Home.
 */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const [params] = useSearchParams();
  const signingOut = useIsSigningOut();
  useRouteDocumentTitle();
  // A sign-out has arrived here signed out: done (see signOutState.ts).
  useEffect(() => {
    if (signingOut && status === 'anonymous') setSigningOut(false);
  }, [signingOut, status]);
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') {
    return <Navigate to={safeRedirectTarget(params.get('redirect')) ?? paths.home()} replace />;
  }
  return <Outlet />;
}
