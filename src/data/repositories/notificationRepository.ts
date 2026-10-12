import type {
  BroadcastInput,
  BroadcastResult,
  ID,
  Notification,
  NotificationListQuery,
  NotificationPreferences,
} from '@/domain';

/** In-app notifications and (simulated) email preferences. No real emails, no browser push prompts. */
export interface NotificationRepository {
  /** GET /api/v1/notifications?filter=all|unread&category=&limit= — newest first. */
  list(query?: NotificationListQuery): Promise<Notification[]>;

  /** GET /api/v1/notifications/unread-count */
  unreadCount(): Promise<number>;

  /** POST /api/v1/notifications/{notification_id}/read */
  markRead(notificationId: ID): Promise<void>;

  /** POST /api/v1/notifications/read-all */
  markAllRead(): Promise<void>;

  /** GET /api/v1/members/me/notification-preferences */
  getPreferences(): Promise<NotificationPreferences>;

  /** PUT /api/v1/members/me/notification-preferences */
  updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences>;

  /**
   * POST /api/v1/notifications/broadcast — notification.send.chapter (chapter in scope) or
   * notification.send.national. Emails are simulated (counted, never sent).
   */
  broadcast(input: BroadcastInput): Promise<BroadcastResult>;
}
