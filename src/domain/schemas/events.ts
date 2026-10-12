import { z } from 'zod';

import {
  ATTENDANCE_STATUSES,
  EVENT_CATEGORIES,
  EVENT_SCOPES,
  PARTICIPANT_VISIBILITIES,
  RSVP_STATUSES,
} from '@/domain';
import { translationCompletenessErrors } from '@/domain/rules/translations';
import { vmsg } from '@/i18n/validation';

import {
  LIMITS,
  idSchema,
  imageUrlSchema,
  isoDateTimeSchema,
  optionalLocalizedTextSchema,
  optionalText,
  requiredText,
} from './common';

/**
 * Event command schemas (ISO instants — forms convert Sofia wall time with sofiaWallTimeToIso).
 *  - `eventInputSchema` / `eventCreateSchema`: drafts may be partial (one title is enough);
 *  - `eventReadyIssues()`: extra checks before an event is published (both languages complete,
 *    a location name in both languages — or a meeting link for online events).
 */

export const eventTranslationSchema = z.object({
  title: optionalText(LIMITS.title),
  summary: optionalText(LIMITS.summary),
  description: optionalText(LIMITS.body),
});

export const capacitySchema = z
  .number({ error: 'validation.invalidNumber' })
  .int({ error: 'validation.invalidNumber' })
  .min(1, { error: vmsg('validation.tooSmall', { count: 1 }) })
  .max(LIMITS.capacity, { error: vmsg('validation.tooBig', { count: LIMITS.capacity }) })
  .nullable();

export const eventLocationSchema = z
  .object({
    name: optionalLocalizedTextSchema(LIMITS.meetingText),
    address: optionalLocalizedTextSchema(LIMITS.address),
    online: z.boolean(),
    url: z
      .string()
      .trim()
      .max(LIMITS.url, { error: vmsg('validation.tooLong', { count: LIMITS.url }) })
      .nullable(),
  })
  .superRefine((location, ctx) => {
    const url = location.url ?? '';
    if (location.online && url.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'validation.required' });
    } else if (url.length > 0 && !/^https:\/\/[^\s]+$/.test(url)) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'validation.invalidUrl' });
    }
  });

const eventFields = {
  translations: z.object({
    en: eventTranslationSchema.optional(),
    bg: eventTranslationSchema.optional(),
  }),
  scope: z.enum(EVENT_SCOPES, { error: 'validation.selectOption' }),
  chapterId: idSchema.nullable(),
  category: z.enum(EVENT_CATEGORIES, { error: 'validation.selectOption' }),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  location: eventLocationSchema,
  capacity: capacitySchema,
  registrationDeadline: isoDateTimeSchema.nullable(),
  participantVisibility: z.enum(PARTICIPANT_VISIBILITIES, { error: 'validation.selectOption' }),
  imageUrl: imageUrlSchema.nullable(),
};

interface EventShape {
  translations: { en?: { title: string }; bg?: { title: string } };
  scope: 'national' | 'chapter';
  chapterId: string | null;
  startsAt: string;
  endsAt: string;
  registrationDeadline: string | null;
}

function checkEvent(input: EventShape, ctx: z.RefinementCtx): void {
  if ((input.translations.en?.title ?? '') === '' && (input.translations.bg?.title ?? '') === '') {
    ctx.addIssue({
      code: 'custom',
      path: ['translations', 'en', 'title'],
      message: 'messages.validation.titleInOneLanguage',
    });
  }
  if (input.scope === 'chapter' && !input.chapterId) {
    ctx.addIssue({ code: 'custom', path: ['chapterId'], message: 'validation.selectOption' });
  }
  if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'validation.endBeforeStart' });
  }
  if (
    input.registrationDeadline &&
    Date.parse(input.registrationDeadline) > Date.parse(input.startsAt)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['registrationDeadline'],
      message: 'messages.validation.deadlineAfterStart',
    });
  }
}

/** Normalises scope/chapter consistency: national events never carry a chapter. */
function normalizeEventScope<T extends { scope: 'national' | 'chapter'; chapterId: string | null }>(
  input: T,
): T {
  return input.scope === 'national' ? { ...input, chapterId: null } : input;
}

export const eventInputSchema = z
  .object(eventFields)
  .superRefine(checkEvent)
  .transform(normalizeEventScope);

export const eventCreateSchema = z
  .object({ ...eventFields, publish: z.boolean() })
  .superRefine(checkEvent)
  .transform(normalizeEventScope);

export type EventInputValues = z.infer<typeof eventInputSchema>;

/** Field errors that block publishing (empty object = ready). */
export function eventReadyIssues(input: {
  translations: Partial<Record<'en' | 'bg', object>>;
  location: { name: { en: string; bg: string }; online: boolean };
}): Record<string, string> {
  const errors = translationCompletenessErrors('event', input.translations);
  if (!input.location.online) {
    if (input.location.name.en.trim() === '') errors['location.name.en'] = 'validation.required';
    if (input.location.name.bg.trim() === '') errors['location.name.bg'] = 'validation.required';
  }
  return errors;
}

export const cancelEventSchema = z.object({ reason: requiredText(LIMITS.reason) });

export const eventNoteSchema = z.object({ body: requiredText(LIMITS.messageBody) });

export const rsvpStatusSchema = z.enum(RSVP_STATUSES, { error: 'validation.selectOption' });

export const attendanceRecordsSchema = z
  .array(
    z.object({
      userId: idSchema,
      status: z.enum(ATTENDANCE_STATUSES, { error: 'validation.selectOption' }),
    }),
  )
  .min(1, { error: 'validation.selectOption' })
  .max(1_000);
