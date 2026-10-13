import { describe, expect, it } from 'vitest';

import { setClock } from '@/lib/clock';
import { axeViolations, renderWithProviders, screen, summarizeViolations, within } from '@/test';

import HomePage from './HomePage';

describe('HomePage', () => {
  it('greets the member by first name for the time of day in Sofia', async () => {
    // 07:30 UTC = 10:30 in Sofia (EEST).
    setClock(new Date('2026-10-13T07:30:00.000Z'));
    renderWithProviders(<HomePage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Good morning, Martin' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/coming up in Sveta Sofia Chapter/)).toBeInTheDocument();
  });

  it('shows the next key dates and the latest news with links to the full pages', async () => {
    renderWithProviders(<HomePage />);
    const keyDates = await screen.findByRole('region', { name: 'Key dates' });
    expect(await within(keyDates).findAllByRole('article')).toHaveLength(4);
    expect(within(keyDates).getByRole('link', { name: 'All events' })).toHaveAttribute(
      'href',
      '/events',
    );
    expect(within(keyDates).getByText(/waiting for your reply/)).toBeInTheDocument();
    const news = screen.getByRole('region', { name: 'Latest news' });
    expect(await within(news).findAllByRole('article')).toHaveLength(3);
    expect(within(news).getByRole('link', { name: 'All news' })).toHaveAttribute('href', '/news');
  });

  it('greets in Bulgarian', () => {
    setClock(new Date('2026-10-13T17:30:00.000Z'));
    renderWithProviders(<HomePage />, { lang: 'bg' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Добър вечер, Мартин' }),
    ).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithProviders(<HomePage />);
    await screen.findAllByRole('article');
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});
