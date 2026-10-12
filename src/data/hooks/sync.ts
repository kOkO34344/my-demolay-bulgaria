import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  ID,
  IntegrationStatus,
  ResolveSyncExceptionInput,
  SyncException,
  SyncExceptionQuery,
  SyncJob,
  SyncJobDetail,
} from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

const POLL_MS = 700;
const isActive = (job: SyncJob | undefined): boolean =>
  job?.status === 'queued' || job?.status === 'running';

/** Key: sync.status() */
export function useIntegrationStatus(options?: QueryOptions<IntegrationStatus>) {
  return useQuery({
    queryKey: queryKeys.sync.status(),
    queryFn: () => repositories.sync.getStatus(),
    ...options,
  });
}

/** Sync history; polls while a job is running. Key: sync.jobs() */
export function useSyncJobs(options?: QueryOptions<SyncJob[]>) {
  return useQuery({
    queryKey: queryKeys.sync.jobs(),
    queryFn: () => repositories.sync.listJobs(),
    refetchInterval: (query) => (query.state.data?.some(isActive) ? POLL_MS : false),
    ...options,
  });
}

/** One job with result; polls until finished. Key: sync.job(jobId) */
export function useSyncJob(jobId: ID | null | undefined, options?: QueryOptions<SyncJobDetail>) {
  return useQuery({
    ...options,
    queryKey: queryKeys.sync.job(jobId ?? ''),
    queryFn: () => repositories.sync.getJob(jobId ?? ''),
    enabled: !!jobId && (options?.enabled ?? true),
    refetchInterval: (query) => (isActive(query.state.data?.job) ? POLL_MS : false),
  });
}

/** Key: sync.exceptions(query) */
export function useSyncExceptions(
  query: SyncExceptionQuery = {},
  options?: QueryOptions<SyncException[]>,
) {
  return useQuery({
    queryKey: queryKeys.sync.exceptions(query),
    queryFn: () => repositories.sync.listExceptions(query),
    ...options,
  });
}

/** Starts a simulated sync; returns the queued job (poll it with useSyncJob). */
export function useRunDemoSync() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.sync.runDemoSync(),
    onSuccess: () => invalidateDomains(client, ['sync', 'audit']),
  });
}

export function useResolveSyncException() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: ID; input: ResolveSyncExceptionInput }) =>
      repositories.sync.resolveException(id, input),
    onSuccess: () => invalidateDomains(client, ['sync', 'roles', 'members', 'audit']),
  });
}

export function useIgnoreSyncException() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: ID; note: string }) =>
      repositories.sync.ignoreException(id, note),
    onSuccess: () => invalidateDomains(client, ['sync', 'audit']),
  });
}
