import { canCreateEvent } from '@/auth/policy';
import { ForbiddenError, ValidationError } from '@/data/errors';
import type { OnboardingRepository } from '@/data/repositories';
import { db, mockCall, requireSubject } from '@/data/store';
import {
  AGE_BANDS,
  AVAILABILITY,
  HELP_OFFERS,
  INTERESTS,
  ONBOARDING_QUESTIONS,
  type AudienceInsights,
  type OnboardingAnswers,
  type OnboardingRecord,
  type OnboardingStatus,
  type Subject,
} from '@/domain';
import { ageBandOf, onboardingAnswerErrors } from '@/domain/rules';
import { clock } from '@/lib/clock';

/**
 * Onboarding questionnaire — emulated FastAPI endpoints. Each person reads and writes only their
 * own answers. Planners (event.create in scope) get totals for their audience and never see who
 * answered what.
 */

const EMPTY: OnboardingAnswers = { interests: [], availability: [], helpOffers: [] };

function zeros<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

/** Unique values in catalogue order (answers are stored normalised). */
function normalise<T extends string>(values: readonly T[], order: readonly T[]): T[] {
  return order.filter((value) => values.includes(value));
}

function statusFor(subject: Subject): OnboardingStatus {
  const record = db.get('onboarding', subject.userId);
  const member = db.require('members', subject.userId, 'member');
  // The questions follow the person's real member type (not a demo override).
  const memberType = member.memberType;
  const state = record?.completedAt ? 'completed' : record?.skippedAt ? 'skipped' : 'not_started';
  return {
    state,
    memberType,
    questions: ONBOARDING_QUESTIONS[memberType],
    answers: record
      ? {
          interests: record.interests,
          availability: record.availability,
          helpOffers: record.helpOffers,
        }
      : EMPTY,
    ageBand: ageBandOf(member.private.birthDate, clock.now()),
  };
}

function save(subject: Subject, patch: Partial<OnboardingRecord>): void {
  const member = db.require('members', subject.userId, 'member');
  const existing = db.get('onboarding', subject.userId);
  db.upsert('onboarding', {
    id: subject.userId,
    userId: subject.userId,
    memberType: member.memberType,
    ...EMPTY,
    completedAt: null,
    skippedAt: null,
    ...existing,
    ...patch,
    updatedAt: clock.nowIso(),
  });
}

export function createMockOnboardingRepository(): OnboardingRepository {
  return {
    mine: () => mockCall(() => statusFor(requireSubject())),

    submit: (answers) =>
      mockCall(() => {
        const subject = requireSubject();
        const memberType = db.require('members', subject.userId, 'member').memberType;
        const raw: OnboardingAnswers = {
          interests: answers.interests ?? [],
          availability: answers.availability ?? [],
          helpOffers: answers.helpOffers ?? [],
        };
        const errors = onboardingAnswerErrors(memberType, raw);
        if (Object.keys(errors).length > 0) throw new ValidationError(errors);
        const input: OnboardingAnswers = {
          interests: normalise(raw.interests, INTERESTS),
          availability: normalise(raw.availability, AVAILABILITY),
          helpOffers: normalise(raw.helpOffers, HELP_OFFERS),
        };
        save(subject, { ...input, memberType, completedAt: clock.nowIso() });
        return statusFor(subject);
      }),

    skip: () =>
      mockCall(() => {
        const subject = requireSubject();
        const current = db.get('onboarding', subject.userId);
        if (!current?.completedAt) save(subject, { skippedAt: clock.nowIso() });
        return statusFor(subject);
      }),

    insights: (query) =>
      mockCall((): AudienceInsights => {
        const subject = requireSubject();
        const target = query.chapterId
          ? { scope: 'chapter' as const, chapterId: query.chapterId }
          : { scope: 'national' as const, chapterId: null };
        if (!canCreateEvent(subject, target)) {
          throw new ForbiddenError('permission_denied', 'event.create');
        }
        const now = clock.now();
        const inScope = db
          .list('members')
          .filter((m) => !query.chapterId || m.chapterId === query.chapterId)
          .filter((m) => db.get('users', m.userId)?.status === 'active');
        const members = inScope.filter((m) => m.memberType !== 'parent');
        const result: AudienceInsights = {
          chapterId: query.chapterId,
          members: members.length,
          respondents: 0,
          interests: zeros(INTERESTS),
          availability: zeros(AVAILABILITY),
          ageBands: zeros(AGE_BANDS),
          helpOffers: zeros(HELP_OFFERS),
        };
        for (const member of members) {
          const band = ageBandOf(member.private.birthDate, now);
          if (band) result.ageBands[band] += 1;
        }
        for (const member of inScope) {
          const record = db.get('onboarding', member.userId);
          if (!record?.completedAt) continue;
          for (const offer of record.helpOffers) result.helpOffers[offer] += 1;
          if (member.memberType === 'parent') continue;
          result.respondents += 1;
          for (const interest of record.interests) result.interests[interest] += 1;
          for (const time of record.availability) result.availability[time] += 1;
        }
        return result;
      }),
  };
}
