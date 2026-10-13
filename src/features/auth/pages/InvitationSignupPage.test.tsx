import { describe, expect, it } from 'vitest';

import { createMockInvitationRepository } from '@/data/mock/repositories/invitationRepository';
import { DEMO_INVITATION_TOKEN } from '@/data/mock/seed';
import { signInAs } from '@/data/mock/testing';
import { db } from '@/data/store';
import { clock } from '@/lib/clock';
import { renderWithProviders, screen, within } from '@/test';

import InvitationSignupPage from './InvitationSignupPage';

function renderInvite(token: string) {
  return renderWithProviders(<InvitationSignupPage />, {
    route: `/invite/${token}`,
    path: '/invite/:token',
    persona: null,
  });
}

type User = ReturnType<typeof renderInvite>['user'];

/** Finishes the prefilled flow: birth date, phone, password, consents, then the SMS code. */
async function completeInvitedSignup(user: User) {
  await user.type(
    screen.getByLabelText(/Date of birth/),
    `${clock.now().getUTCFullYear() - 16}-03-20`,
  );
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.type(await screen.findByLabelText('Phone'), '+359 888 000 222');
  await user.type(screen.getByLabelText('Password'), 'Test!Invite2026');
  await user.type(screen.getByLabelText('Confirm password'), 'Test!Invite2026');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(await screen.findByRole('checkbox', { name: /privacy notice/ }));
  await user.click(screen.getByRole('checkbox', { name: /terms of use/ }));
  await user.click(screen.getByRole('button', { name: 'Create account' }));

  const notice = await screen.findByText('Simulated codes');
  const box = notice.closest('[data-slot="info-notice"]') ?? notice.parentElement?.parentElement;
  const codes = within(box as HTMLElement).getAllByText(/^\d{6}$/);
  // Only the SMS code: following the link confirmed the email address.
  expect(codes).toHaveLength(1);
  expect(screen.getAllByRole('textbox')).toHaveLength(1);
  await user.type(screen.getByRole('textbox'), codes[0]?.textContent ?? '');
  await user.click(screen.getByRole('button', { name: 'Confirm' }));
}

describe('InvitationSignupPage', () => {
  it('shows who invited them and fixes the invited details', async () => {
    renderInvite(DEMO_INVITATION_TOKEN);
    expect(
      await screen.findByText(
        'Viktor Stoyanov invited you to join Sveta Sofia Chapter. Membership: Active member.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Accept your invitation' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Active member/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Chapter' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveValue('Stoyan');
    expect(screen.getByLabelText('DeM ID')).toHaveValue('DEM-BG-10950');
  });

  it('sends an officer’s invitee to verification', async () => {
    const { user } = renderInvite(DEMO_INVITATION_TOKEN);
    await screen.findByLabelText('First name');
    await completeInvitedSignup(user);
    expect(await screen.findByText('Your account is waiting for verification')).toBeInTheDocument();
    expect(db.get('invitations', 'inv-demo-1')?.status).toBe('accepted');
  });

  it('opens the account at once for an invitation from an approver', async () => {
    signInAs('national_coordinator');
    const invitation = await createMockInvitationRepository().create({
      email: 'mila.petrova@example.org',
      firstName: 'Mila',
      lastName: 'Petrova',
      memberType: 'active',
      chapterId: 'ch-2',
      demId: 'DEM-BG-40001',
      childDemId: null,
    });
    db.setMeta('session', null);
    const { user } = renderInvite(invitation.token);
    await screen.findByLabelText('First name');
    await completeInvitedSignup(user);
    expect(await screen.findByText('Your account is ready')).toBeInTheDocument();
    const credential = db.find('credentials', (c) => c.username === 'mila.petrova@example.org')[0];
    expect(db.get('users', credential?.id ?? '')?.status).toBe('active');
  });

  it('keeps the invited email address', async () => {
    const { user } = renderInvite(DEMO_INVITATION_TOKEN);
    await screen.findByLabelText('First name');
    await user.type(
      screen.getByLabelText(/Date of birth/),
      `${clock.now().getUTCFullYear() - 16}-03-20`,
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const email = await screen.findByLabelText('Email');
    expect(email).toBeDisabled();
    expect(email).toHaveValue('stoyan.marinov@example.org');
  });

  it('explains a link that no longer works', async () => {
    renderInvite('ffffffffffffffffffffffffffffffff');
    expect(await screen.findByText("This invitation link doesn't work")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup',
    );
  });
});
