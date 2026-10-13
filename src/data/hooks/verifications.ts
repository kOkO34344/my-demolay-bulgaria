import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type { VerificationDecisionInput, VerificationRequestView } from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Pending accounts awaiting verification (account.verify). Key: verifications.list() */
export function useVerificationQueue(options?: QueryOptions<VerificationRequestView[]>) {
  return useQuery({
    queryKey: queryKeys.verifications.list(),
    queryFn: () => repositories.verifications.list(),
    ...options,
  });
}

/** Approve or reject a pending account. */
export function useDecideVerification() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: VerificationDecisionInput) => repositories.verifications.decide(input),
    onSuccess: () =>
      invalidateDomains(client, ['verifications', 'members', 'chapters', 'notifications', 'audit']),
  });
}
