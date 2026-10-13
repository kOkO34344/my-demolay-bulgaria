import { describe, expect, it, vi } from 'vitest';

import { DEMO_USER_IDS } from '@/data/mock/seed/demoAccounts';
import { db } from '@/data/store';
import { axeViolations, renderWithProviders, screen, summarizeViolations, within } from '@/test';

import NewsDetailPage from './NewsDetailPage';
import NewsFeedPage from './NewsFeedPage';

const MEMBER = DEMO_USER_IDS.active_member;

function renderFeed(route = '/news') {
  return renderWithProviders(<NewsFeedPage />, { route, path: '/news' });
}

async function postTitles(): Promise<string[]> {
  const list = await screen.findByRole('list', { name: 'News' });
  return within(list)
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent ?? '');
}

describe('NewsFeedPage', () => {
  it('lists visible posts, pinned first, with unread posts marked in text', async () => {
    renderFeed();
    const titles = await postTitles();
    expect(titles[0]).toBe('Installation of officers: save the date');
    const first = screen.getByRole('link', { name: titles[0] }).closest('article');
    expect(first).not.toBeNull();
    expect(within(first as HTMLElement).getByText('Pinned')).toBeInTheDocument();
    expect(within(first as HTMLElement).getByText('Unread')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: titles[0] })).toHaveAttribute(
      'href',
      '/news/ann-ch1-installation',
    );
  });

  it('filters to national posts from the URL', async () => {
    renderFeed('/news?feed=national');
    const titles = await postTitles();
    expect(titles.length).toBeGreaterThan(0);
    expect(titles).not.toContain('Installation of officers: save the date');
    expect(screen.getByRole('radio', { name: 'National' })).toHaveAttribute('data-state', 'on');
  });

  it('offers to clear filters when a search finds nothing', async () => {
    const { user } = renderFeed('/news?q=zzzz-no-match');
    expect(await screen.findByText('No results')).toBeInTheDocument();
    expect(screen.getByText(/Nothing matches “zzzz-no-match”/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await postTitles()).toContain('Installation of officers: save the date');
  });

  it('renders in Bulgarian', async () => {
    renderWithProviders(<NewsFeedPage />, { route: '/news', path: '/news', lang: 'bg' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Новини' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Моята обител' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderFeed();
    await postTitles();
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});

describe('NewsDetailPage', () => {
  function renderDetail(postId: string) {
    return renderWithProviders(<NewsDetailPage />, {
      route: `/news/${postId}`,
      path: '/news/:postId',
    });
  }

  it('shows the post with its attachments and marks it read', async () => {
    expect(db.get('announcementReads', `ann-ch1-installation:${MEMBER}`)).toBeUndefined();
    renderDetail('ann-ch1-installation');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Installation of officers: save the date',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Attachments' })).toBeInTheDocument();
    expect(screen.getByText('installation-invitation.pdf')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Related posts' }),
    ).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(db.get('announcementReads', `ann-ch1-installation:${MEMBER}`)).toBeDefined(),
    );
  });

  it('shows not found for an unknown post', async () => {
    renderDetail('ann-does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
