import type {
  EntityType,
  ID,
  ISODateTime,
  LocalizedMessage,
  LocalizedText,
  PersonRef,
} from './common';

export const NOTIFICATION_CATEGORIES = [
  'announcements',
  'events',
  'resources',
  'chapter',
  'approvals',
  'account',
  'system',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotificationLink {
  /** In-app path, e.g. "/news/a-104" (see src/lib/routes.ts `paths`). */
  to: string;
  entityType: EntityType;
  entityId: ID;
}

/** In-app notification for one user. Title/body render via the i18n message formatter. */
export interface Notification {
  id: ID;
  userId: ID;
  category: NotificationCategory;
  title: LocalizedMessage;
  body: LocalizedMessage;
  link: NotificationLink | null;
  actorId: ID | null;
  createdAt: ISODateTime;
  readAt: ISODateTime | null;
}

export interface ChannelPreference {
  inApp: boolean;
  /** Simulated — no email is ever sent by the prototype. */
  email: boolean;
}

export const DIGEST_FREQUENCIES = ['off', 'daily', 'weekly'] as const;
export type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number];

export interface NotificationPreferences {
  categories: Record<NotificationCategory, ChannelPreference>;
  /** Simulated email digest. */
  digest: DigestFrequency;
}

export interface NotificationListQuery {
  filter?: 'all' | 'unread';
  category?: NotificationCategory | 'all';
  limit?: number;
}

export type BroadcastAudience = { scope: 'national' } | { scope: 'chapter'; chapterId: ID };

export interface BroadcastInput {
  audience: BroadcastAudience;
  category: NotificationCategory;
  title: LocalizedText;
  body: LocalizedText;
  link: NotificationLink | null;
}

export interface BroadcastResult {
  recipientCount: number;
  /** Recipients whose preferences would have produced a (simulated) email. */
  simulatedEmailCount: number;
}

/** Privacy-preserving member-to-member message: neither side ever sees the other's contact data. */
export interface InAppMessage {
  id: ID;
  fromUserId: ID;
  toUserId: ID;
  subject: string;
  body: string;
  createdAt: ISODateTime;
  readAt: ISODateTime | null;
}

export interface InAppMessageView extends InAppMessage {
  from: PersonRef;
  to: PersonRef;
  direction: 'inbound' | 'outbound';
}

export interface SendMessageInput {
  toUserId: ID;
  subject: string;
  body: string;
}
