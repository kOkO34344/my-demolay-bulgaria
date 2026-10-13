import { describe, expect, it, vi } from 'vitest';

import { DEMO_USER_IDS } from '@/data/mock/seed/demoAccounts';
import { db } from '@/data/store';
import { axeViolations, renderWithProviders, screen, summarizeViolations, within } from '@/test';

import EventDetailPage from './EventDetailPage';
import EventsPage from './EventsPage';

const MEMBER = DEMO_USER_IDS.active_member;

function renderDetail(eventId: string, persona: 'active_member' | 'parent' = 'active_member') {
  return renderWithProviders(<EventDetailPage />, {
    route: `/events/${eventId}`,
    path: '/events/:eventId',
    persona,
  });
}

function myRsvp(eventId: string) {
  return db.find('rsvps', (r) => r.eventId === eventId && r.userId === MEMBER)[0]?.status ?? null;
}

describe('EventsPage', () => {
  it('lists upcoming events under month headings, soonest first', async () => {
    renderWithProviders(<EventsPage />, { route: '/events', path: '/events' });
    const firstMonth = await screen.findAllByRole('heading', { level: 2 });
    expect(firstMonth[0]?.textContent).toMatch(/\d{4}/);
    const study = screen.getByRole('link', { name: 'Exam study session' });
    const meeting = screen.getByRole('link', { name: 'Working meeting: public speaking' });
    expect(study.compareDocumentPosition(meeting) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const hike = screen.getByRole('link', { name: 'Hiking day on Vitosha' }).closest('article');
    expect(within(hike as HTMLElement).getByText('Cancelled')).toBeInTheDocument();
    const bowling = screen.getByRole('link', { name: 'Bowling night' }).closest('article');
    expect(within(bowling as HTMLElement).getByText('Full')).toBeInTheDocument();
  });

  it('shows past events on the Past tab', async () => {
    const { user } = renderWithProviders(<EventsPage />, { route: '/events', path: '/events' });
    await screen.findByRole('link', { name: 'Exam study session' });
    await user.click(screen.getByRole('radio', { name: 'Past' }));
    expect(await screen.findByRole('radio', { name: 'Past' })).toHaveAttribute('data-state', 'on');
    await vi.waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Exam study session' })).not.toBeInTheDocument(),
    );
  });

  it('has no axe violations', async () => {
    const { container } = renderWithProviders(<EventsPage />, {
      route: '/events',
      path: '/events',
    });
    await screen.findByRole('link', { name: 'Exam study session' });
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});

describe('EventDetailPage', () => {
  it('changes the reply and confirms it', async () => {
    expect(myRsvp('ev-ch1-meeting-next')).toBe('going');
    const { user } = renderDetail('ev-ch1-meeting-next');
    const going = await screen.findByRole('button', { name: 'Going' });
    expect(going).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Maybe' }));
    expect(await screen.findByText('Reply saved: Maybe')).toBeInTheDocument();
    expect(myRsvp('ev-ch1-meeting-next')).toBe('maybe');
    expect(screen.getByRole('button', { name: 'Maybe' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lists who is coming when the event shares participants', async () => {
    renderDetail('ev-ch1-meeting-next');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Who is coming' }),
    ).toBeInTheDocument();
  });

  it('disables "Going" on a full event and explains why', async () => {
    renderDetail('ev-ch1-bowling');
    expect(await screen.findByRole('button', { name: 'Going' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Maybe' })).toBeEnabled();
    expect(screen.getByText(/This event is full/)).toBeInTheDocument();
  });

  it('replaces the buttons with the reason once registration has closed', async () => {
    renderDetail('ev-ch1-study-session');
    expect(await screen.findByText('Registration for this event has closed.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Going' })).not.toBeInTheDocument();
  });

  it('shows the cancellation and no reply or calendar actions', async () => {
    renderDetail('ev-ch1-hike-cancelled');
    expect(await screen.findByText('This event has been cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Will you attend?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to calendar' })).not.toBeInTheDocument();
  });

  it('gives parents the event without a reply panel', async () => {
    renderDetail('ev-ch1-meeting-next', 'parent');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Working meeting: public speaking' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Will you attend?' })).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderDetail('ev-ch1-meeting-next');
    await screen.findByRole('heading', { level: 2, name: 'Who is coming' });
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});
