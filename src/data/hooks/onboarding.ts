import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  AudienceInsights,
  AudienceInsightsQuery,
  OnboardingAnswers,
  OnboardingStatus,
} from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** The signed-in person's questionnaire. Key: onboarding.mine() */
export function useMyOnboarding(options?: QueryOptions<OnboardingStatus>) {
  return useQuery({
    queryKey: queryKeys.onboarding.mine(),
    queryFn: () => repositories.onboarding.mine(),
    staleTime: 5 * 60_000,
    ...options,
  });
}

function useOnboardingCommand<V>(fn: (variables: V) => Promise<OnboardingStatus>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (status) => {
      client.setQueryData(queryKeys.onboarding.mine(), status);
      return invalidateDomains(client, ['onboarding']);
    },
  });
}

export const useSubmitOnboarding = () =>
  useOnboardingCommand((answers: OnboardingAnswers) => repositories.onboarding.submit(answers));

export const useSkipOnboarding = () =>
  useOnboardingCommand((_: void) => repositories.onboarding.skip());

/** Totals for event planners. Key: onboarding.insights(query) */
export function useAudienceInsights(
  query: AudienceInsightsQuery,
  options?: QueryOptions<AudienceInsights>,
) {
  return useQuery({
    queryKey: queryKeys.onboarding.insights(query),
    queryFn: () => repositories.onboarding.insights(query),
    ...options,
  });
}
