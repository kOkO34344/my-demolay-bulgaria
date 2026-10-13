import {
  AVAILABILITY,
  INTERESTS,
  ONBOARDING_QUESTIONS,
  type AgeBand,
  type ISODate,
  type MemberType,
  type OnboardingAnswers,
} from '@/domain';

import { ageOn } from './members';

/** Age band for event planning, from the date of birth (null when unknown). */
export function ageBandOf(birthDate: ISODate | null, now: Date): AgeBand | null {
  const age = ageOn(birthDate, now);
  if (age === null || age < 0) return null;
  if (age < 18) return '14_17';
  if (age < 21) return '18_20';
  if (age < 30) return '21_29';
  return '30_plus';
}

/**
 * Field errors (i18n keys) for a questionnaire answered as `memberType`: required questions need
 * at least one choice, and only the options offered to that type are accepted.
 */
export function onboardingAnswerErrors(
  memberType: MemberType,
  answers: OnboardingAnswers,
): Record<string, string> {
  const questions = ONBOARDING_QUESTIONS[memberType];
  const errors: Record<string, string> = {};
  const unknown = (values: readonly string[], allowed: readonly string[]) =>
    values.some((value) => !allowed.includes(value));

  if (questions.interests === null) {
    if (answers.interests.length > 0) errors.interests = 'validation.invalid';
  } else if (unknown(answers.interests, INTERESTS)) {
    errors.interests = 'validation.invalid';
  } else if (questions.interests.required && answers.interests.length === 0) {
    errors.interests = 'onboarding.errors.pickOne';
  }

  if (unknown(answers.availability, AVAILABILITY)) {
    errors.availability = 'validation.invalid';
  } else if (questions.availability.required && answers.availability.length === 0) {
    errors.availability = 'onboarding.errors.pickOne';
  }

  if (unknown(answers.helpOffers, questions.helpOffers)) errors.helpOffers = 'validation.invalid';
  return errors;
}
