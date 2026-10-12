import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type { ID, ResourceInput, ResourceListQuery, ResourceView } from '@/domain';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Resource library. Key: resources.list(query) */
export function useResources(
  query: ResourceListQuery = {},
  options?: QueryOptions<ResourceView[]>,
) {
  return useQuery({
    queryKey: queryKeys.resources.list(query),
    queryFn: () => repositories.resources.list(query),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/** One resource. Key: resources.detail(resourceId) */
export function useResource(
  resourceId: ID | null | undefined,
  options?: QueryOptions<ResourceView>,
) {
  return useQuery({
    ...options,
    queryKey: queryKeys.resources.detail(resourceId ?? ''),
    queryFn: () => repositories.resources.get(resourceId ?? ''),
    enabled: !!resourceId && (options?.enabled ?? true),
  });
}

function useResourceCommand<V>(fn: (variables: V) => Promise<ResourceView>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (resource) => {
      client.setQueryData(queryKeys.resources.detail(resource.id), resource);
      return invalidateDomains(client, ['resources', 'audit', 'translations', 'notifications']);
    },
  });
}

export const useCreateResource = () =>
  useResourceCommand((input: ResourceInput) => repositories.resources.create(input));
export const useUpdateResource = () =>
  useResourceCommand(({ resourceId, input }: { resourceId: ID; input: ResourceInput }) =>
    repositories.resources.update(resourceId, input),
  );
export const useArchiveResource = () =>
  useResourceCommand((resourceId: ID) => repositories.resources.archive(resourceId));
export const useRestoreResource = () =>
  useResourceCommand((resourceId: ID) => repositories.resources.restore(resourceId));

/** Simulated download (nothing is transferred). */
export function useSimulateDownload() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: ID) => repositories.resources.simulateDownload(resourceId),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.resources.all }),
  });
}
