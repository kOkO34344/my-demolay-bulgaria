import { describe, expect, it } from 'vitest';

import { ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import type { BroadcastInput, NotificationPreferences } from '@/domain';

import { auditEntries, notificationsOf, signInAs } from '../testing';

import { createMockNotificationRepository } from './notificationRepository';

const notifications = createMockNotificationRepository();

const broadcast = (audience: BroadcastInput['audience']): BroadcastInput => ({
  audience,
  category: 'chapter',
  title: { en: 'Hall closed on Friday', bg: 'Залата е затворена в петък' },
  body: { en: 'We meet online instead.', bg: 'Ще се срещнем онлайн.' },
  link: null,
});

describe('notification repository', () => {
  it('lists only the signed-in user’s notifications, newest first, with filters', async () => {
    signInAs('active_member');
    const list = await notifications.list();
    expect(list.length).toBeGreaterThanOrEqual(12);
    expect(list.every((n) => n.userId === 'u-member')).toBe(true);
    expect([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))).toEqual(list);
    const unread = await notifications.list({ filter: 'unread' });
    expect(unread.every((n) => n.readAt === null)).toBe(true);
    expect(await notifications.unreadCount()).toBe(unread.length);
    const events = await notifications.list({ category: 'events', limit: 2 });
    expect(events.length).toBeLessThanOrEqual(2);
    expect(events.every((n) => n.category === 'events')).toBe(true);
  });

  it('marks one or all as read; other people’s notifications are invisible', async () => {
    signInAs('active_member');
    const [first] = await notifications.list({ filter: 'unread' });
    await notifications.markRead(first?.id ?? '');
    expect(db.get('notifications', first?.id ?? '')?.readAt).not.toBeNull();
    const foreign = notificationsOf('u-admin')[0];
    await expect(notifications.markRead(foreign?.id ?? '')).rejects.toBeInstanceOf(NotFoundError);
    await notifications.markAllRead();
    expect(await notifications.unreadCount()).toBe(0);
    expect(notificationsOf('u-admin').some((n) => n.readAt === null)).toBe(true);
  });

  it('validates and stores notification preferences (email is simulated)', async () => {
    signInAs('active_member');
    const prefs = await notifications.getPreferences();
    const next: NotificationPreferences = {
      ...prefs,
      digest: 'daily',
      categories: { ...prefs.categories, events: { inApp: false, email: true } },
    };
    expect(await notifications.updatePreferences(next)).toEqual(next);
    expect(await notifications.getPreferences()).toEqual(next);
    await expect(
      notifications.updatePreferences({ ...next, digest: 'hourly' as 'daily' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('officers broadcast to their chapter; in-app preference is respected', async () => {
    db.update('members', 'u-s06', (m) => ({
      ...m,
      notificationPreferences: {
        ...m.notificationPreferences,
        categories: {
          ...m.notificationPreferences.categories,
          chapter: { inApp: false, email: true },
        },
      },
    }));
    signInAs('chapter_chairman');
    const activeInChapter = db
      .find('members', (m) => m.chapterId === 'ch-1')
      .filter((m) => db.get('users', m.userId)?.status === 'active' && m.userId !== 'u-advisor');
    const before = notificationsOf('u-s06').length;
    const result = await notifications.broadcast(
      broadcast({ scope: 'chapter', chapterId: 'ch-1' }),
    );
    expect(result.recipientCount).toBe(activeInChapter.length);
    expect(result.simulatedEmailCount).toBeGreaterThan(0);
    expect(notificationsOf('u-member')[0]?.title).toEqual({
      kind: 'text',
      text: { en: 'Hall closed on Friday', bg: 'Залата е затворена в петък' },
    });
    expect(notificationsOf('u-s06')).toHaveLength(before);
    expect(
      notificationsOf(db.find('members', (m) => m.chapterId === 'ch-2')[0]?.userId ?? '')[0]?.title,
    ).not.toEqual(notificationsOf('u-member')[0]?.title);
    expect(auditEntries('notification.broadcast')[0]).toMatchObject({
      actorId: 'u-advisor',
      chapterId: 'ch-1',
    });
  });

  it('national broadcasts need notification.send.national', async () => {
    signInAs('chapter_secretary');
    await expect(notifications.broadcast(broadcast({ scope: 'national' }))).rejects.toMatchObject({
      permission: 'notification.send.national',
    });
    await expect(
      notifications.broadcast(broadcast({ scope: 'chapter', chapterId: 'ch-2' })),
    ).rejects.toBeInstanceOf(ForbiddenError);
    signInAs('national_coordinator');
    const result = await notifications.broadcast(broadcast({ scope: 'national' }));
    expect(result.recipientCount).toBe(
      db.count('users', (u) => u.status === 'active') - 1, // everyone except the sender
    );
  });
});
