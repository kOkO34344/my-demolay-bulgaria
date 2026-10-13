import { describe, expect, it } from 'vitest';

import {
  ageOn,
  isDueForSeniorTransition,
  meetsMinimumAge,
  needsAdultApprovalForPublic,
  signupAgeProblem,
} from './members';

const NOW = new Date('2026-10-13T10:00:00.000Z');

describe('membership age rules', () => {
  it('computes completed years on the Sofia calendar', () => {
    expect(ageOn('2012-10-13', NOW)).toBe(14);
    expect(ageOn('2012-10-14', NOW)).toBe(13);
    expect(ageOn(null, NOW)).toBeNull();
  });

  it('requires a date of birth and a minimum age of 14', () => {
    expect(meetsMinimumAge('2012-10-13', NOW)).toBe(true);
    expect(meetsMinimumAge('2012-10-14', NOW)).toBe(false);
    expect(meetsMinimumAge(null, NOW)).toBe(false);
  });

  it('flags active members aged 21+ for the senior transition, and nobody else', () => {
    expect(isDueForSeniorTransition({ memberType: 'active', birthDate: '2005-10-13' }, NOW)).toBe(
      true,
    );
    expect(isDueForSeniorTransition({ memberType: 'active', birthDate: '2005-10-14' }, NOW)).toBe(
      false,
    );
    expect(isDueForSeniorTransition({ memberType: 'senior', birthDate: '2000-01-01' }, NOW)).toBe(
      false,
    );
    expect(isDueForSeniorTransition({ memberType: 'active', birthDate: null }, NOW)).toBe(false);
  });

  it('requires adult approval before content by a minor (or unknown age) goes public', () => {
    expect(needsAdultApprovalForPublic('2009-01-01', NOW)).toBe(true);
    expect(needsAdultApprovalForPublic('2008-10-13', NOW)).toBe(false);
    expect(needsAdultApprovalForPublic(null, NOW)).toBe(true);
  });
});

describe('signupAgeProblem', () => {
  it('blocks anyone under 14, and advisors and parents under 18', () => {
    expect(signupAgeProblem('active', '2012-10-13', NOW)).toBeNull();
    expect(signupAgeProblem('active', '2012-10-14', NOW)).toEqual({
      key: 'signup.errors.tooYoung',
      blocking: true,
    });
    expect(signupAgeProblem('advisor', '2008-10-13', NOW)).toBeNull();
    expect(signupAgeProblem('parent', '2009-01-01', NOW)).toEqual({
      key: 'signup.errors.adultRequired',
      blocking: true,
    });
    expect(signupAgeProblem('parent', '2015-01-01', NOW)?.key).toBe('signup.errors.tooYoung');
  });

  it('only flags the type for the verifier around the senior transition at 21', () => {
    expect(signupAgeProblem('active', '2005-10-14', NOW)).toBeNull();
    expect(signupAgeProblem('active', '2005-10-13', NOW)).toEqual({
      key: 'signup.checks.activeTooOld',
      blocking: false,
    });
    expect(signupAgeProblem('senior', '2005-10-13', NOW)).toBeNull();
    expect(signupAgeProblem('senior', '2006-01-01', NOW)).toEqual({
      key: 'signup.checks.seniorTooYoung',
      blocking: false,
    });
  });

  it('blocks a missing or implausible date', () => {
    expect(signupAgeProblem('active', null, NOW)?.key).toBe('validation.required');
    expect(signupAgeProblem('advisor', '1900-01-01', NOW)?.key).toBe('validation.invalidDate');
    expect(signupAgeProblem('active', '2030-01-01', NOW)?.key).toBe('validation.invalidDate');
  });
});
