import type { TFunction } from 'i18next';
import { z } from 'zod';

/**
 * Translatable validation messages.
 *
 * Pattern: zod schemas emit i18n KEYS (optionally with params) instead of English text; the form
 * layer translates them at render time (FormMessage / FieldError do this automatically), so
 * messages switch language instantly without re-validating.
 *
 *   // explicit message with params
 *   z.string().min(10, { error: vmsg('validation.tooShort', { count: 10 }) })
 *   // explicit key
 *   z.string().refine(isFuture, { error: 'validation.mustBeInFuture' })
 *   // or rely on the global error map (installed at startup) for built-in checks:
 *   z.string().min(1)        -> 'validation.required'
 *   z.email()                -> 'validation.invalidEmail'
 *   z.string().max(200)      -> 'validation.tooLong|{"count":200}'
 *
 * Feature-specific keys may live in a fragment (e.g. 'events.form.errors.endBeforeStart').
 * Any message that is not a translation key is rendered as-is (third-party messages).
 */

const PARAM_SEPARATOR = '|';

export type ValidationParams = Record<string, string | number>;

/** Encodes an i18n key + params into a zod message string. */
export function vmsg(key: string, params?: ValidationParams): string {
  return params ? `${key}${PARAM_SEPARATOR}${JSON.stringify(params)}` : key;
}

export interface DecodedValidationMessage {
  key: string;
  params?: ValidationParams;
}

export function decodeValidationMessage(message: string): DecodedValidationMessage {
  const index = message.indexOf(PARAM_SEPARATOR);
  if (index === -1) return { key: message };
  const key = message.slice(0, index);
  try {
    const parsed: unknown = JSON.parse(message.slice(index + 1));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { key, params: parsed as ValidationParams };
    }
  } catch {
    /* fall through */
  }
  return { key };
}

const KEY_PATTERN = /^[a-zA-Z][\w-]*(\.[\w-]+)+$/;

/** Translates a message produced by a schema; falls back to a generic message for unknown keys. */
export function translateValidationMessage(
  t: TFunction,
  message: string | undefined | null,
): string {
  if (!message) return '';
  const { key, params } = decodeValidationMessage(message);
  if (!KEY_PATTERN.test(key)) return message;
  return t(key, { ...params, defaultValue: t('validation.invalid') });
}

function sizeKey(kind: 'small' | 'big', origin: string): string {
  if (origin === 'string') return kind === 'small' ? 'validation.tooShort' : 'validation.tooLong';
  if (origin === 'array' || origin === 'set') {
    return kind === 'small' ? 'validation.selectAtLeast' : 'validation.selectAtMost';
  }
  if (origin === 'date')
    return kind === 'small' ? 'validation.dateTooEarly' : 'validation.dateTooLate';
  return kind === 'small' ? 'validation.tooSmall' : 'validation.tooBig';
}

/** Global zod error map producing i18n keys for built-in checks (explicit messages still win). */
export const zodKeyErrorMap: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null || issue.input === ''
        ? 'validation.required'
        : 'validation.invalid';
    case 'too_small': {
      const min = Number(issue.minimum);
      if (issue.origin === 'string' && min <= 1) return 'validation.required';
      if ((issue.origin === 'array' || issue.origin === 'set') && min <= 1)
        return 'validation.selectOption';
      return vmsg(sizeKey('small', issue.origin), { count: min });
    }
    case 'too_big':
      return vmsg(sizeKey('big', issue.origin), { count: Number(issue.maximum) });
    case 'invalid_format':
      switch (issue.format) {
        case 'email':
          return 'validation.invalidEmail';
        case 'url':
          return 'validation.invalidUrl';
        case 'date':
        case 'datetime':
        case 'time':
          return 'validation.invalidDate';
        default:
          return 'validation.invalidFormat';
      }
    case 'invalid_value':
      return 'validation.selectOption';
    case 'not_multiple_of':
      return 'validation.invalidNumber';
    default:
      return 'validation.invalid';
  }
};

let installed = false;

/** Installs the key-based error map globally (called once by src/i18n/index.ts). */
export function installZodErrorMap(): void {
  if (installed) return;
  z.config({ customError: zodKeyErrorMap });
  installed = true;
}
