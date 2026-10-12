import { can } from '@/auth/policy';
import { ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import type { NotificationRepository } from '@/data/repositories';
import { appendAudit, db, mockCall, requireSubject } from '@/data/store';
import { broadcastInputSchema, notificationPreferencesSchema } from '@/domain/schemas';
import type { BroadcastResult, ID, Notification, NotificationPreferences } from '@/domain';
import { clock } from '@/lib/clock';

import { msg, validateInput } from '../helpers';
import { notifyUsers } from '../services/notify';

/**
 * In-app notifications and (simulated) email preferences. Users only ever see and change their
 * own notifications; broadcasts need notification.send.chapter (chapter in scope) or
 * notification.send.national. No email is sent and no browser permission is requested.
 */

function ownNotification(userId: ID, notificationId: ID): Notification {
  const notification = db.get('notifications', notificationId);
  if (!notification || notification.userId !== userId) {
    throw new NotFoundError('notification', notificationId);
  }
  return notification;
}

export function createMockNotificationRepository(): NotificationRepository {
  return {
    list: (query = {}) =>
      mockCall((): Notification[] => {
        const subject = requireSubject();
        return db
          .find('notifications', (n) => n.userId === subject.userId)
          .filter((n) => query.filter !== 'unread' || !n.readAt)
          .filter((n) => !query.category || query.category === 'all' || n.category === query.category)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
          .slice(0, query.limit ?? undefined);
      }),

    unreadCount: () =>
      mockCall(() => {
        const subject = requireSubject();
        return db.count('notifications', (n) => n.userId === subject.userId && !n.readAt);
      }),

    markRead: (notificationId) =>
      mockCall(() => {
        const subject = requireSubject();
        const notification = ownNotification(subject.userId, notificationId);
        if (!notification.readAt) {
          db.update('notifications', notificationId, { readAt: clock.nowIso() });
        }
      }),

    markAllRead: () =>
      mockCall(() => {
        const subject = requireSubject();
        const now = clock.nowIso();
        db.transaction(() => {
          for (const n of db.find('notifications', (x) => x.userId === subject.userId && !x.readAt)) {
            db.update('notifications', n.id, { readAt: now });
          }
        });
      }),

    getPreferences: () =>
      mockCall((): NotificationPreferences => {
        const subject = requireSubject();
        return db.require('members', subject.userId, 'member').notificationPreferences;
      }),

    updatePreferences: (preferences) =>
      mockCall((): NotificationPreferences => {
        const subject = requireSubject();
        const data = validateInput(notificationPreferencesSchema, preferences);
        return db.update('members', subject.userId, { notificationPreferences: data }, 'member')
          .notificationPreferences;
      }),

    broadcast: (input) =>
      mockCall((): BroadcastResult => {
        const subject = requireSubject();
        const data = validateInput(broadcastInputSchema, input);
        let recipients: ID[];
        if (data.audience.scope === 'national') {
          if (!can(subject, 'notification.send.national')) {
            throw new ForbiddenError('permission_denied', 'notification.send.national');
          }
          recipients = db.find('users', (u) => u.status === 'active').map((u) => u.id);
        } else {
          const chapterId = data.audience.chapterId;
          if (!db.get('chapters', chapterId)) {
            throw new ValidationError({ 'audience.chapterId': 'messages.validation.unknownChapter' });
          }
          if (!can(subject, 'notification.send.chapter', { chapterId })) {
            throw new ForbiddenError('permission_denied', 'notification.send.chapter');
          }
          const active = new Set(db.find('users', (u) => u.status === 'active').map((u) => u.id));
          recipients = db
            .find('members', (m) => m.chapterId === chapterId && active.has(m.userId))
            .map((m) => m.userId);
        }
        const result = db.transaction(() => {
          const sent = notifyUsers(recipients, {
            category: data.category,
            title: { kind: 'text', text: data.title },
            body: { kind: 'text', text: data.body },
            link: data.link,
            actorId: subject.userId,
          });
          appendAudit(subject, {
            action: 'notification.broadcast',
            entityType: 'notification',
            entityId: `broadcast-${clock.now().getTime()}`,
            chapterId: data.audience.scope === 'chapter' ? data.audience.chapterId : null,
            summary: msg('messages.audit.broadcast', { title: data.title, count: sent.recipientCount }),
            metadata: {
              audience: data.audience.scope,
              category: data.category,
              recipients: sent.recipientCount,
              simulatedEmails: sent.simulatedEmailCount,
            },
          });
          return sent;
        });
        return {
          recipientCount: result.recipientCount,
          simulatedEmailCount: result.simulatedEmailCount,
        };
      }),
  };
}
