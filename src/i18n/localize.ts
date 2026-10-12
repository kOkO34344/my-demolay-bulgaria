import type { LocalizedText, Translations } from '@/domain/types/common';

import { otherLocale, type Locale } from './config';

/**
 * Bilingual content helpers.
 *
 * Content may exist in one language only (e.g. a draft awaiting translation). `localize` picks the
 * active language, falls back to the other one, and reports what happened so the UI can:
 *   - set `lang={result.lang}` on the element rendering the text (screen readers + typography), and
 *   - show a "Not yet translated" hint when `result.isFallback` is true.
 */

export interface Localized<T> {
  /** The chosen value, or undefined when neither language has content. */
  value: T | undefined;
  /** Language of `value` (the requested one unless falling back). */
  lang: Locale;
  /** True when the requested language was missing and the other language was used. */
  isFallback: boolean;
  /** True when neither language has content. */
  isMissing: boolean;
}

/** A translation is "empty" when it is null/undefined, a blank string, or an object of blank strings. */
export function isEmptyTranslation(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every((v) =>
      typeof v === 'string' ? v.trim() === '' : v === null || v === undefined,
    );
  }
  return false;
}

export function localize<T>(
  translations: Translations<T> | null | undefined,
  lang: Locale,
): Localized<T> {
  const preferred = translations?.[lang];
  if (!isEmptyTranslation(preferred)) {
    return { value: preferred, lang, isFallback: false, isMissing: false };
  }
  const other = otherLocale(lang);
  const fallback = translations?.[other];
  if (!isEmptyTranslation(fallback)) {
    return { value: fallback, lang: other, isFallback: true, isMissing: false };
  }
  return { value: undefined, lang, isFallback: false, isMissing: true };
}

/** Plain string for a LocalizedText with fallback to the other language ('' when both missing). */
export function localizeText(text: LocalizedText | null | undefined, lang: Locale): string {
  if (!text) return '';
  const localized = localize<string>(text, lang);
  return localized.value ?? '';
}
