import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useMyOnboarding } from '@/data/hooks';
import { paths, ROUTE_PATTERNS } from '@/lib/routes';

/**
 * Sends a signed-in person to the onboarding questionnaire once, after their first sign-in, and
 * back to the page they asked for afterwards. "Later" (or completing it) stops the redirect. While
 * the status loads the page renders normally, so nothing is blocked if the request fails.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data } = useMyOnboarding();
  const onQuestionnaire = location.pathname === ROUTE_PATTERNS.onboarding;
  if (data?.state === 'not_started' && !onQuestionnaire) {
    const here = `${location.pathname}${location.search}`;
    return <Navigate to={paths.onboarding(here === '/' ? undefined : here)} replace />;
  }
  return children;
}
