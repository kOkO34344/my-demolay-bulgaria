import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  CurrentMember,
  DirectoryEntry,
  ID,
  InAppMessageView,
  MemberDetail,
  MemberListQuery,
  MemberStatusChangeInput,
  MemberSummary,
  OwnProfileUpdate,
  Paginated,
  SendMessageInput,
} from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** The signed-in member's own profile. Key: members.me() */
export function useCurrentMember(options?: QueryOptions<CurrentMember>) {
  return useQuery({
    queryKey: queryKeys.members.me(),
    queryFn: () => repositories.members.getMe(),
    ...options,
  });
}

/** Staff roster (paginated). Key: members.list(query) */
export function useMembers(
  query: MemberListQuery = {},
  options?: QueryOptions<Paginated<MemberSummary>>,
) {
  return useQuery({
    queryKey: queryKeys.members.list(query),
    queryFn: () => repositories.members.list(query),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/** Staff view of one member (private fields only when authorised). Key: members.detail(userId) */
export function useMember(userId: ID | null | undefined, options?: QueryOptions<MemberDetail>) {
  return useQuery({
    ...options,
    queryKey: queryKeys.members.detail(userId ?? ''),
    queryFn: () => repositories.members.get(userId ?? ''),
    enabled: !!userId && (options?.enabled ?? true),
  });
}

/** Privacy-safe chapter directory. Key: members.directory(chapterId) */
export function useDirectory(
  chapterId: ID | null | undefined,
  options?: QueryOptions<DirectoryEntry[]>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.members.directory(chapterId ?? ''),
    queryFn: () => repositories.members.directory(chapterId ?? ''),
    enabled: !!chapterId && (options?.enabled ?? true),
  });
}

/** In-app messages of the signed-in member. Key: members.messages() */
export function useMyMessages(options?: QueryOptions<InAppMessageView[]>) {
  return useQuery({
    queryKey: queryKeys.members.messages(),
    queryFn: () => repositories.members.listMyMessages(),
    ...options,
  });
}

/** Updates permitted own-profile fields; refreshes the session's member too. */
export function useUpdateOwnProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: OwnProfileUpdate) => repositories.members.updateOwnProfile(input),
    onSuccess: (member) => {
      client.setQueryData(queryKeys.members.me(), member);
      return invalidateDomains(client, ['auth', 'members', 'audit']);
    },
  });
}

/** Activate / suspend an account. */
export function useSetMemberStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberStatusChangeInput) => repositories.members.setStatus(input),
    onSuccess: (detail) => {
      client.setQueryData(queryKeys.members.detail(detail.userId), detail);
      return invalidateDomains(client, ['members', 'chapters', 'audit']);
    },
  });
}

export function useSendMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) => repositories.members.sendMessage(input),
    onSuccess: () => invalidateDomains(client, ['members', 'notifications']),
  });
}

export function useMarkMessageRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (messageId: ID) => repositories.members.markMessageRead(messageId),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.members.messages() }),
  });
}
