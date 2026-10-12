import { useQuery } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type { AuditLogEntryView, AuditQuery, EntityType, ID, Paginated } from '@/domain';

import { queryKeys } from './queryKeys';
import { type QueryOptions } from './utils';

/** Scope-filtered audit log (paginated). Key: audit.list(query) */
export function useAuditLog(
  query: AuditQuery = {},
  options?: QueryOptions<Paginated<AuditLogEntryView>>,
) {
  return useQuery({
    queryKey: queryKeys.audit.list(query),
    queryFn: () => repositories.audit.list(query),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/** Audit trail of one entity. Key: audit.entity(entityType, entityId) */
export function useEntityAudit(
  entityType: EntityType,
  entityId: ID | null | undefined,
  options?: QueryOptions<AuditLogEntryView[]>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.audit.entity(entityType, entityId ?? ''),
    queryFn: () => repositories.audit.forEntity(entityType, entityId ?? ''),
    enabled: !!entityId && (options?.enabled ?? true),
  });
}

/** Actions by or about a member. Key: audit.member(userId) */
export function useMemberAudit(
  userId: ID | null | undefined,
  options?: QueryOptions<AuditLogEntryView[]>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.audit.member(userId ?? ''),
    queryFn: () => repositories.audit.forMember(userId ?? ''),
    enabled: !!userId && (options?.enabled ?? true),
  });
}
