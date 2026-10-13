import { toSofiaDateKey } from '@/i18n/format';
import type { ISODate, MemberType } from '@/domain';

/**
 * Membership rules from the brief (docs/BRIEF.md › Constraints, docs/ROLES-AND-PERMISSIONS.md §5):
 *  - minimum age 14; date of birth is mandatory for active members;
 *  - the transition to senior at 21 is FLAGGED automatically and actioned by a human;
 *  - nothing published by a member under 18 reaches the public site without an adult approving it.
 */

export const MINIMUM_MEMBER_AGE = 14;
export const SENIOR_TRANSITION_AGE = 21;
export const ADULT_AGE = 18;

/** Completed years between a birth date and `now` (Europe/Sofia calendar), or null when unknown. */
export function ageOn(birthDate: ISODate | null, now: Date): number | null {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number];
  const [ny, nm, nd] = toSofiaDateKey(now).split('-').map(Number) as [number, number, number];
  const hadBirthday = nm > bm || (nm === bm && nd >= bd);
  return ny - by - (hadBirthday ? 0 : 1);
}

/** Old enough to join (unknown birth date fails: it is mandatory). */
export function meetsMinimumAge(birthDate: ISODate | null, now: Date): boolean {
  const age = ageOn(birthDate, now);
  return age !== null && age >= MINIMUM_MEMBER_AGE;
}

/** An active member aged 21 or more: flag for an administrator to move them to senior. */
export function isDueForSeniorTransition(
  member: { memberType: MemberType; birthDate: ISODate | null },
  now: Date,
): boolean {
  if (member.memberType !== 'active') return false;
  const age = ageOn(member.birthDate, now);
  return age !== null && age >= SENIOR_TRANSITION_AGE;
}

/**
 * Content by this author needs an adult's approval before it may be mirrored to the public site.
 * Unknown age is treated as a minor (fail safe).
 */
export function needsAdultApprovalForPublic(authorBirthDate: ISODate | null, now: Date): boolean {
  const age = ageOn(authorBirthDate, now);
  return age === null || age < ADULT_AGE;
}
