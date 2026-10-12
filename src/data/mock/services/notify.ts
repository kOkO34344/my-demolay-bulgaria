import { db } from '@/data/store';
import type {
  ID,
  LocalizedMessage,
  Notification,
  NotificationCategory,
  NotificationLink,
} from '@/domain';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';

/**
 * Notification side effects (mock equivalent of the backend's notification service). In-app
 * notifications respect each recipient's per-category in-app preference; email is SIMULATED — it is
 * only counted, never sent.
 */

export interface NotifyInput {
  category: NotificationCategory;
  title: LocalizedMessage;
  body: LocalizedMessage;
  link: NotificationLink | null;
  actorId: ID | null;
}

export interface NotifyResult {
  /** Distinct, existing recipients that were targeted. */
  recipientCount: number;
  /** In-app notifications actually created (in-app preference on). */
  createdCount: number;
  /** Recipients whose email preference for the category is on (simulated). */
  simulatedEmailCount: number;
}

/** Creates in-app notifications for `recipientIds` (deduplicated; the actor is never notified). */
export function notifyUsers(recipientIds: readonly ID[], input: NotifyInput): NotifyResult {
  const result: NotifyResult = { recipientCount: 0, createdCount: 0, simulatedEmailCount: 0 };
  const at = clock.nowIso();
  db.transaction(() => {
    for (const userId of [...new Set(recipientIds)].sort()) {
      if (userId === input.actorId) continue;
      const member = db.get('members', userId);
      if (!member) continue;
      result.recipientCount += 1;
      const preference = member.notificationPreferences.categories[input.category];
      if (preference.email) result.simulatedEmailCount += 1;
      if (!preference.inApp) continue;
      const notification: Notification = {
        id: createId('ntf'),
        userId,
        category: input.category,
        title: input.title,
        body: input.body,
        link: input.link,
        actorId: input.actorId,
        createdAt: at,
        readAt: null,
      };
      db.upsert('notifications', notification);
      result.createdCount += 1;
    }
  });
  return result;
}
