import { Navigate } from 'react-router';

import { RequireAuth, useAuth } from '@/auth';
import { FullPageLoader } from '@/components/common/LoadingSkeletons';
import { paths } from '@/lib/routes';

import { AppLayout } from './AppLayout';
import { OnboardingGate } from './OnboardingGate';
import { useIsSigningOut } from './signOutState';

/**
 * Layout route for every signed-in page: core `RequireAuth` (signed-out visitors →
 * `/login?redirect=<page>`) around the app frame. After a deliberate sign-out it goes to a clean
 * `/login` instead, so the next person to sign in is not sent to the previous user's page.
 * New accounts are sent to the onboarding questionnaire once (OnboardingGate).
 */
export function ProtectedLayout() {
  const { status } = useAuth();
  const signingOut = useIsSigningOut();
  if (signingOut && status === 'anonymous') return <Navigate to={paths.login()} replace />;
  return (
    <RequireAuth loadingFallback={<FullPageLoader />}>
      <OnboardingGate>
        <AppLayout />
      </OnboardingGate>
    </RequireAuth>
  );
}
