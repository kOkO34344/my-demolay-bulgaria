import { afterEach, describe, expect, it } from 'vitest';

import { ForbiddenError } from '@/data/errors';
import { createMockAuthRepository } from '@/data/mock/repositories/authRepository';
import { env } from '@/lib/env';

import { getDemoCredentials } from './demoCredentials';
import { buildSubject, demoScopeFor, isDemoModeEnabled } from './subject';

const assignment = {
  userId: 'u-member',
  role: 'member' as const,
  scope: { level: 'chapter' as const, chapterIds: ['ch-1'] },
};
const override = {
  role: 'national_admin' as const,
  scope: { level: 'system' as const },
  switchedAt: '2026-10-12T00:00:00.000Z',
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

  it('applies the role override only when demo mode is enabled', () => {
    const base = {
      assignment,
      homeChapterId: 'ch-1',
      specialAssignments: [],
      demoOverride: override,
    };
    expect(buildSubject({ ...base, demoModeEnabled: true }).role).toBe('national_admin');
    const off = buildSubject({ ...base, demoModeEnabled: false });
    expect(off.role).toBe('member');
    expect(off.scope).toEqual({ level: 'chapter', chapterIds: ['ch-1'] });
  });

  it('maps every role to a representative scope', () => {
    expect(demoScopeFor('member', 'ch-2')).toEqual({ level: 'chapter', chapterIds: ['ch-2'] });
    expect(demoScopeFor('chapter_advisor', 'ch-1')).toEqual({
      level: 'chapter',
      chapterIds: ['ch-1'],
    });
    expect(demoScopeFor('national_officer', 'ch-1')).toEqual({ level: 'national' });
    expect(demoScopeFor('national_admin', 'ch-1')).toEqual({ level: 'system' });
  });

  it('hides demo credentials when demo mode is off', () => {
    expect(getDemoCredentials(true)).toHaveLength(5);
    expect(getDemoCredentials(false)).toHaveLength(0);
  });

  it('the repository refuses to switch roles when demo mode is off', async () => {
    const auth = createMockAuthRepository();
    await auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false });
    env.demoMode = false;
    await expect(auth.switchDemoRole('national_admin')).rejects.toBeInstanceOf(ForbiddenError);
    const session = await auth.getSession();
    expect(session?.subject.role).toBe('member');
    expect(session?.demo).toEqual({ enabled: false, override: null });
  });

  it('switching updates the session subject immediately and can be reverted', async () => {
    const auth = createMockAuthRepository();
    await auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false });
    const switched = await auth.switchDemoRole('chapter_advisor');
    expect(switched.subject.role).toBe('chapter_advisor');
    expect(switched.subject.scope).toEqual({ level: 'chapter', chapterIds: ['ch-1'] });
    expect(switched.assignment.role).toBe('member');
    const back = await auth.switchDemoRole(null);
    expect(back.subject.role).toBe('member');
    expect(back.demo.override).toBeNull();
  });
});
