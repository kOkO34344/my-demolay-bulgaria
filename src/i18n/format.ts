import { TZDate } from '@date-fns/tz';
import type { Locale as DateFnsLocale } from 'date-fns';
import { bg as dateFnsBg, enGB as dateFnsEnGB } from 'date-fns/locale';

import { INTL_LOCALES, TIME_ZONE, type Locale } from './config';

/**
 * Locale-aware formatting. All dates are shown in Europe/Sofia time using Intl with
 * en-GB / bg-BG conventions (e.g. "15 October 2026" / "15 октомври 2026 г.", 24-hour clock).
 * Components normally use the bound versions from `useFormatters()`.
 */

export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function dtf(lang: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${lang}|${JSON.stringify(options)}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(INTL_LOCALES[lang], { timeZone: TIME_ZONE, ...options });
    formatterCache.set(key, f);
  }
  return f;
}

export type DateStyle = 'short' | 'medium' | 'long' | 'full';

/** "15 Oct 2026" / "15.10.2026 г." (medium); long: "15 October 2026" / "15 октомври 2026 г." */
export function formatDate(value: DateInput, lang: Locale, style: DateStyle = 'medium'): string {
  return dtf(lang, { dateStyle: style }).format(toDate(value));
}

/** "Thursday, 15 October 2026" / "четвъртък, 15 октомври 2026 г." */
export function formatDateWithWeekday(value: DateInput, lang: Locale): string {
  return dtf(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    toDate(value),
  );
}

/** "15 Oct 2026, 18:30" / "15.10.2026 г., 18:30" */
export function formatDateTime(
  value: DateInput,
  lang: Locale,
  style: DateStyle = 'medium',
): string {
  return dtf(lang, { dateStyle: style, timeStyle: 'short' }).format(toDate(value));
}

/** "18:30" (24-hour clock in both languages). */
export function formatTime(value: DateInput, lang: Locale): string {
  return dtf(lang, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(toDate(value));
}

/** "October 2026" / "октомври 2026 г." */
export function formatMonthYear(value: DateInput, lang: Locale): string {
  return dtf(lang, { month: 'long', year: 'numeric' }).format(toDate(value));
}

/**
 * Range: same day with time → "15 October 2026, 18:30–21:00";
 * multi-day → "15–17 October 2026" / "15 – 17 октомври 2026 г.".
 */
export function formatDateRange(
  start: DateInput,
  end: DateInput,
  lang: Locale,
  options: { withTime?: boolean; style?: DateStyle } = {},
): string {
  const { withTime = true, style = 'long' } = options;
  const f = dtf(lang, withTime ? { dateStyle: style, timeStyle: 'short' } : { dateStyle: style });
  return f.formatRange(toDate(start), toDate(end));
}

// Standard Bulgarian month abbreviations (Intl's bg short month is numeric).
const BG_MONTH_ABBR = [
  'ян.',
  'февр.',
  'март',
  'апр.',
  'май',
  'юни',
  'юли',
  'авг.',
  'септ.',
  'окт.',
  'ноем.',
  'дек.',
];

export interface DateParts {
  /** "15" */
  day: string;
  /** "Oct" / "окт." */
  monthShort: string;
  /** "Thu" / "чт" */
  weekdayShort: string;
  year: string;
  /** 0-11 in Europe/Sofia */
  monthIndex: number;
}

/** Parts for calendar date blocks (Europe/Sofia). */
export function getDateParts(value: DateInput, lang: Locale): DateParts {
  const date = toDate(value);
  const parts = dtf('en', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(
    date,
  );
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  const monthIndex = Number(get('month')) - 1;
  const monthShort =
    lang === 'bg' ? (BG_MONTH_ABBR[monthIndex] ?? '') : dtf(lang, { month: 'short' }).format(date);
  return {
    day: get('day'),
    monthShort,
    weekdayShort: dtf(lang, { weekday: 'short' }).format(date),
    year: get('year'),
    monthIndex,
  };
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

const rtfCache = new Map<Locale, Intl.RelativeTimeFormat>();

/**
 * "5 minutes ago" / "преди 5 минути", "yesterday" / "вчера".
 * Beyond `maxDays` (default 7) falls back to an absolute medium date.
 */
export function formatRelative(
  value: DateInput,
  lang: Locale,
  options: { now?: Date; maxDays?: number } = {},
): string {
  const { now = new Date(), maxDays = 7 } = options;
  const date = toDate(value);
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs >= maxDays * 24 * 3600) return formatDate(date, lang, 'medium');
  let rtf = rtfCache.get(lang);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(INTL_LOCALES[lang], { numeric: 'auto' });
    rtfCache.set(lang, rtf);
  }
  if (abs < 60) return rtf.format(0, 'second');
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (abs >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return rtf.format(Math.round(diffSeconds / 60), 'minute');
}

export function formatNumber(
  value: number,
  lang: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(INTL_LOCALES[lang], options).format(value);
}

const FILE_UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/** "512 kB", "1.3 MB" / "1,3 MB" (decimal units, like most operating systems' download UIs). */
export function formatFileSize(bytes: number, lang: Locale): string {
  let value = Math.max(0, bytes);
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < FILE_UNITS.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  return new Intl.NumberFormat(INTL_LOCALES[lang], {
    style: 'unit',
    unit: FILE_UNITS[unitIndex],
    unitDisplay: 'short',
    maximumFractionDigits: unitIndex <= 1 ? 0 : 1,
  }).format(value);
}

/** date-fns locale for calendars / date pickers (react-day-picker). */
export function getDateFnsLocale(lang: Locale): DateFnsLocale {
  return lang === 'bg' ? dateFnsBg : dateFnsEnGB;
}

/** "YYYY-MM-DD" of an instant in Europe/Sofia (for grouping by day / calendar cells). */
export function toSofiaDateKey(value: DateInput): string {
  const parts = dtf('en', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    toDate(value),
  );
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** "YYYY-MM" of an instant in Europe/Sofia (event month filter). */
export function toSofiaMonthKey(value: DateInput): string {
  return toSofiaDateKey(value).slice(0, 7);
}

/**
 * Converts a wall-clock date + time entered in a form (interpreted in Europe/Sofia)
 * to an ISO-8601 UTC string, e.g. ("2026-10-15", "18:30") → "2026-10-15T15:30:00.000Z".
 */
export function sofiaWallTimeToIso(date: string, time = '00:00'): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const zoned = new TZDate(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, TIME_ZONE);
  return new Date(zoned.getTime()).toISOString();
}

/** Inverse of `sofiaWallTimeToIso`: ISO instant → { date: "YYYY-MM-DD", time: "HH:mm" } in Sofia. */
export function isoToSofiaWallTime(iso: DateInput): { date: string; time: string } {
  const date = toDate(iso);
  return {
    date: toSofiaDateKey(date),
    time: dtf('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date),
  };
}
