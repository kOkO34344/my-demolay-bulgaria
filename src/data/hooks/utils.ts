import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import type { AppError } from '@/data/errors';

import { queryKeys, type QueryDomain } from './queryKeys';

/**
 * Extra options a query hook accepts (everything except key/fn). For id-based hooks, `enabled`
 * is ANDed with "id present".
 */
export type QueryOptions<T> = Omit<
  UseQueryOptions<T, AppError, T, QueryKey>,
  'queryKey' | 'queryFn'
>;

export async function invalidateDomains(
  client: QueryClient,
  domains: QueryDomain[],
): Promise<void> {
  await Promise.all(domains.map((d) => client.invalidateQueries({ queryKey: queryKeys[d].all })));
}

/** Returns a function that invalidates whole domains (e.g. ['posts', 'audit']). */
export function useInvalidate(): (domains: QueryDomain[]) => Promise<void> {
  const client = useQueryClient();
  return useCallback((domains: QueryDomain[]) => invalidateDomains(client, domains), [client]);
}
