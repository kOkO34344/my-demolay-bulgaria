import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, NotFoundError, type ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import type { SignupInput } from '@/domain';
import { clock } from '@/lib/clock';

import { auditEntries, notificationsOf, signInAs } from '../testing';
import { createMockAuthRepository } from './authRepository';
import { createMockSignupRepository } from './signupRepository';
import { createMockVerificationRepository } from './verificationRepository';

const verifications = createMockVerificationRepository();
const signup = createMockSignupRepository();
const auth = createMockAuthRepository();

const bornYearsAgo = (years: number) => `${clock.now().getUTCFullYear() - years}-01-15`;

/** Runs a full signup (signed out) and returns the new pending user id. */
async function signUp(overrides: Partial<SignupInput> = {}): Promise<string> {
  const session = db.getMeta('session');
  db.setMeta('session', null);
  const email = overrides.email ?? 'new.member@example.org';
  const ticket = await signup.start({
    memberType: 'active',
    firstName: 'Kalin',
    lastName: 'Petrov',
    email,
    phone: '+359 888 123 456',
    birthDate: bornYearsAgo(16),
    chapterId: 'ch-1',
    demId: 'DEM-BG-20001',
    childDemId: null,
    password: 'Strong!Pass2026',
    consents: { privacy: true, terms: true, photo: true },
    ...overrides,
  });
  await signup.verify({
    signupId: ticket.signupId,
    emailCode: ticket.simulatedEmailCode ?? '',
    phoneCode: ticket.simulatedPhoneCode,
  });
  db.setMeta('session', session);
  return db.find('credentials', (c) => c.username === email)[0]?.id ?? '';
}

describe('mock verification repository', () => {
  it('is only for holders of account.verify', async () => {
    signInAs('chapter_chairman');
    expect(await verifications.list().catch((e: unknown) => e)).toBeInstanceOf(ForbiddenError);
    signInAs('active_member');
    expect(await verifications.list().catch((e: unknown) => e)).toBeInstanceOf(ForbiddenError);
  });

  it('lists the seeded pending accounts oldest first, with checks', async () => {
    signInAs('national_coordinator');
    const queue = await verifications.list();
    expect(queue.map((r) => r.userId)).toEqual(['u-s11', 'u-par4']);
    const [member, parent] = queue;
    expect(member?.checks).toMatchObject({ ageProblem: null, demIdHolder: null, child: null });
    expect(member?.checks.age).toBe(14);
    expect(parent?.memberType).toBe('parent');
    expect(parent?.checks.child).toMatchObject({ id: 'u-t03' });
  });

  it('flags a DeM ID that already belongs to someone and an age that does not fit', async () => {
    const userId = await signUp({ demId: 'DEM-BG-10421', birthDate: bornYearsAgo(25) });
    signInAs('sysadmin');
    const row = (await verifications.list()).find((r) => r.userId === userId);
    expect(row?.checks.demIdHolder?.id).toBe('u-member');
    expect(row?.checks.ageProblem).toBe('signup.checks.activeTooOld');
  });

  it('approves: the account opens, the DeM ID is recorded and the member is told', async () => {
    const userId = await signUp();
    signInAs('national_coordinator');
    const result = await verifications.decide({ userId, decision: 'approve', reason: '' });
    expect(result).toMatchObject({ userId, decision: 'approve' });
    expect(db.get('users', userId)?.status).toBe('active');
    expect(db.get('members', userId)?.demId).toBe('DEM-BG-20001');
    expect(db.get('signupRequests', userId)).toBeUndefined();
    expect(auditEntries('account.approved', userId)).toHaveLength(1);
    expect(notificationsOf(userId)[0]?.title).toMatchObject({
      key: 'messages.notifications.accountVerified.title',
    });
    const session = await auth.login({
      username: 'new.member@example.org',
      password: 'Strong!Pass2026',
      remember: false,
    });
    expect(session.member.memberType).toBe('active');
  });

  it('approves a parent by linking the child found by DeM ID', async () => {
    signInAs('sysadmin');
    await verifications.decide({ userId: 'u-par4', decision: 'approve', reason: '' });
    expect(db.get('members', 'u-par4')?.linkedMemberIds).toEqual(['u-t03']);
    expect(db.get('users', 'u-par4')?.status).toBe('active');
  });

  it('will not approve a parent whose child is unknown', async () => {
    const userId = await signUp({
      memberType: 'parent',
      birthDate: bornYearsAgo(45),
      demId: null,
      childDemId: 'DEM-BG-99999',
    });
    signInAs('sysadmin');
    const row = (await verifications.list()).find((r) => r.userId === userId);
    expect(row?.checks.child).toBeNull();
    const error = await verifications
      .decide({ userId, decision: 'approve', reason: '' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect(db.get('users', userId)?.status).toBe('pending');
  });

  it('rejects with a reason: the account and its personal data are deleted, the decision kept', async () => {
    const userId = await signUp();
    signInAs('national_coordinator');
    const noReason = await verifications
      .decide({ userId, decision: 'reject', reason: '' })
      .catch((e: unknown) => e);
    expect((noReason as ValidationError).fieldErrors).toEqual({ reason: 'validation.required' });

    await verifications.decide({ userId, decision: 'reject', reason: 'Not on the member list' });
    expect(db.get('users', userId)).toBeUndefined();
    expect(db.get('members', userId)).toBeUndefined();
    expect(db.get('credentials', userId)).toBeUndefined();
    expect(db.get('signupRequests', userId)).toBeUndefined();
    const [entry] = auditEntries('account.rejected', userId);
    expect(entry?.summary).toMatchObject({
      key: 'messages.audit.accountRejected',
      params: { reason: 'Not on the member list' },
    });
  });

  it('cannot decide the same account twice', async () => {
    const userId = await signUp();
    signInAs('sysadmin');
    await verifications.decide({ userId, decision: 'approve', reason: '' });
    const again = await verifications
      .decide({ userId, decision: 'reject', reason: 'Changed my mind' })
      .catch((e: unknown) => e);
    expect(again).toBeInstanceOf(NotFoundError);
  });
});
