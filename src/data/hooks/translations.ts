import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  TranslationReviewInput,
  TranslationTask,
  TranslationTaskQuery,
  TranslationUpdateInput,
} from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Translation queue. Key: translations.tasks(query) */
export function useTranslationTasks(
  query: TranslationTaskQuery = {},
  options?: QueryOptions<TranslationTask[]>,
) {
  return useQuery({
    queryKey: queryKeys.translations.tasks(query),
    queryFn: () => repositories.translations.listTasks(query),
    placeholderData: (previous) => previous,
    ...options,
  });
}

function useTranslationCommand<V>(fn: (variables: V) => Promise<TranslationTask>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      invalidateDomains(client, ['translations', 'posts', 'events', 'resources', 'audit']),
  });
}

export const useUpdateTranslation = () =>
  useTranslationCommand((input: TranslationUpdateInput) =>
    repositories.translations.updateTranslation(input),
  );
export const useMarkTranslationReviewed = () =>
  useTranslationCommand((input: TranslationReviewInput) =>
    repositories.translations.markReviewed(input),
  );
