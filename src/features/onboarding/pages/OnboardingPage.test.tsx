import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { OnboardingGate } from '@/components/layout/OnboardingGate';
import { DEMO_USER_IDS } from '@/data/mock/seed/demoAccounts';
import { db } from '@/data/store';
import HomePage from '@/features/home/pages/HomePage';
import { axeViolations, renderWithProviders, screen, summarizeViolations, within } from '@/test';

import OnboardingPage from './OnboardingPage';

/** A member who has not answered yet (like a freshly approved signup). */
function forget(persona: keyof typeof DEMO_USER_IDS) {
  db.remove('onboarding', DEMO_USER_IDS[persona]);
}

function renderApp(route: string, persona: 'active_member' | 'parent' = 'active_member') {
  return renderWithProviders(
    <OnboardingGate>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/events" element={<p>Events screen</p>} />
      </Routes>
    </OnboardingGate>,
    { route, persona },
  );
}

describe('onboarding', () => {
  it('sends a member who has not answered to the questions, then back where they were', async () => {
    forget('active_member');
    const { user } = renderApp('/events');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome, Martin' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/age group/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save answers' }));
    const interests = screen.getByRole('group', { name: 'What would you like to do in DeMolay?' });
    expect(within(interests).getByText('Choose at least one.')).toBeInTheDocument();
    expect(interests).toHaveFocus();

    await user.click(within(interests).getByRole('checkbox', { name: 'Sports' }));
    const times = screen.getByRole('group', { name: 'When are you usually free?' });
    await user.click(within(times).getByRole('checkbox', { name: 'Saturdays' }));
    await user.click(screen.getByRole('button', { name: 'Save answers' }));

    expect(await screen.findByText('Events screen')).toBeInTheDocument();
    expect(db.get('onboarding', DEMO_USER_IDS.active_member)).toMatchObject({
      interests: ['sports'],
      availability: ['saturdays'],
    });
  });

  it('asks parents only about time and help, not interests', async () => {
    forget('parent');
    renderApp('/onboarding', 'parent');
    await screen.findByRole('group', { name: 'When are you usually free? (Optional)' });
    expect(screen.queryByRole('group', { name: /What would you like/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Driving members to events' })).toBeInTheDocument();
  });

  it('"Later" stops the redirect and leaves a reminder on Home', async () => {
    forget('active_member');
    const { user } = renderApp('/');
    await user.click(await screen.findByRole('button', { name: 'Later' }));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Tell us what you are into' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Answer now' })).toHaveAttribute('href', '/onboarding');
  });

  it('leaves members who already answered alone', async () => {
    renderApp('/events');
    expect(await screen.findByText('Events screen')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    forget('active_member');
    const { container } = renderApp('/onboarding');
    await screen.findByRole('button', { name: 'Save answers' });
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});
