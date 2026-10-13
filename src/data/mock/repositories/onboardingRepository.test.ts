import { describe, expect, it } from 'vitest';

import { ForbiddenError, ValidationError } from '@/data/errors';
import { db } from '@/data/store';

import { signInAs } from '../testing';
import { createMockOnboardingRepository } from './onboardingRepository';

const onboarding = createMockOnboardingRepository();

describe('mock onboarding repository', () => {
  it('has seeded answers for accounts already in use', async () => {
    signInAs('active_member');
    const status = await onboarding.mine();
    expect(status.state).toBe('completed');
    expect(status.memberType).toBe('active');
    expect(status.answers.interests.length).toBeGreaterThanOrEqual(2);
    expect(status.ageBand).not.toBeNull();
  });

  it('starts new accounts at "not started" with the questions for their type', async () => {
    const session = signInAs('parent');
    db.remove('onboarding', session.user.id);
    const status = await onboarding.mine();
    expect(status).toMatchObject({
      state: 'not_started',
      memberType: 'parent',
      answers: { interests: [], availability: [], helpOffers: [] },
    });
    expect(status.questions.interests).toBeNull();
    expect(status.questions.helpOffers).toContain('driving');
  });

  it('saves valid answers in catalogue order and completes the questionnaire', async () => {
    signInAs('active_member');
    const status = await onboarding.submit({
      interests: ['technology', 'sports', 'sports'],
      availability: ['saturdays'],
      helpOffers: ['photography'],
    });
    expect(status.state).toBe('completed');
    expect(status.answers.interests).toEqual(['sports', 'technology']);
  });

  it('rejects missing required answers and options not offered to the type', async () => {
    signInAs('active_member');
    const error = await onboarding
      .submit({ interests: [], availability: [], helpOffers: ['driving'] })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toEqual({
      interests: 'onboarding.errors.pickOne',
      availability: 'onboarding.errors.pickOne',
      helpOffers: 'validation.invalid',
    });
  });

  it('remembers "Later" without overwriting completed answers', async () => {
    const session = signInAs('active_member');
    db.remove('onboarding', session.user.id);
    expect((await onboarding.skip()).state).toBe('skipped');
    await onboarding.submit({ interests: ['social'], availability: ['sundays'], helpOffers: [] });
    expect((await onboarding.skip()).state).toBe('completed');
  });

  it('gives planners totals for their chapter, and nobody else', async () => {
    signInAs('chapter_chairman');
    const insights = await onboarding.insights({ chapterId: 'ch-1' });
    expect(insights.members).toBeGreaterThan(0);
    expect(insights.respondents).toBeLessThanOrEqual(insights.members);
    const counted = Object.values(insights.ageBands).reduce((a, b) => a + b, 0);
    expect(counted).toBe(insights.members);
    expect(JSON.stringify(insights)).not.toMatch(/u-/);
    expect(
      await onboarding.insights({ chapterId: 'ch-2' }).catch((e: unknown) => e),
    ).toBeInstanceOf(ForbiddenError);
    signInAs('active_member');
    expect(
      await onboarding.insights({ chapterId: 'ch-1' }).catch((e: unknown) => e),
    ).toBeInstanceOf(ForbiddenError);
  });
});
