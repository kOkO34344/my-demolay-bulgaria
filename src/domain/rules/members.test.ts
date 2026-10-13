import { describe, expect, it } from 'vitest';

import {
  ageOn,
  isDueForSeniorTransition,
  meetsMinimumAge,
  needsAdultApprovalForPublic,
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
