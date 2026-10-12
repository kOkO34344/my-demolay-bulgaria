import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

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

/**
 * DATA agent (additive): a finished run changes roles, imported positions, exceptions, audit and
 * the admins' notifications, so refresh those caches when polling sees a job finish. The polled
 * job keys themselves are left alone (no refetch loop).
 */
function refreshAfterSyncFinished(client: QueryClient): void {
  void invalidateDomains(client, ['roles', 'members', 'notifications', 'audit', 'chapters']);
  void client.invalidateQueries({ queryKey: queryKeys.sync.status() });
  void client.invalidateQueries({ queryKey: [...queryKeys.sync.all, 'exceptions'] });
}

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
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.sync.jobs(),
    queryFn: async () => {
      const previous = client.getQueryData<SyncJob[]>(queryKeys.sync.jobs());
      const jobs = await repositories.sync.listJobs();
      if (previous?.some(isActive) && !jobs.some(isActive)) refreshAfterSyncFinished(client);
      return jobs;
    },
    refetchInterval: (query) => (query.state.data?.some(isActive) ? POLL_MS : false),
    ...options,
  });
}

/** One job with result; polls until finished. Key: sync.job(jobId) */
export function useSyncJob(jobId: ID | null | undefined, options?: QueryOptions<SyncJobDetail>) {
  const client = useQueryClient();
  return useQuery({
    ...options,
    queryKey: queryKeys.sync.job(jobId ?? ''),
    queryFn: async () => {
      const key = queryKeys.sync.job(jobId ?? '');
      const previous = client.getQueryData<SyncJobDetail>(key);
      const detail = await repositories.sync.getJob(jobId ?? '');
      if (isActive(previous?.job) && !isActive(detail.job)) refreshAfterSyncFinished(client);
      return detail;
    },
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
