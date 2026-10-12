import type { ISODate, ISODateTime, LocalizedText } from '@/domain';
import { sofiaWallTimeToIso, toSofiaDateKey } from '@/i18n/format';

/**
 * Shared seed helpers. OWNED BY THE DATA TEAM.
 * Seeds are PURE functions of the seed time (`ctx.now`) — no randomness — so every date is
 * relative ("in 5 days at 18:30 Sofia time") and the demo never goes stale.
 */
export interface SeedContext {
  /** Time the database is seeded (clock.now(), injectable in tests). */
  now: Date;
}

const DAY = 24 * 3600 * 1000;
const HOUR = 3600 * 1000;
const MINUTE = 60 * 1000;

/** ISO instant `days` from the seed time (negative = past), at hh:mm UTC. */
export function daysFrom(ctx: SeedContext, days: number, hours = 9, minutes = 0): ISODateTime {
  const d = new Date(ctx.now.getTime() + days * DAY);
  d.setUTCHours(hours, minutes, 0, 0);
  return d.toISOString();
}

/**
 * Sofia wall-clock time on the Sofia calendar day `dayOffset` days from the seed time:
 * `at(ctx, 5, '18:30')` = "in five days at 18:30 in Bulgaria". Use offsets ≠ 0 for items that
 * must be clearly past or future.
 */
export function at(ctx: SeedContext, dayOffset: number, time: string): ISODateTime {
  const day = toSofiaDateKey(new Date(ctx.now.getTime() + dayOffset * DAY));
  return sofiaWallTimeToIso(day, time);
}

/** An instant relative to the seed time (always in the past for positive amounts). */
export function ago(
  ctx: SeedContext,
  amount: { days?: number; hours?: number; minutes?: number },
): ISODateTime {
  const offset =
    (amount.days ?? 0) * DAY + (amount.hours ?? 0) * HOUR + (amount.minutes ?? 0) * MINUTE;
  return new Date(ctx.now.getTime() - offset).toISOString();
}

/** Calendar date (Sofia) `days` before the seed time. */
export function dateAgo(ctx: SeedContext, days: number): ISODate {
  return toSofiaDateKey(new Date(ctx.now.getTime() - days * DAY));
}

/** Birth date for someone who is `years` old (plus `extraDays`) at seed time. */
export function birthDate(ctx: SeedContext, years: number, extraDays: number): ISODate {
  const d = new Date(ctx.now.getTime());
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return toSofiaDateKey(new Date(d.getTime() - extraDays * DAY));
}

/** Bilingual text shorthand. */
export const lt = (en: string, bg: string): LocalizedText => ({ en, bg });
