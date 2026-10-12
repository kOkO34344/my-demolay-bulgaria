import { z } from 'zod';

import {
  FILE_TYPES,
  RESOURCE_CATEGORIES,
  RESOURCE_LANGUAGES,
  RESOURCE_VISIBILITIES,
} from '@/domain';
import { vmsg } from '@/i18n/validation';

import { LIMITS, idSchema, optionalText, requiredText } from './common';

/**
 * Resource metadata (no file is uploaded). At least one language needs a title; a language left
 * empty shows up in the translation queue as "missing".
 */

export const resourceTranslationSchema = z.object({
  title: optionalText(LIMITS.title),
  description: optionalText(LIMITS.description),
});

export const RESOURCE_VERSION_PATTERN = /^\d{1,3}(\.\d{1,3}){0,2}$/;

export const resourceInputSchema = z
  .object({
    translations: z.object({
      en: resourceTranslationSchema.optional(),
      bg: resourceTranslationSchema.optional(),
    }),
    category: z.enum(RESOURCE_CATEGORIES, { error: 'validation.selectOption' }),
    language: z.enum(RESOURCE_LANGUAGES, { error: 'validation.selectOption' }),
    fileType: z.enum(FILE_TYPES, { error: 'validation.selectOption' }),
    fileName: requiredText(LIMITS.fileName),
    fileSize: z
      .number({ error: 'validation.invalidNumber' })
      .int({ error: 'validation.invalidNumber' })
      .min(1, { error: vmsg('validation.tooSmall', { count: 1 }) })
      .max(LIMITS.fileSize, { error: vmsg('validation.tooBig', { count: LIMITS.fileSize }) }),
    version: z
      .string()
      .trim()
      .regex(RESOURCE_VERSION_PATTERN, { error: 'messages.validation.versionFormat' }),
    chapterId: idSchema.nullable(),
    visibility: z.enum(RESOURCE_VISIBILITIES, { error: 'validation.selectOption' }),
  })
  .superRefine((input, ctx) => {
    const en = input.translations.en?.title ?? '';
    const bg = input.translations.bg?.title ?? '';
    if (en.length === 0 && bg.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['translations', 'en', 'title'],
        message: 'messages.validation.titleInOneLanguage',
      });
    }
  });

export type ResourceInputValues = z.infer<typeof resourceInputSchema>;
