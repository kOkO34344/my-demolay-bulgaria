import { QueryClient } from '@tanstack/react-query';

import { isClientError } from '@/data/errors';

/**
 * Query defaults:
 *  - Typed 4xx-like errors (unauthorized, forbidden, not found, validation, conflict, rate limited)
 *    are never retried; other failures retry up to 2 times.
 *  - 30 s stale time; no refetch on window focus (keeps live demos stable).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
