import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, NotFoundError, type ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import type { InvitationInput, SignupInput } from '@/domain';
import { clock, setClock } from '@/lib/clock';

import { auditEntries, notificationsOf, signInAs } from '../testing';
import { createMockInvitationRepository } from './invitationRepository';
import { createMockSignupRepository } from './signupRepository';

const invitations = createMockInvitationRepository();
const signup = createMockSignupRepository();

const bornYearsAgo = (years: number) => `${clock.now().getUTCFullYear() - years}-01-15`;

function invite(overrides: Partial<InvitationInput> = {}) {
  return invitations.create({
    email: 'Boyan.Iliev@Example.org',
    firstName: 'Boyan',
    lastName: 'Iliev',
    memberType: 'active',
    chapterId: 'ch-1',
    demId: 'dem-bg-30001',
    childDemId: null,
    ...overrides,
  });
}

/** Signs out and completes the signup from an invitation link; returns the result. */
async function acceptWith(token: string, overrides: Partial<SignupInput> = {}) {
  const session = db.getMeta('session');
  db.setMeta('session', null);
  const preview = await invitations.preview(token);
  const ticket = await signup.start({
    memberType: preview.memberType,
    firstName: preview.firstName,
    lastName: preview.lastName,
    email: preview.email,
    phone: '+359 888 222 333',
    birthDate: bornYearsAgo(16),
    chapterId: preview.chapterId,
    demId: preview.demId,
    childDemId: preview.childDemId,
    password: 'Strong!Pass2026',
    consents: { privacy: true, terms: true, photo: true },
    invitationToken: token,
    ...overrides,
  });
  const result = await signup.verify({
    signupId: ticket.signupId,
    emailCode: '',
    phoneCode: ticket.simulatedPhoneCode,
  });
  db.setMeta('session', session);
  return { ticket, result };
}

const userByEmail = (email: string) =>
  db.find('credentials', (c) => c.username === email)[0]?.id ?? '';

describe('mock invitation repository', () => {
  it('lets roster managers and account approvers invite, not ordinary members', async () => {
    signInAs('active_member');
    expect(await invite().catch((e: unknown) => e)).toBeInstanceOf(ForbiddenError);
    signInAs('chapter_secretary');
    // A Secretary invites to their own chapter only.
    expect(await invite({ chapterId: 'ch-2' }).catch((e: unknown) => e)).toBeInstanceOf(
      ForbiddenError,
    );
    const view = await invite();
    expect(view).toMatchObject({
      email: 'boyan.iliev@example.org',
      demId: 'DEM-BG-30001',
      status: 'pending',
      preApproved: false,
    });
    expect(view.link).toBe(`/invite/${view.token}`);
    expect(view.token).toMatch(/^[0-9a-f]{32}$/);
    expect(auditEntries('invitation.created', view.id)).toHaveLength(1);
  });

  it('refuses existing members and a second open invitation', async () => {
    signInAs('national_coordinator');
    const existing = db.get('members', 'u-member')?.private.email ?? '';
    expect(await invite({ email: existing }).catch((e: unknown) => e)).toMatchObject({
      reasonKey: 'invitations.errors.alreadyMember',
    });
    await invite();
    const again = await invite().catch((e: unknown) => e);
    expect(again).toBeInstanceOf(ConflictError);
    expect(again).toMatchObject({ reasonKey: 'invitations.errors.alreadyInvited' });
  });

  it('previews a live link, and not a revoked or expired one', async () => {
    signInAs('national_coordinator');
    const view = await invite();
    db.setMeta('session', null);
    expect(await invitations.preview(view.token)).toMatchObject({
      firstName: 'Boyan',
      memberType: 'active',
      chapterId: 'ch-1',
      preApproved: true,
    });
    signInAs('national_coordinator');
    await invitations.revoke(view.id);
    expect(await invitations.preview(view.token).catch((e: unknown) => e)).toBeInstanceOf(
      NotFoundError,
    );
    const second = await invite({ email: 'second@example.org' });
    setClock(new Date(Date.parse(second.expiresAt) + 1000));
    expect((await invitations.list()).find((i) => i.id === second.id)?.status).toBe('expired');
    expect(await invitations.preview(second.token).catch((e: unknown) => e)).toBeInstanceOf(
      NotFoundError,
    );
  });

  it('opens the account at once when the inviter may approve accounts', async () => {
    signInAs('national_coordinator');
    const view = await invite();
    const { ticket, result } = await acceptWith(view.token);
    expect(ticket.simulatedEmailCode).toBeNull();
    expect(result).toEqual({ status: 'active', username: 'boyan.iliev@example.org' });
    const userId = userByEmail('boyan.iliev@example.org');
    expect(db.get('users', userId)?.status).toBe('active');
    expect(db.get('members', userId)?.demId).toBe('DEM-BG-30001');
    expect(db.get('invitations', view.id)).toMatchObject({
      status: 'accepted',
      acceptedUserId: userId,
    });
    expect(auditEntries('account.approved', userId)[0]?.metadata).toMatchObject({
      via: 'invitation',
    });
    expect(notificationsOf('u-national-officer')[0]?.title).toMatchObject({
      key: 'messages.notifications.invitationAccepted.title',
    });
  });

  it('sends an officer’s invitation to the verification queue', async () => {
    signInAs('chapter_secretary');
    const view = await invite();
    const { result } = await acceptWith(view.token);
    expect(result.status).toBe('pending_verification');
    const userId = userByEmail('boyan.iliev@example.org');
    expect(db.get('signupRequests', userId)).toMatchObject({ invitedBy: 'u-officer' });
  });

  it('keeps the invited email, member type and chapter', async () => {
    signInAs('national_coordinator');
    const view = await invite();
    db.setMeta('session', null);
    const error = await acceptWith(view.token, {
      email: 'someone.else@example.org',
      chapterId: 'ch-2',
    }).catch((e: unknown) => e);
    expect((error as ValidationError).fieldErrors).toEqual({
      email: 'invitations.errors.emailMismatch',
      chapterId: 'invitations.errors.fixed',
    });
  });

  it('cannot be used twice', async () => {
    signInAs('national_coordinator');
    const view = await invite();
    await acceptWith(view.token);
    const again = await acceptWith(view.token, { email: 'boyan.iliev@example.org' }).catch(
      (e: unknown) => e,
    );
    expect(again).toBeInstanceOf(NotFoundError);
  });
});
