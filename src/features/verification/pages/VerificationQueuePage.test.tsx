import { describe, expect, it } from 'vitest';

import { db } from '@/data/store';
import { axeViolations, renderWithProviders, screen, summarizeViolations, within } from '@/test';

import VerificationQueuePage from './VerificationQueuePage';

function renderQueue(
  persona: 'national_coordinator' | 'chapter_chairman' = 'national_coordinator',
) {
  return renderWithProviders(<VerificationQueuePage />, {
    route: '/verification',
    path: '/verification',
    persona,
  });
}

function card(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 2, name });
  return heading.closest('article') as HTMLElement;
}

describe('VerificationQueuePage', () => {
  it('lists pending accounts with their automatic checks', async () => {
    renderQueue();
    expect(await screen.findByText('2 accounts are waiting.')).toBeInTheDocument();
    const member = card('Lyubomir Nedelchev');
    expect(within(member).getByText('Active member')).toBeInTheDocument();
    expect(within(member).getByText(/Aged 14, which fits the member type/)).toBeInTheDocument();
    expect(within(member).getByText('No other account uses this DeM ID.')).toBeInTheDocument();
    const parent = card('Plamen Genov');
    expect(within(parent).getByText(/Child found: Konstantin Genov/)).toBeInTheDocument();
  });

  it('approves an account after confirmation', async () => {
    const { user } = renderQueue();
    await screen.findByText('2 accounts are waiting.');
    await user.click(screen.getByRole('button', { name: 'Review Lyubomir Nedelchev' }));
    const drawer = await screen.findByRole('dialog', { name: 'Lyubomir Nedelchev' });
    expect(within(drawer).getByText('DEM-BG-00011')).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: 'Approve' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Approve Lyubomir Nedelchev?' });
    await user.click(within(confirm).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText('Lyubomir Nedelchev approved.')).toBeInTheDocument();
    expect(await screen.findByText('1 account is waiting.')).toBeInTheDocument();
    expect(db.get('users', 'u-s11')?.status).toBe('active');
  });

  it('rejects only with a reason of at least 5 characters', async () => {
    const { user } = renderQueue();
    await screen.findByText('2 accounts are waiting.');
    await user.click(screen.getByRole('button', { name: 'Review Plamen Genov' }));
    const drawer = await screen.findByRole('dialog', { name: 'Plamen Genov' });
    await user.click(within(drawer).getByRole('button', { name: 'Reject' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Reject Plamen Genov?' });
    await user.type(within(confirm).getByLabelText('Reason'), 'no');
    await user.click(within(confirm).getByRole('button', { name: 'Reject' }));
    expect(
      await within(confirm).findByText('Give a reason of at least 5 characters.'),
    ).toBeInTheDocument();
    await user.type(within(confirm).getByLabelText('Reason'), 't on the member list');
    await user.click(within(confirm).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('Signup of Plamen Genov rejected.')).toBeInTheDocument();
    expect(db.get('users', 'u-par4')).toBeUndefined();
  });

  it('is closed to people who cannot approve accounts', async () => {
    renderQueue('chapter_chairman');
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderQueue();
    await screen.findByText('2 accounts are waiting.');
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});
