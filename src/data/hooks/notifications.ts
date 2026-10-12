import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repositories } from '@/data/registry';
import type {
  BroadcastInput,
  ID,
  Notification,
  NotificationListQuery,
  NotificationPreferences,
} from '@/domain';
import { clock } from '@/lib/clock';

import { queryKeys } from './queryKeys';
import { invalidateDomains, type QueryOptions } from './utils';

/** Notification centre list. Key: notifications.list(query) */
export function useNotifications(
  query: NotificationListQuery = {},
  options?: QueryOptions<Notification[]>,
) {
  return useQuery({
    queryKey: queryKeys.notifications.list(query),
    queryFn: () => repositories.notifications.list(query),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/** Header bell badge. Key: notifications.unreadCount() */
export function useUnreadNotificationCount(options?: QueryOptions<number>) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => repositories.notifications.unreadCount(),
    ...options,
  });
}

/** Simulated email + in-app preferences. Key: notifications.preferences() */
export function useNotificationPreferences(options?: QueryOptions<NotificationPreferences>) {
  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => repositories.notifications.getPreferences(),
    ...options,
  });
}

/** Mark one notification read (optimistic list + badge update). */
export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: ID) => repositories.notifications.markRead(notificationId),
    onMutate: async (notificationId) => {
      await client.cancelQueries({ queryKey: queryKeys.notifications.all });
      const readAt = clock.nowIso();
      let changed = false;
      client.setQueriesData<Notification[]>(
        { queryKey: [...queryKeys.notifications.all, 'list'] },
        (old) =>
          old?.map((n) => {
            if (n.id !== notificationId || n.readAt) return n;
            changed = true;
            return { ...n, readAt };
          }),
      );
      if (changed) {
        client.setQueryData<number>(queryKeys.notifications.unreadCount(), (count) =>
          Math.max(0, (count ?? 1) - 1),
        );
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

/** Mark everything read (optimistic). */
export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => repositories.notifications.markAllRead(),
    onMutate: async () => {
      await client.cancelQueries({ queryKey: queryKeys.notifications.all });
      const readAt = clock.nowIso();
      client.setQueriesData<Notification[]>(
        { queryKey: [...queryKeys.notifications.all, 'list'] },
        (old) => old?.map((n) => (n.readAt ? n : { ...n, readAt })),
      );
      client.setQueryData<number>(queryKeys.notifications.unreadCount(), 0);
    },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useUpdateNotificationPreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      repositories.notifications.updatePreferences(preferences),
    onSuccess: (preferences) => {
      client.setQueryData(queryKeys.notifications.preferences(), preferences);
      return invalidateDomains(client, ['members']);
    },
  });
}

/** Chapter or national broadcast (notification.send.*). */
export function useBroadcastNotification() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: BroadcastInput) => repositories.notifications.broadcast(input),
    onSuccess: () => invalidateDomains(client, ['notifications', 'audit']),
  });
}
