import { z } from 'zod';

import { AUDIENCE_SCOPES, AUDIENCE_VISIBILITIES, FILE_TYPES } from '@/domain';
import { translationCompletenessErrors } from '@/domain/rules/translations';
import { vmsg } from '@/i18n/validation';

import { LIMITS, idSchema, optionalText, requiredText } from './common';

/**
 * Announcement command schemas.
 *  - `announcementInputSchema`: create/update of a DRAFT — any language may be partial, but at least
 *    one language needs a title.
 *  - `announcementReadySchema`: content that is submitted or published — complete EN **and** BG
 *    (title, summary, body). Errors land on `translations.<lang>.<field>`.
 */

export const announcementTranslationSchema = z.object({
  title: optionalText(LIMITS.title),
  summary: optionalText(LIMITS.summary),
  body: optionalText(LIMITS.body),
});

export const audienceSchema = z
  .object({
    scope: z.enum(AUDIENCE_SCOPES, { error: 'validation.selectOption' }),
    chapterIds: z.array(idSchema),
    visibility: z.enum(AUDIENCE_VISIBILITIES, { error: 'validation.selectOption' }),
  })
  .superRefine((audience, ctx) => {
    const count = new Set(audience.chapterIds).size;
    if (audience.scope === 'chapter' && count !== 1) {
      ctx.addIssue({ code: 'custom', path: ['chapterIds'], message: 'validation.selectOption' });
    }
    if (audience.scope === 'multi_chapter' && count < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['chapterIds'],
        message: vmsg('validation.selectAtLeast', { count: 2 }),
      });
    }
  });

export const attachmentSchema = z.object({
  id: idSchema,
  name: requiredText(LIMITS.fileName),
  fileType: z.enum(FILE_TYPES, { error: 'validation.selectOption' }),
  size: z
    .number({ error: 'validation.invalidNumber' })
    .int({ error: 'validation.invalidNumber' })
    .min(1, { error: vmsg('validation.tooSmall', { count: 1 }) })
    .max(LIMITS.fileSize, { error: vmsg('validation.tooBig', { count: LIMITS.fileSize }) }),
});

const announcementBaseSchema = z.object({
  translations: z.object({
    en: announcementTranslationSchema.optional(),
    bg: announcementTranslationSchema.optional(),
  }),
  audience: audienceSchema,
  pinned: z.boolean(),
  attachments: z
    .array(attachmentSchema)
    .max(LIMITS.attachments, { error: vmsg('validation.selectAtMost', { count: LIMITS.attachments }) }),
  relatedIds: z
    .array(idSchema)
    .max(LIMITS.related, { error: vmsg('validation.selectAtMost', { count: LIMITS.related }) }),
});

/** Draft: at least one language must have a title. */
export const announcementInputSchema = announcementBaseSchema.superRefine((input, ctx) => {
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

/** Submitted / published: complete in both languages. */
export const announcementReadySchema = announcementBaseSchema.superRefine((input, ctx) => {
  const errors = translationCompletenessErrors('announcement', input.translations);
  for (const [path, message] of Object.entries(errors)) {
    ctx.addIssue({ code: 'custom', path: path.split('.'), message });
  }
});

export const returnToDraftSchema = z.object({ note: requiredText(LIMITS.note) });

export type AnnouncementInputValues = z.infer<typeof announcementInputSchema>;
