import { describe, expect, it } from 'vitest';

import { DEMO_CREDENTIALS } from '@/auth/demoCredentials';
import {
  ForbiddenError,
  RateLimitedError,
  UnauthorizedError,
  ValidationError,
} from '@/data/errors';
import { db } from '@/data/store';
import { setClock } from '@/lib/clock';

import { createMockAuthRepository, LOCKOUT_SECONDS, MAX_FAILED_ATTEMPTS } from './authRepository';

const auth = createMockAuthRepository();

describe('mock auth repository', () => {
  it.each(DEMO_CREDENTIALS.map((c) => [c.role, c.username, c.password, c.userId] as const))(
    'signs in the %s demo account',
    async (role, username, password, userId) => {
      const session = await auth.login({ username, password, remember: true });
      expect(session.user.id).toBe(userId);
      expect(session.subject.role).toBe(role);
      expect(session.member.importedPosition?.isDemoData).toBe(true);
      expect(session.member.private.email).toMatch(/@example\.org$/);
      expect(await auth.getSession()).toMatchObject({ user: { id: userId } });
    },
  );

  it('is case-insensitive for usernames and records last login', async () => {
    const session = await auth.login({
      username: '  Officer.Demo ',
      password: 'Demo!Officer2026',
      remember: false,
    });
    expect(session.user.lastLoginAt).not.toBeNull();
    expect(
      db.list('auditLog').some((e) => e.action === 'auth.login' && e.entityId === 'u-officer'),
    ).toBe(true);
  });

  it('validates required fields with translatable keys', async () => {
    const error = await auth
      .login({ username: '', password: '', remember: false })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toEqual({
      username: 'validation.required',
      password: 'validation.required',
    });
  });

  it('uses one generic error for unknown users and wrong passwords (no enumeration)', async () => {
    const unknown = await auth
      .login({ username: 'nobody', password: 'x', remember: false })
      .catch((e: unknown) => e);
    const wrong = await auth
      .login({ username: 'member.demo', password: 'wrong', remember: false })
      .catch((e: unknown) => e);
    expect(unknown).toBeInstanceOf(UnauthorizedError);
    expect(wrong).toBeInstanceOf(UnauthorizedError);
    expect((unknown as UnauthorizedError).messageKey).toBe((wrong as UnauthorizedError).messageKey);
    expect((wrong as UnauthorizedError).messageKey).toBe('common.errors.invalidCredentials');
  });

  it(`locks sign-in for ${LOCKOUT_SECONDS}s after ${MAX_FAILED_ATTEMPTS} failed attempts`, async () => {
    const start = new Date('2026-10-12T09:00:00.000Z');
    setClock(start);
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i += 1) {
      await expect(
        auth.login({ username: 'member.demo', password: 'nope', remember: false }),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    }
    await expect(
      auth.login({ username: 'member.demo', password: 'nope', remember: false }),
    ).rejects.toBeInstanceOf(RateLimitedError);
    // Even the correct password is refused while locked.
    const locked = await auth
      .login({ username: 'member.demo', password: 'Demo!Member2026', remember: false })
      .catch((e: unknown) => e);
    expect(locked).toBeInstanceOf(RateLimitedError);
    expect((locked as RateLimitedError).retryAfterSeconds).toBe(LOCKOUT_SECONDS);
    setClock(new Date(start.getTime() + (LOCKOUT_SECONDS + 1) * 1000));
    await expect(
      auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false }),
    ).resolves.toMatchObject({
      user: { id: 'u-member' },
    });
  });

  it('refuses suspended and pending accounts after a valid password', async () => {
    db.update('users', 'u-member', { status: 'suspended' });
    await expect(
      auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false }),
    ).rejects.toMatchObject({
      reason: 'account_suspended',
    });
    db.update('users', 'u-member', { status: 'pending' });
    const pending = await auth
      .login({ username: 'member.demo', password: 'Demo!Member2026', remember: false })
      .catch((e: unknown) => e);
    expect(pending).toBeInstanceOf(ForbiddenError);
    expect((pending as ForbiddenError).reason).toBe('account_pending');
  });

  it('ends the session on logout', async () => {
    await auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false });
    await auth.logout();
    expect(await auth.getSession()).toBeNull();
  });

  it('changes the password with validation', async () => {
    await auth.login({ username: 'member.demo', password: 'Demo!Member2026', remember: false });
    await expect(
      auth.changePassword({ currentPassword: 'bad', newPassword: 'New!Password2026' }),
    ).rejects.toMatchObject({
      fieldErrors: { currentPassword: 'common.errors.currentPasswordIncorrect' },
    });
    await expect(
      auth.changePassword({ currentPassword: 'Demo!Member2026', newPassword: 'short' }),
    ).rejects.toMatchObject({
      fieldErrors: { newPassword: 'validation.passwordTooWeak' },
    });
    await auth.changePassword({
      currentPassword: 'Demo!Member2026',
      newPassword: 'New!Password2026',
    });
    await auth.logout();
    await expect(
      auth.login({ username: 'member.demo', password: 'New!Password2026', remember: false }),
    ).resolves.toBeTruthy();
  });

  it('simulates password recovery with an on-screen code', async () => {
    const ticket = await auth.requestPasswordReset({ identifier: 'advisor.demo' });
    expect(ticket.delivery).toBe('simulated');
    expect(ticket.simulatedCode).toMatch(/^\d{6}$/);
    await expect(
      auth.resetPassword({
        identifier: 'advisor.demo',
        code: '000000' === ticket.simulatedCode ? '111111' : '000000',
        newPassword: 'Reset!Pass2026',
      }),
    ).rejects.toMatchObject({ fieldErrors: { code: 'common.errors.invalidResetCode' } });
    await auth.resetPassword({
      identifier: 'advisor.demo',
      code: ticket.simulatedCode,
      newPassword: 'Reset!Pass2026',
    });
    await expect(
      auth.login({ username: 'advisor.demo', password: 'Reset!Pass2026', remember: false }),
    ).resolves.toMatchObject({
      user: { id: 'u-advisor' },
    });
  });

  it('never reveals whether an account exists when requesting a reset', async () => {
    const ticket = await auth.requestPasswordReset({ identifier: 'ghost.user' });
    expect(ticket.simulatedCode).toMatch(/^\d{6}$/);
    await expect(
      auth.resetPassword({
        identifier: 'ghost.user',
        code: ticket.simulatedCode,
        newPassword: 'Reset!Pass2026',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
