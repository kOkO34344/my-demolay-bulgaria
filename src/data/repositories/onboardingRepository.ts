import type {
  AudienceInsights,
  AudienceInsightsQuery,
  OnboardingAnswers,
  OnboardingStatus,
} from '@/domain';

/** The onboarding questionnaire and the totals it gives event planners. */
export interface OnboardingRepository {
  /** GET /api/v1/onboarding/me — the signed-in person's questions, answers and state. */
  mine(): Promise<OnboardingStatus>;

  /**
   * PUT /api/v1/onboarding/me — saves the answers (completing the questionnaire).
   * @throws ValidationError({ interests | availability | helpOffers: key })
   */
  submit(answers: OnboardingAnswers): Promise<OnboardingStatus>;

  /** POST /api/v1/onboarding/me/skip — "Later": no more automatic redirect. */
  skip(): Promise<OnboardingStatus>;

  /**
   * GET /api/v1/onboarding/insights?chapter_id= — totals only, for people who create events in
   * that scope (chapter_id omitted = national).
   * @throws ForbiddenError without event.create in scope.
   */
  insights(query: AudienceInsightsQuery): Promise<AudienceInsights>;
}
