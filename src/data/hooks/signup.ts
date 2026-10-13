import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type { ID, SignupInput, SignupOptions, SignupVerifyInput } from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Chapters and consent versions for the public signup form. Key: signup.options() */
export function useSignupOptions(options?: QueryOptions<SignupOptions>) {
  return useQuery({
    queryKey: queryKeys.signup.options(),
    queryFn: () => repositories.signup.options(),
    staleTime: 5 * 60_000,
    ...options,
  });
}

/** Submits the details; resolves with the (simulated) email and phone codes. */
export function useStartSignup() {
  return useMutation({ mutationFn: (input: SignupInput) => repositories.signup.start(input) });
}

export function useResendSignupCodes() {
  return useMutation({ mutationFn: (signupId: ID) => repositories.signup.resend(signupId) });
}

/** Confirms both codes; the account is then pending administrator verification. */
export function useVerifySignup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupVerifyInput) => repositories.signup.verify(input),
    onSuccess: () => invalidateDomains(client, ['verifications', 'members', 'notifications']),
  });
}
