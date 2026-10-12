import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  LoginInput,
  PasswordChangeInput,
  PasswordResetInput,
  PasswordResetRequestInput,
  Role,
  Session,
} from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

const isNotAuthQuery = (key: readonly unknown[]): boolean => key[1] !== 'auth';

/** Drops every cached query except the session (used on sign-in / sign-out). */
function dropUserData(client: QueryClient): void {
  client.removeQueries({ predicate: (q) => isNotAuthQuery(q.queryKey) });
}

/** Current session (null when signed out). Key: queryKeys.auth.session(). Prefer `useAuth()` in UI. */
export function useSession(options?: QueryOptions<Session | null>) {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: () => repositories.auth.getSession(),
    staleTime: Infinity,
    ...options,
  });
}

/** Sign in. On success the session is cached and any previous user's data is dropped. */
export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => repositories.auth.login(input),
    onSuccess: (session) => {
      dropUserData(client);
      client.setQueryData(queryKeys.auth.session(), session);
    },
  });
}

/** Sign out. Clears all cached user data even if the request fails. */
export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.auth.logout(),
    onSettled: () => {
      client.setQueryData(queryKeys.auth.session(), null);
      dropUserData(client);
    },
  });
}

export function useChangePassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PasswordChangeInput) => repositories.auth.changePassword(input),
    onSuccess: () => invalidateDomains(client, ['audit']),
  });
}

/** Simulated recovery: resolves with the on-screen code (no email). */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (input: PasswordResetRequestInput) => repositories.auth.requestPasswordReset(input),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: PasswordResetInput) => repositories.auth.resetPassword(input),
  });
}

/**
 * Demo role switcher (prototype only). Updates the session subject immediately and resets every
 * other query so navigation, permissions and visible data refresh for the new role.
 */
export function useSwitchDemoRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (role: Role | null) => repositories.auth.switchDemoRole(role),
    onSuccess: async (session) => {
      client.setQueryData(queryKeys.auth.session(), session);
      await client.resetQueries({ predicate: (q) => isNotAuthQuery(q.queryKey) });
    },
  });
}
