import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { LocalizedMessage, LocalizedText, Translations } from '@/domain/types/common';

import { DEFAULT_LOCALE, INTL_LOCALES, TIME_ZONE, isLocale, type Locale } from './config';
import {
  type DateInput,
  type DateStyle,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDateWithWeekday,
  formatFileSize,
  formatMonthYear,
  formatNumber,
  formatRelative,
  formatTime,
  getDateFnsLocale,
  getDateParts,
} from './format';
import { localize, localizeText, type Localized } from './localize';
import { formatMessage } from './message';

/** Active language + switcher. Re-renders on language change (no remount, no logout). */
export function useLocale() {
  const { i18n } = useTranslation();
  const resolved = i18n.resolvedLanguage ?? i18n.language;
  const lang: Locale = isLocale(resolved) ? resolved : DEFAULT_LOCALE;
  const setLanguage = useCallback(
    async (next: Locale) => {
      await i18n.changeLanguage(next);
    },
    [i18n],
  );
  return useMemo(
    () => ({
      lang,
      intlLocale: INTL_LOCALES[lang],
      timeZone: TIME_ZONE,
      dateFnsLocale: getDateFnsLocale(lang),
      setLanguage,
    }),
    [lang, setLanguage],
  );
}

/**
 * Bilingual content helpers bound to the active language.
 *   const { text, pick } = useLocalized();
 *   text(chapter.name)                       // string with fallback
 *   const tr = pick(post.translations)       // { value, lang, isFallback, isMissing }
 *   <article lang={tr.lang}>{tr.value?.title}</article>
 */
export function useLocalized() {
  const { lang } = useLocale();
  return useMemo(
    () => ({
      lang,
      text: (value: LocalizedText | null | undefined): string => localizeText(value, lang),
      pick: <T>(translations: Translations<T> | null | undefined): Localized<T> =>
        localize(translations, lang),
    }),
    [lang],
  );
}

/** Intl formatters bound to the active language (Europe/Sofia time zone). */
export function useFormatters() {
  const { lang } = useLocale();
  return useMemo(
    () => ({
      lang,
      date: (value: DateInput, style?: DateStyle) => formatDate(value, lang, style),
      dateWithWeekday: (value: DateInput) => formatDateWithWeekday(value, lang),
      dateTime: (value: DateInput, style?: DateStyle) => formatDateTime(value, lang, style),
      time: (value: DateInput) => formatTime(value, lang),
      monthYear: (value: DateInput) => formatMonthYear(value, lang),
      dateRange: (
        start: DateInput,
        end: DateInput,
        options?: { withTime?: boolean; style?: DateStyle },
      ) => formatDateRange(start, end, lang, options),
      relative: (value: DateInput, options?: { now?: Date; maxDays?: number }) =>
        formatRelative(value, lang, options),
      number: (value: number, options?: Intl.NumberFormatOptions) =>
        formatNumber(value, lang, options),
      fileSize: (bytes: number) => formatFileSize(bytes, lang),
      dateParts: (value: DateInput) => getDateParts(value, lang),
    }),
    [lang],
  );
}

/** Renders LocalizedMessage values (notifications, audit summaries) in the active language. */
export function useMessageFormatter() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  return useCallback(
    (message: LocalizedMessage | null | undefined) => formatMessage(message, t, lang),
    [t, lang],
  );
}

/**
 * Sets document.title to "<page> — My DeMolay Bulgaria" (or the app name alone) and keeps it in
 * sync with the active language. Pass an already-translated string.
 */
export function useDocumentTitle(pageTitle?: string | null) {
  const { t } = useTranslation();
  useEffect(() => {
    const appName = t('app.name');
    document.title = pageTitle
      ? t('app.titleTemplate', { page: pageTitle, app: appName })
      : appName;
  }, [pageTitle, t]);
}
