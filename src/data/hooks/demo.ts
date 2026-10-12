import { useMutation, useQueryClient } from '@tanstack/react-query';

import { resetDemoData } from '@/data/store/db';
import { env } from '@/lib/env';

/**
 * "Reset demo data" (prototype only): restores the seeded state, keeps the session, then refetches
 * everything. No-op outside mock mode.
 */
export function useResetDemoData() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await Promise.resolve();
      if (env.dataSource === 'mock') resetDemoData({ keepSession: true });
    },
    onSuccess: () => client.resetQueries(),
  });
}
