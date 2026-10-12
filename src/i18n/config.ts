import { LOCALES, type Locale } from '@/domain/types/common';
import { STORAGE_KEYS } from '@/lib/storage';

export type { Locale };

/** Supported UI / content languages. `en` is the default and fallback. */
export const SUPPORTED_LOCALES = LOCALES;

export const DEFAULT_LOCALE: Locale = 'en';
export const FALLBACK_LOCALE: Locale = 'en';

/** sessionStorage key for the chosen UI language (session-only, like all prototype state). */
export const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.language;

/** Organisation time zone: all dates are displayed in Bulgarian local time. */
export const TIME_ZONE = 'Europe/Sofia';

/** BCP-47 tags used for Intl formatting per UI language. */
export const INTL_LOCALES: Record<Locale, string> = {
  en: 'en-GB',
  bg: 'bg-BG',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** The other supported language (used for translation fallbacks). */
export function otherLocale(lang: Locale): Locale {
  return lang === 'en' ? 'bg' : 'en';
}
