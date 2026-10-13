import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type { ID, InvitationInput, InvitationPreview, InvitationView } from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Invitations in the subject's chapters. Key: invitations.list() */
export function useInvitations(options?: QueryOptions<InvitationView[]>) {
  return useQuery({
    queryKey: queryKeys.invitations.list(),
    queryFn: () => repositories.invitations.list(),
    ...options,
  });
}

/** Public preview behind an invitation link. Key: invitations.preview(token) */
export function useInvitationPreview(
  token: string | null | undefined,
  options?: QueryOptions<InvitationPreview>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.invitations.preview(token ?? ''),
    queryFn: () => repositories.invitations.preview(token ?? ''),
    enabled: !!token && (options?.enabled ?? true),
    retry: false,
  });
}

export function useCreateInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: InvitationInput) => repositories.invitations.create(input),
    onSuccess: () => invalidateDomains(client, ['invitations', 'audit']),
  });
}

export function useRevokeInvitation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: ID) => repositories.invitations.revoke(invitationId),
    onSuccess: () => invalidateDomains(client, ['invitations', 'audit']),
  });
}
