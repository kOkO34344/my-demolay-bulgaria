import { describe, expect, it } from 'vitest';

import { db } from '@/data/store';
import { axeViolations, renderWithProviders, screen, summarizeViolations, within } from '@/test';

import InvitationsPage from './InvitationsPage';

function renderPage(persona: 'chapter_secretary' | 'national_coordinator' = 'chapter_secretary') {
  return renderWithProviders(<InvitationsPage />, {
    route: '/invitations',
    path: '/invitations',
    persona,
  });
}

describe('InvitationsPage', () => {
  it('lists open invitations with who sent them', async () => {
    renderPage();
    const heading = await screen.findByRole('heading', { level: 2, name: 'Stoyan Marinov' });
    const card = heading.closest('article') as HTMLElement;
    expect(within(card).getByText('Pending')).toBeInTheDocument();
    expect(within(card).getByText(/Invited by Viktor Stoyanov/)).toBeInTheDocument();
    expect(
      within(card).getByRole('button', { name: 'Copy link for Stoyan Marinov' }),
    ).toBeInTheDocument();
  });

  it('creates an invitation and shows the link to share', async () => {
    const { user } = renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Stoyan Marinov' });
    await user.click(screen.getByRole('button', { name: 'Invite someone' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite someone to join' });
    // The Secretary's only chapter is chosen for them.
    expect(within(dialog).getByRole('combobox', { name: 'Chapter' })).toHaveTextContent(
      'Sveta Sofia Chapter',
    );
    await user.type(within(dialog).getByLabelText('First name'), 'Boyan');
    await user.type(within(dialog).getByLabelText('Last name'), 'Iliev');
    await user.type(within(dialog).getByLabelText('Email'), 'boyan.iliev@example.org');
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }));

    const ready = await screen.findByRole('dialog', { name: 'Invitation ready' });
    const invitation = db.find('invitations', (i) => i.email === 'boyan.iliev@example.org')[0];
    expect(
      within(ready).getByText(new RegExp(`/invite/${invitation?.token}$`)),
    ).toBeInTheDocument();
    expect(
      within(ready).getByText('After they sign up, an administrator verifies the account.'),
    ).toBeInTheDocument();
  });

  it('explains when the email already belongs to an account', async () => {
    const { user } = renderPage('national_coordinator');
    await screen.findByRole('heading', { level: 2, name: 'Stoyan Marinov' });
    await user.click(screen.getByRole('button', { name: 'Invite someone' }));
    const dialog = await screen.findByRole('dialog', { name: 'Invite someone to join' });
    await user.type(within(dialog).getByLabelText('First name'), 'Martin');
    await user.type(within(dialog).getByLabelText('Last name'), 'Georgiev');
    await user.type(
      within(dialog).getByLabelText('Email'),
      db.get('members', 'u-member')?.private.email ?? '',
    );
    await user.click(within(dialog).getByRole('combobox', { name: 'Chapter' }));
    await user.click(await screen.findByRole('option', { name: 'Sveta Sofia Chapter' }));
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }));
    expect(
      await within(dialog).findByText('This email address already belongs to an account.'),
    ).toBeInTheDocument();
  });

  it('revokes an open invitation after confirmation', async () => {
    const { user } = renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Stoyan Marinov' });
    await user.click(
      screen.getByRole('button', { name: 'Revoke the invitation for Stoyan Marinov' }),
    );
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Revoke' }));
    expect(await screen.findByText('Invitation for Stoyan Marinov revoked.')).toBeInTheDocument();
    expect(db.get('invitations', 'inv-demo-1')?.status).toBe('revoked');
  });

  it('has no axe violations', async () => {
    const { container } = renderPage();
    await screen.findByRole('heading', { level: 2, name: 'Stoyan Marinov' });
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});
