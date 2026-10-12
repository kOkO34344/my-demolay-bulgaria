import { z } from 'zod';

import { SCOPE_LEVELS, type ScopeLevel } from '@/domain';
import { vmsg } from '@/i18n/validation';

/**
 * Building blocks for the shared command schemas. Every message is an i18n KEY (optionally with
 * params via `vmsg`) so the UI translates it at render time and the mock backend can return the
 * same keys in ValidationError.fieldErrors.
 */

export const LIMITS = {
  id: 100,
  title: 160,
  summary: 300,
  body: 20_000,
  description: 5_000,
  name: 120,
  city: 80,
  slug: 60,
  meetingText: 200,
  address: 300,
  notes: 500,
  reason: 500,
  note: 1_000,
  messageSubject: 120,
  messageBody: 2_000,
  bio: 500,
  url: 2_048,
  fileName: 200,
  /** 500 MB — metadata only, nothing is uploaded. */
  fileSize: 500 * 1024 * 1024,
  capacity: 10_000,
  attachments: 10,
  related: 10,
  priority: 1_000,
} as const;

/** Minimum length of free-text justifications (role changes, special permissions…). */
export const MIN_REASON_LENGTH = 5;

export const idSchema = z
  .string()
  .trim()
  .min(1, { error: 'validation.required' })
  .max(LIMITS.id, { error: vmsg('validation.tooLong', { count: LIMITS.id }) });

/** Trimmed, non-empty, bounded text. */
export function requiredText(max: number, min = 1) {
  return z
    .string({ error: 'validation.required' })
    .trim()
    .min(min, {
      error: min <= 1 ? 'validation.required' : vmsg('validation.tooShort', { count: min }),
    })
    .max(max, { error: vmsg('validation.tooLong', { count: max }) });
}

/** Trimmed, possibly empty, bounded text. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: vmsg('validation.tooLong', { count: max }) });
}

/** Text required in BOTH languages. */
export function localizedTextSchema(max: number) {
  return z.object({ en: requiredText(max), bg: requiredText(max) });
}

/** Text that may be empty in either language (drafts). */
export function optionalLocalizedTextSchema(max: number) {
  return z.object({ en: optionalText(max), bg: optionalText(max) });
}

export const isoDateTimeSchema = z.iso.datetime({ offset: true, error: 'validation.invalidDate' });
export const isoDateSchema = z.iso.date({ error: 'validation.invalidDate' });

/** In-app path ("/news/ann-…"); never an external URL. */
export const appPathSchema = z
  .string()
  .trim()
  .min(1, { error: 'validation.required' })
  .max(LIMITS.url, { error: vmsg('validation.tooLong', { count: LIMITS.url }) })
  .regex(/^\/(?!\/)/, { error: 'validation.invalidFormat' });

/** Image reference: app-relative path, https URL or an inline data:image URL (avatar preview). */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(200_000, { error: 'validation.invalidFormat' })
  .regex(/^(\/(?!\/)|https:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/, {
    error: 'validation.invalidUrl',
  });

export const scopeLevelSchema = z.enum(SCOPE_LEVELS, { error: 'validation.selectOption' });

/**
 * Scope: 'chapter' needs exactly one chapter, 'multi_chapter' at least two; other levels carry no
 * chapters (extra ids are dropped).
 */
export const scopeSchema = z
  .object({
    level: scopeLevelSchema,
    chapterIds: z.array(idSchema).optional(),
  })
  .superRefine((scope, ctx) => {
    const count = new Set(scope.chapterIds ?? []).size;
    if (scope.level === 'chapter' && count !== 1) {
      ctx.addIssue({ code: 'custom', path: ['chapterIds'], message: 'validation.selectOption' });
    }
    if (scope.level === 'multi_chapter' && count < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['chapterIds'],
        message: vmsg('validation.selectAtLeast', { count: 2 }),
      });
    }
  })
  .transform((scope) => {
    const level: ScopeLevel = scope.level;
    return level === 'chapter' || level === 'multi_chapter'
      ? { level, chapterIds: [...new Set(scope.chapterIds ?? [])] }
      : { level };
  });
