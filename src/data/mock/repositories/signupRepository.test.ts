import { describe, expect, it } from 'vitest';

import { NotFoundError, ValidationError } from '@/data/errors';
import { DEMO_USER_IDS } from '@/data/mock/seed/demoAccounts';
import { db } from '@/data/store';
import type { SignupInput } from '@/domain';
import { clock, setClock } from '@/lib/clock';

import { auditEntries, notificationsOf } from '../testing';
import { createMockAuthRepository } from './authRepository';
import { createMockSignupRepository, MAX_SIGNUP_ATTEMPTS } from './signupRepository';

const signup = createMockSignupRepository();
const auth = createMockAuthRepository();

/** A birth date `years` years before today (Sofia calendar is irrelevant at this granularity). */
function bornYearsAgo(years: number): string {
  const now = clock.now();
  return `${now.getUTCFullYear() - years}-01-15`;
}

function input(overrides: Partial<SignupInput> = {}): SignupInput {
  return {
    memberType: 'active',
    firstName: 'Kalin',
    lastName: 'Petrov',
    email: 'Kalin.Petrov@Example.org',
    phone: '+359 888 123 456',
    birthDate: bornYearsAgo(16),
    chapterId: 'ch-1',
    demId: 'dem-bg-20001',
    childDemId: null,
    password: 'Strong!Pass2026',
    consents: { privacy: true, terms: true, photo: false },
    ...overrides,
  };
}

async function completeSignup(overrides: Partial<SignupInput> = {}) {
  const ticket = await signup.start(input(overrides));
  const result = await signup.verify({
    signupId: ticket.signupId,
    emailCode: ticket.simulatedEmailCode,
    phoneCode: ticket.simulatedPhoneCode,
  });
  return { ticket, result };
}

function accountFor(email: string) {
  const credential = db.find('credentials', (c) => c.username === email)[0];
  return credential
    ? {
        user: db.get('users', credential.id),
        member: db.get('members', credential.id),
        request: db.get('signupRequests', credential.id),
      }
    : null;
}

describe('mock signup repository', () => {
  it('offers the active chapters and the consent document versions', async () => {
    const options = await signup.options();
    expect(options.chapters.map((c) => c.id)).toContain('ch-1');
    expect(options.consentVersions).toEqual({
      privacy: '2026-09',
      terms: '2026-09',
      photo: '2026-09',
    });
  });

  it('creates nothing until both codes are confirmed', async () => {
    const ticket = await signup.start(input());
    expect(ticket.simulatedEmailCode).toMatch(/^\d{6}$/);
    expect(ticket.simulatedPhoneCode).toMatch(/^\d{6}$/);
    expect(ticket.email).toBe('kalin.petrov@example.org');
    expect(accountFor('kalin.petrov@example.org')).toBeNull();
  });

  it('creates a pending account with consents, the request and an audit entry', async () => {
    const { result } = await completeSignup();
    expect(result).toEqual({
      status: 'pending_verification',
      username: 'kalin.petrov@example.org',
    });
    const account = accountFor('kalin.petrov@example.org');
    expect(account?.user?.status).toBe('pending');
    expect(account?.member).toMatchObject({
      memberType: 'active',
      chapterId: 'ch-1',
      demId: null,
      displayName: { en: 'Kalin Petrov', bg: 'Kalin Petrov' },
    });
    expect(account?.member?.private.consents.map((c) => [c.kind, c.version])).toEqual([
      ['privacy', '2026-09'],
      ['terms', '2026-09'],
    ]);
    expect(account?.request).toMatchObject({ claimedDemId: 'DEM-BG-20001', childDemId: null });
    expect(auditEntries('account.signup_submitted', account?.user?.id)).toHaveLength(1);
  });

  it('notifies the people who may verify the account', async () => {
    await completeSignup();
    const [latest] = notificationsOf(DEMO_USER_IDS.national_coordinator);
    expect(latest).toMatchObject({
      category: 'approvals',
      link: { to: '/verification' },
      title: { key: 'messages.notifications.signupSubmitted.title' },
    });
    // An ordinary member is not told.
    expect(notificationsOf(DEMO_USER_IDS.active_member)[0]?.category).not.toBe('approvals');
  });

  it('keeps the new account locked until it is verified', async () => {
    await completeSignup();
    const error = await auth
      .login({ username: 'kalin.petrov@example.org', password: 'Strong!Pass2026', remember: false })
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ reason: 'account_pending' });
  });

  it('rejects ages that do not fit the member type and missing consents', async () => {
    const error = await signup
      .start(
        input({
          birthDate: bornYearsAgo(13),
          consents: { privacy: false, terms: true, photo: true },
        }),
      )
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toMatchObject({
      birthDate: 'signup.errors.tooYoung',
      'consents.privacy': 'signup.errors.consentRequired',
    });
  });

  it('asks parents for their child’s DeM ID instead of their own', async () => {
    const error = await signup
      .start(input({ memberType: 'parent', birthDate: bornYearsAgo(45), demId: null }))
      .catch((e: unknown) => e);
    expect((error as ValidationError).fieldErrors).toEqual({
      childDemId: 'signup.errors.childDemIdRequired',
    });
    await completeSignup({
      memberType: 'parent',
      birthDate: bornYearsAgo(45),
      demId: 'IGNORED-1',
      childDemId: 'DEM-BG-10421',
    });
    expect(accountFor('kalin.petrov@example.org')?.request).toMatchObject({
      claimedDemId: null,
      childDemId: 'DEM-BG-10421',
    });
  });

  it('reports wrong codes per field and discards the signup after too many attempts', async () => {
    const ticket = await signup.start(input());
    const wrong = { signupId: ticket.signupId, emailCode: '000000', phoneCode: '000000' };
    if (ticket.simulatedEmailCode === '000000') wrong.emailCode = '111111';
    if (ticket.simulatedPhoneCode === '000000') wrong.phoneCode = '111111';
    const first = await signup.verify(wrong).catch((e: unknown) => e);
    expect((first as ValidationError).fieldErrors).toEqual({
      emailCode: 'signup.errors.wrongCode',
      phoneCode: 'signup.errors.wrongCode',
    });
    for (let attempt = 2; attempt < MAX_SIGNUP_ATTEMPTS; attempt += 1) {
      await signup.verify(wrong).catch(() => undefined);
    }
    const last = await signup.verify(wrong).catch((e: unknown) => e);
    expect((last as ValidationError).formErrorKey).toBe('signup.errors.tooManyAttempts');
    const gone = await signup
      .verify({
        signupId: ticket.signupId,
        emailCode: ticket.simulatedEmailCode,
        phoneCode: ticket.simulatedPhoneCode,
      })
      .catch((e: unknown) => e);
    expect(gone).toBeInstanceOf(NotFoundError);
  });

  it('expires the codes after 30 minutes and issues new ones on resend', async () => {
    const ticket = await signup.start(input());
    setClock(new Date(Date.parse(ticket.expiresAt) - 1000));
    const fresh = await signup.resend(ticket.signupId);
    expect(Date.parse(fresh.expiresAt)).toBeGreaterThan(Date.parse(ticket.expiresAt));
    setClock(new Date(Date.parse(fresh.expiresAt) + 1000));
    expect(await signup.resend(ticket.signupId).catch((e: unknown) => e)).toBeInstanceOf(
      NotFoundError,
    );
  });

  it('never reveals an existing account and never creates a second one', async () => {
    const existing = db.get('members', DEMO_USER_IDS.active_member);
    const email = existing?.private.email ?? '';
    const before = db.count('users');
    const { result } = await completeSignup({ email });
    expect(result).toEqual({ status: 'pending_verification', username: email });
    expect(db.count('users')).toBe(before);
  });
});
