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

/** Oldest plausible age; anything above is a typing mistake. */
const MAXIMUM_PLAUSIBLE_AGE = 110;

export interface SignupAgeProblem {
  /** i18n key (fragment `signup` or `validation`). */
  key: string;
  /** Blocks signup. Non-blocking problems are shown to the verifier, who decides. */
  blocking: boolean;
}

/**
 * Whether a date of birth fits the member type chosen at signup (null when it does):
 *  - blocking: no date, an implausible date, anyone under 14 (docs/BRIEF.md › Constraints 1), and
 *    advisors or parents under 18;
 *  - for the verifier only: an "active member" aged 21 or more, or a "senior" under 21. The move
 *    to senior at 21 is actioned by a person, so signup does not decide it.
 */
export function signupAgeProblem(
  memberType: MemberType,
  birthDate: ISODate | null,
  now: Date,
): SignupAgeProblem | null {
  const age = ageOn(birthDate, now);
  const block = (key: string): SignupAgeProblem => ({ key, blocking: true });
  const flag = (key: string): SignupAgeProblem => ({ key, blocking: false });
  if (age === null) return block('validation.required');
  if (age < 0 || age > MAXIMUM_PLAUSIBLE_AGE) return block('validation.invalidDate');
  if (age < MINIMUM_MEMBER_AGE) return block('signup.errors.tooYoung');
  if ((memberType === 'advisor' || memberType === 'parent') && age < ADULT_AGE) {
    return block('signup.errors.adultRequired');
  }
  if (memberType === 'active' && age >= SENIOR_TRANSITION_AGE)
    return flag('signup.checks.activeTooOld');
  if (memberType === 'senior' && age < SENIOR_TRANSITION_AGE)
    return flag('signup.checks.seniorTooYoung');
  return null;
}
