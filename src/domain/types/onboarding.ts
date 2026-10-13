import type { MemberType } from './access';
import type { ID, ISODateTime } from './common';

/**
 * Onboarding questionnaire (docs/BRIEF.md › Login; ROADMAP.md §3 Identity): after the first sign-in
 * each person says what interests them, when they are free and how they could help, so events are
 * planned for a real audience. Questions vary by member type; the age band comes from the date of
 * birth already on file. Planners only ever see totals, never individual answers.
 */

export const INTERESTS = [
  'leadership',
  'public_speaking',
  'service',
  'education',
  'ritual',
  'sports',
  'outdoors',
  'social',
  'arts',
  'technology',
] as const;
export type Interest = (typeof INTERESTS)[number];

export const AVAILABILITY = [
  'weekday_evenings',
  'saturdays',
  'sundays',
  'school_holidays',
] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const HELP_OFFERS = [
  'event_help',
  'photography',
  'mentoring',
  'teaching',
  'driving',
  'fundraising',
] as const;
export type HelpOffer = (typeof HELP_OFFERS)[number];

export const AGE_BANDS = ['14_17', '18_20', '21_29', '30_plus'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export interface OnboardingQuestions {
  /** null when the type is not asked about interests (parents). */
  interests: { required: boolean } | null;
  availability: { required: boolean };
  /** The ways of helping offered to this type. */
  helpOffers: readonly HelpOffer[];
}

/** What each member type is asked (the brief: "varying by member type"). */
export const ONBOARDING_QUESTIONS: Record<MemberType, OnboardingQuestions> = {
  active: {
    interests: { required: true },
    availability: { required: true },
    helpOffers: ['event_help', 'photography'],
  },
  senior: {
    interests: { required: true },
    availability: { required: true },
    helpOffers: ['mentoring', 'teaching', 'event_help', 'photography'],
  },
  advisor: {
    interests: { required: false },
    availability: { required: true },
    helpOffers: ['mentoring', 'teaching', 'driving', 'event_help', 'fundraising'],
  },
  parent: {
    interests: null,
    availability: { required: false },
    helpOffers: ['driving', 'event_help', 'fundraising', 'photography'],
  },
};

export interface OnboardingAnswers {
  interests: Interest[];
  availability: Availability[];
  helpOffers: HelpOffer[];
}

/** Server-side record (one per person). */
export interface OnboardingRecord extends OnboardingAnswers {
  /** = userId */
  id: ID;
  userId: ID;
  /** Type at the time of answering (the questions depend on it). */
  memberType: MemberType;
  completedAt: ISODateTime | null;
  /** "Later" was chosen: no automatic redirect again, a reminder on Home instead. */
  skippedAt: ISODateTime | null;
  updatedAt: ISODateTime;
}

export type OnboardingState = 'not_started' | 'skipped' | 'completed';

/** The signed-in person's questionnaire. */
export interface OnboardingStatus {
  state: OnboardingState;
  memberType: MemberType;
  questions: OnboardingQuestions;
  answers: OnboardingAnswers;
  /** From the date of birth on file (null when unknown). */
  ageBand: AgeBand | null;
}

export interface AudienceInsightsQuery {
  /** null = every chapter (national planners). */
  chapterId: ID | null;
}

/** Totals for event planners. Members are active accounts of type active, senior or advisor. */
export interface AudienceInsights {
  chapterId: ID | null;
  /** Active accounts in scope (parents excluded). */
  members: number;
  /** Of those, how many completed the questionnaire. */
  respondents: number;
  interests: Record<Interest, number>;
  availability: Record<Availability, number>;
  ageBands: Record<AgeBand, number>;
  /** Offers of help, parents included. */
  helpOffers: Record<HelpOffer, number>;
}
