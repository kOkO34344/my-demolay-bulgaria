import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  AnnouncementFeedQuery,
  AnnouncementInput,
  AnnouncementView,
  ID,
  ManagedAnnouncementQuery,
} from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Member news feed (published + visible). Key: posts.feed(query) */
export function useFeed(
  query: AnnouncementFeedQuery = {},
  options?: QueryOptions<AnnouncementView[]>,
) {
  return useQuery({
    queryKey: queryKeys.posts.feed(query),
    queryFn: () => repositories.posts.list(query),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/** Management list (any status in scope). Key: posts.managed(query) */
export function useManagedPosts(
  query: ManagedAnnouncementQuery = {},
  options?: QueryOptions<AnnouncementView[]>,
) {
  return useQuery({
    queryKey: queryKeys.posts.managed(query),
    queryFn: () => repositories.posts.listManaged(query),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/** One announcement. Key: posts.detail(postId) */
export function usePost(postId: ID | null | undefined, options?: QueryOptions<AnnouncementView>) {
  return useQuery({
    ...options,
    queryKey: queryKeys.posts.detail(postId ?? ''),
    queryFn: () => repositories.posts.get(postId ?? ''),
    enabled: !!postId && (options?.enabled ?? true),
  });
}

/** Related announcements. Key: posts.related(postId) */
export function useRelatedPosts(
  postId: ID | null | undefined,
  options?: QueryOptions<AnnouncementView[]>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.posts.related(postId ?? ''),
    queryFn: () => repositories.posts.getRelated(postId ?? ''),
    enabled: !!postId && (options?.enabled ?? true),
  });
}

/** After any write: cache the returned post and refresh dependent domains. */
function onPostChanged(client: QueryClient, post: AnnouncementView): Promise<void> {
  client.setQueryData(queryKeys.posts.detail(post.id), post);
  return invalidateDomains(client, ['posts', 'notifications', 'audit', 'translations', 'chapters']);
}

function usePostCommand<V>(fn: (variables: V) => Promise<AnnouncementView>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (post) => onPostChanged(client, post),
  });
}

/** Creates a draft. */
export const useCreatePost = () =>
  usePostCommand((input: AnnouncementInput) => repositories.posts.create(input));
export const useUpdatePost = () =>
  usePostCommand(({ postId, input }: { postId: ID; input: AnnouncementInput }) =>
    repositories.posts.update(postId, input),
  );
export const useSubmitPost = () =>
  usePostCommand((postId: ID) => repositories.posts.submit(postId));
export const useWithdrawPost = () =>
  usePostCommand((postId: ID) => repositories.posts.withdraw(postId));
export const usePublishPost = () =>
  usePostCommand((postId: ID) => repositories.posts.publish(postId));
export const useReturnPostToDraft = () =>
  usePostCommand(({ postId, note }: { postId: ID; note: string }) =>
    repositories.posts.returnToDraft(postId, note),
  );
export const useArchivePost = () =>
  usePostCommand((postId: ID) => repositories.posts.archive(postId));
export const useRestorePost = () =>
  usePostCommand((postId: ID) => repositories.posts.restore(postId));

/** Marks a post read (optimistic: flips isRead on the cached detail and feeds). */
export function useMarkPostRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (postId: ID) => repositories.posts.markRead(postId),
    onMutate: (postId) => {
      client.setQueryData<AnnouncementView>(queryKeys.posts.detail(postId), (old) =>
        old ? { ...old, isRead: true } : old,
      );
      client.setQueriesData<AnnouncementView[]>(
        { queryKey: [...queryKeys.posts.all, 'feed'] },
        (old) => old?.map((p) => (p.id === postId ? { ...p, isRead: true } : p)),
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.posts.all }),
  });
}
