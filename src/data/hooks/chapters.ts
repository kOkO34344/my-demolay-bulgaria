import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type { Chapter, ChapterDetail, ChapterInput, ChapterSummary, ID } from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** All chapters. Key: chapters.list() */
export function useChapters(options?: QueryOptions<Chapter[]>) {
  return useQuery({
    queryKey: queryKeys.chapters.list(),
    queryFn: () => repositories.chapters.list(),
    staleTime: 5 * 60_000,
    ...options,
  });
}

/** One chapter with leaders. Key: chapters.detail(chapterId) */
export function useChapter(
  chapterId: ID | null | undefined,
  options?: QueryOptions<ChapterDetail>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.chapters.detail(chapterId ?? ''),
    queryFn: () => repositories.chapters.get(chapterId ?? ''),
    enabled: !!chapterId && (options?.enabled ?? true),
  });
}

/** Multi-chapter operational summaries. Key: chapters.summaries() */
export function useChapterSummaries(options?: QueryOptions<ChapterSummary[]>) {
  return useQuery({
    queryKey: queryKeys.chapters.summaries(),
    queryFn: () => repositories.chapters.summaries(),
    ...options,
  });
}

export function useCreateChapter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ChapterInput) => repositories.chapters.create(input),
    onSuccess: () => invalidateDomains(client, ['chapters', 'audit']),
  });
}

export function useUpdateChapter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, input }: { chapterId: ID; input: ChapterInput }) =>
      repositories.chapters.update(chapterId, input),
    onSuccess: () => invalidateDomains(client, ['chapters', 'audit']),
  });
}
