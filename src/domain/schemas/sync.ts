import { z } from 'zod';

import { LOCALES, SYNC_RESOLUTION_ACTIONS, TRANSLATABLE_ENTITY_TYPES } from '@/domain';
import type { TranslatableEntityType } from '@/domain';
import { TRANSLATION_FIELDS } from '@/domain/rules/translations';

import { LIMITS, idSchema, requiredText } from './common';

/** Synchronisation exceptions and translation administration. */

export const resolveSyncExceptionSchema = z
  .object({
    action: z.enum(SYNC_RESOLUTION_ACTIONS, { error: 'validation.selectOption' }),
    note: requiredText(LIMITS.note),
    mappingId: idSchema.nullable().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.action === 'map_position' && !input.mappingId) {
      ctx.addIssue({ code: 'custom', path: ['mappingId'], message: 'validation.selectOption' });
    }
  });

export const ignoreSyncExceptionSchema = z.object({ note: requiredText(LIMITS.note) });

const FIELD_LIMITS: Record<string, number> = {
  title: LIMITS.title,
  summary: LIMITS.summary,
  body: LIMITS.body,
  description: LIMITS.body,
};

/** Fields of one language version, all required (the translation editor saves complete versions). */
export function translationFieldsSchema(entityType: TranslatableEntityType) {
  const shape: Record<string, ReturnType<typeof requiredText>> = {};
  for (const field of TRANSLATION_FIELDS[entityType]) {
    shape[field] = requiredText(FIELD_LIMITS[field] ?? LIMITS.description);
  }
  return z.object(shape);
}

export const translationUpdateSchema = z.object({
  entityType: z.enum(TRANSLATABLE_ENTITY_TYPES, { error: 'validation.selectOption' }),
  entityId: idSchema,
  locale: z.enum(LOCALES, { error: 'validation.selectOption' }),
  fields: z.record(z.string(), z.string()),
  state: z.enum(['needs_review', 'reviewed']).optional(),
});

export const translationReviewSchema = z.object({
  entityType: z.enum(TRANSLATABLE_ENTITY_TYPES, { error: 'validation.selectOption' }),
  entityId: idSchema,
  locale: z.enum(LOCALES, { error: 'validation.selectOption' }),
});
