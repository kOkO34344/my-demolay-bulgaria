import { useCallback, useMemo, type ReactNode } from 'react';

import { ForbiddenError } from '@/data/errors';
import { useLogin, useLogout, useSession, useSwitchDemoRole } from '@/data/hooks/auth';
import type { DemoPersonaId, LoginInput } from '@/domain';

import { personaOfUser } from './demoCredentials';

import { AuthContext, type AuthContextValue, type AuthStatus } from './context';
import { isDemoModeEnabled } from './subject';

interface AuthProviderProps {
  children: ReactNode;
  /** Override demo mode (tests). Defaults to VITE_DEMO_MODE. */
  demoMode?: boolean;
}

/**
 * Session state for the whole app. Language and theme changes never touch it, so switching them
 * never logs the user out. Requires QueryClientProvider above it.
 */
export function AuthProvider({ children, demoMode }: AuthProviderProps) {
  const sessionQuery = useSession();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const switchMutation = useSwitchDemoRole();
  const isDemoMode = demoMode ?? isDemoModeEnabled();

  const session = sessionQuery.data ?? null;
  const status: AuthStatus = sessionQuery.isPending
    ? 'loading'
    : session
      ? 'authenticated'
      : 'anonymous';

  const { mutateAsync: loginAsync } = loginMutation;
  const { mutateAsync: logoutAsync } = logoutMutation;
  const { mutateAsync: switchAsync } = switchMutation;

  const login = useCallback((input: LoginInput) => loginAsync(input), [loginAsync]);
  const logout = useCallback(async () => {
    await logoutAsync();
  }, [logoutAsync]);
  const switchDemoRole = useCallback(
    (persona: DemoPersonaId | null) => {
      if (!isDemoMode) return Promise.reject(new ForbiddenError('demo_mode_disabled'));
      return switchAsync(persona);
    },
    [isDemoMode, switchAsync],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      member: session?.member ?? null,
      subject: session?.subject ?? null,
      actualPersona: session ? personaOfUser(session.user.id) : null,
      isDemoMode,
      demoOverride: isDemoMode ? (session?.demo.override ?? null) : null,
      login,
      logout,
      switchDemoRole,
      isLoggingIn: loginMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
      isSwitchingRole: switchMutation.isPending,
    }),
    [
      status,
      session,
      isDemoMode,
      login,
      logout,
      switchDemoRole,
      loginMutation.isPending,
      logoutMutation.isPending,
      switchMutation.isPending,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
