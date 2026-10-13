import { z } from 'zod';

import { vmsg } from '@/i18n/validation';

import {
  ACCOUNT_STATUSES,
  ENTITY_TYPES,
  NOTIFICATION_CATEGORIES,
  DIGEST_FREQUENCIES,
  VERIFICATION_DECISIONS,
} from '@/domain';
import type { NotificationCategory } from '@/domain';

import {
  LIMITS,
  MIN_REASON_LENGTH,
  appPathSchema,
  idSchema,
  imageUrlSchema,
  localizedTextSchema,
  optionalText,
  requiredText,
} from './common';

/** Members, in-app messages and notification commands. */

/** Loose international phone format: digits, spaces, brackets, dashes, optional leading "+". */
export const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,19}$/;

/**
 * Own-profile update. Only bio, avatar, phone and privacy settings exist in the schema — anything
 * else (chapter, imported position, role, scope) is stripped, so it can never be changed by a member.
 */
export const ownProfileUpdateSchema = z.object({
  bio: optionalText(LIMITS.bio).nullable().optional(),
  avatarUrl: imageUrlSchema.nullable().optional(),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, { error: 'messages.validation.phoneFormat' })
    .nullable()
    .optional(),
  privacy: z
    .object({ showInDirectory: z.boolean().optional(), allowMessages: z.boolean().optional() })
    .optional(),
});

export const memberStatusChangeSchema = z.object({
  userId: idSchema,
  status: z.enum(ACCOUNT_STATUSES, { error: 'validation.selectOption' }),
  reason: requiredText(LIMITS.reason, MIN_REASON_LENGTH),
});

/** Verification decision: rejecting needs a reason (it is audited); approving does not. */
export const verificationDecisionSchema = z
  .object({
    userId: idSchema,
    decision: z.enum(VERIFICATION_DECISIONS, { error: 'validation.selectOption' }),
    reason: optionalText(LIMITS.reason),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'reject' && value.reason.length < MIN_REASON_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message:
          value.reason.length === 0
            ? 'validation.required'
            : vmsg('validation.tooShort', { count: MIN_REASON_LENGTH }),
      });
    }
  });

export const sendMessageSchema = z.object({
  toUserId: idSchema,
  subject: requiredText(LIMITS.messageSubject),
  body: requiredText(LIMITS.messageBody),
});

const channelPreferenceSchema = z.object({ inApp: z.boolean(), email: z.boolean() });

export const notificationPreferencesSchema = z.object({
  categories: z.object(
    Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, channelPreferenceSchema])) as Record<
      NotificationCategory,
      typeof channelPreferenceSchema
    >,
  ),
  digest: z.enum(DIGEST_FREQUENCIES, { error: 'validation.selectOption' }),
});

export const notificationLinkSchema = z.object({
  to: appPathSchema,
  entityType: z.enum(ENTITY_TYPES, { error: 'validation.selectOption' }),
  entityId: idSchema,
});

export const broadcastInputSchema = z.object({
  audience: z.discriminatedUnion(
    'scope',
    [
      z.object({ scope: z.literal('national') }),
      z.object({ scope: z.literal('chapter'), chapterId: idSchema }),
    ],
    { error: 'validation.selectOption' },
  ),
  category: z.enum(NOTIFICATION_CATEGORIES, { error: 'validation.selectOption' }),
  title: localizedTextSchema(LIMITS.title),
  body: localizedTextSchema(LIMITS.note),
  link: notificationLinkSchema.nullable(),
});

export type OwnProfileUpdateValues = z.infer<typeof ownProfileUpdateSchema>;
export type SendMessageValues = z.infer<typeof sendMessageSchema>;
export type BroadcastInputValues = z.infer<typeof broadcastInputSchema>;
