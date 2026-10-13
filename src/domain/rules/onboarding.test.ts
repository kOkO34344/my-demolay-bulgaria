import { describe, expect, it } from 'vitest';

import { ageBandOf, onboardingAnswerErrors } from './onboarding';

const NOW = new Date('2026-10-13T10:00:00.000Z');
const none = { interests: [], availability: [], helpOffers: [] };

describe('ageBandOf', () => {
  it('bands ages for event planning', () => {
    expect(ageBandOf('2012-10-13', NOW)).toBe('14_17');
    expect(ageBandOf('2008-10-14', NOW)).toBe('14_17');
    expect(ageBandOf('2008-10-13', NOW)).toBe('18_20');
    expect(ageBandOf('2005-10-13', NOW)).toBe('21_29');
    expect(ageBandOf('1990-01-01', NOW)).toBe('30_plus');
    expect(ageBandOf(null, NOW)).toBeNull();
  });
});

describe('onboardingAnswerErrors', () => {
  it('asks active members for at least one interest and one time', () => {
    expect(onboardingAnswerErrors('active', none)).toEqual({
      interests: 'onboarding.errors.pickOne',
      availability: 'onboarding.errors.pickOne',
    });
    expect(
      onboardingAnswerErrors('active', {
        interests: ['sports'],
        availability: ['saturdays'],
        helpOffers: [],
      }),
    ).toEqual({});
  });

  it('lets parents answer nothing, but never about interests', () => {
    expect(onboardingAnswerErrors('parent', none)).toEqual({});
    expect(onboardingAnswerErrors('parent', { ...none, interests: ['sports'] })).toEqual({
      interests: 'validation.invalid',
    });
  });

  it('accepts only the ways of helping offered to the type', () => {
    expect(
      onboardingAnswerErrors('active', {
        interests: ['social'],
        availability: ['sundays'],
        helpOffers: ['driving'],
      }),
    ).toEqual({ helpOffers: 'validation.invalid' });
    expect(
      onboardingAnswerErrors('advisor', {
        ...none,
        availability: ['sundays'],
        helpOffers: ['driving'],
      }),
    ).toEqual({});
  });
});
