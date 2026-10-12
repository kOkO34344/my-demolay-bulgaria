import { z } from 'zod';

import { CHAPTER_STATUSES } from '@/domain';

import {
  LIMITS,
  imageUrlSchema,
  isoDateSchema,
  localizedTextSchema,
  optionalLocalizedTextSchema,
} from './common';

/** Chapter (Обител) create / update. Names, city and description are required in both languages. */

export const CHAPTER_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const meetingInfoSchema = z.object({
  schedule: localizedTextSchema(LIMITS.meetingText),
  venue: localizedTextSchema(LIMITS.meetingText),
  address: optionalLocalizedTextSchema(LIMITS.address),
  notes: optionalLocalizedTextSchema(LIMITS.notes).nullable(),
});

export const chapterInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: 'validation.required' })
    .max(LIMITS.slug, { error: 'validation.invalidFormat' })
    .regex(CHAPTER_SLUG_PATTERN, { error: 'messages.validation.slugFormat' }),
  name: localizedTextSchema(LIMITS.name),
  city: localizedTextSchema(LIMITS.city),
  description: localizedTextSchema(LIMITS.description),
  foundedAt: isoDateSchema.nullable(),
  meeting: meetingInfoSchema,
  status: z.enum(CHAPTER_STATUSES, { error: 'validation.selectOption' }),
  imageUrl: imageUrlSchema.nullable(),
});

export type ChapterInputValues = z.infer<typeof chapterInputSchema>;
