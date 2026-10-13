import type { MemberRecord } from '@/data/store/schema';
import {
  AVAILABILITY,
  INTERESTS,
  ONBOARDING_QUESTIONS,
  type OnboardingRecord,
  type User,
} from '@/domain';

/**
 * Questionnaire answers for every seeded account that is already in use, so planners see real
 * totals and nobody in the demo is sent to the questionnaire. Deterministic per user id.
 */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A stable subset of `options` (at least `min` items) chosen by the seed. */
function pick<T>(options: readonly T[], seed: number, min: number): T[] {
  const chosen = options.filter((_, index) => ((seed >>> index) & 3) === 0);
  for (let i = 0; chosen.length < min && i < options.length; i += 1) {
    const option = options[(seed + i * 7) % options.length] as T;
    if (!chosen.includes(option)) chosen.push(option);
  }
  return chosen;
}

export function seedOnboarding(
  users: Record<string, User>,
  members: Record<string, MemberRecord>,
  answeredAt: string,
): OnboardingRecord[] {
  return Object.values(members)
    .filter((member) => users[member.userId]?.status !== 'pending')
    .map((member) => {
      const seed = hash(member.userId);
      const questions = ONBOARDING_QUESTIONS[member.memberType];
      return {
        id: member.userId,
        userId: member.userId,
        memberType: member.memberType,
        interests: questions.interests ? pick(INTERESTS, seed, 2) : [],
        availability: pick(AVAILABILITY, seed >>> 8, questions.availability.required ? 1 : 0),
        helpOffers: pick(questions.helpOffers, seed >>> 16, 0),
        completedAt: answeredAt,
        skippedAt: null,
        updatedAt: answeredAt,
      };
    });
}
