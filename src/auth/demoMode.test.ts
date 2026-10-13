import { afterEach, describe, expect, it } from 'vitest';

import { ForbiddenError } from '@/data/errors';
import { createMockAuthRepository } from '@/data/mock/repositories/authRepository';
import { env } from '@/lib/env';

import { getDemoCredentials } from './demoCredentials';
import { DEMO_PERSONAS, demoOverrideFor, personaRoles } from './demoPersonas';
import { buildSubject, isDemoModeEnabled } from './subject';

const base = {
  userId: 'u-member',
  memberType: 'active' as const,
  accountStatus: 'active' as const,
  homeChapterId: 'ch-1',
  linkedMemberIds: [],
  assignments: [],
  specialAssignments: [],
  demoOverride: demoOverrideFor('sysadmin', 'ch-1', '2026-10-12T00:00:00.000Z'),
};

describe('demo mode', () => {
  const original = env.demoMode;
  afterEach(() => {
    env.demoMode = original;
  });

  it('is on by default and off only for VITE_DEMO_MODE=false', () => {
    expect(isDemoModeEnabled({})).toBe(true);
    expect(isDemoModeEnabled({ VITE_DEMO_MODE: 'true' })).toBe(true);
    expect(isDemoModeEnabled({ VITE_DEMO_MODE: 'false' })).toBe(false);
    expect(isDemoModeEnabled({ VITE_DEMO_MODE: ' FALSE ' })).toBe(false);
  });

  it('applies the persona override only when demo mode is enabled', () => {
    const on = buildSubject({ ...base, demoModeEnabled: true });
    expect(on.memberType).toBe('advisor');
    expect(on.roles.map((r) => r.role)).toEqual(['sysadmin', 'nat_rep']);
    const off = buildSubject({ ...base, demoModeEnabled: false });
    expect(off.memberType).toBe('active');
    expect(off.roles).toEqual([]);
  });

  it('never overrides the account status', () => {
    const suspended = buildSubject({ ...base, accountStatus: 'suspended', demoModeEnabled: true });
    expect(suspended.accountStatus).toBe('suspended');
  });

  it('resolves persona roles against the home chapter', () => {
    expect(personaRoles('chapter_chairman', 'ch-2')).toEqual([
      { role: 'ch_chairman', scope: { level: 'chapter', chapterIds: ['ch-2'] } },
    ]);
    expect(personaRoles('national_coordinator', 'ch-1')).toEqual([
      { role: 'nat_coord', scope: { level: 'national' } },
    ]);
    expect(personaRoles('active_member', 'ch-1')).toEqual([]);
    expect(demoOverrideFor('parent', 'ch-1', '2026-10-12T00:00:00.000Z').linkedMemberIds).toEqual([
      'u-member',
    ]);
  });

  it('offers one demo account per persona, hidden when demo mode is off', () => {
    expect(getDemoCredentials(true).map((c) => c.persona)).toEqual([...DEMO_PERSONAS]);
    expect(getDemoCredentials(false)).toHaveLength(0);
  });

  it('the repository refuses to switch personas when demo mode is off', async () => {
    const auth = createMockAuthRepository();
    await auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false });
    env.demoMode = false;
    await expect(auth.switchDemoRole('sysadmin')).rejects.toBeInstanceOf(ForbiddenError);
    const session = await auth.getSession();
    expect(session?.subject.roles).toEqual([]);
    expect(session?.demo).toEqual({ enabled: false, override: null });
  });

  it('switching updates the session subject immediately and can be reverted', async () => {
    const auth = createMockAuthRepository();
    await auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false });
    const switched = await auth.switchDemoRole('chapter_chairman');
    expect(switched.subject.memberType).toBe('advisor');
    expect(switched.subject.roles).toEqual([
      { role: 'ch_chairman', scope: { level: 'chapter', chapterIds: ['ch-1'] } },
    ]);
    expect(switched.assignments).toEqual([]);
    const back = await auth.switchDemoRole(null);
    expect(back.subject.memberType).toBe('active');
    expect(back.subject.roles).toEqual([]);
    expect(back.demo.override).toBeNull();
  });

  it('switching to your own persona clears the override', async () => {
    const auth = createMockAuthRepository();
    await auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false });
    await auth.switchDemoRole('parent');
    const own = await auth.switchDemoRole('active_member');
    expect(own.demo.override).toBeNull();
  });
});
