import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { DemoPersonaId } from '@/domain';
import MorePage from '@/features/shell/pages/MorePage';
import { renderWithProviders, screen, waitFor, within } from '@/test';

import { AppLayout } from './AppLayout';

const WORKSPACE_LINKS = [
  'Officer Workspace',
  'Content Management',
  'Member Management',
  'Administration',
] as const;

function renderLayout(
  persona: DemoPersonaId,
  options: { demoMode?: boolean; route?: string } = {},
) {
  return renderWithProviders(
    <AppLayout>
      <h1>Page body</h1>
    </AppLayout>,
    { persona, demoMode: options.demoMode, route: options.route ?? '/' },
  );
}

const sidebarNav = () => screen.getByRole('navigation', { name: 'Main navigation' });
const sidebarLinkNames = () =>
  within(sidebarNav())
    .getAllByRole('link')
    .map((link) => link.textContent?.trim() ?? '');

describe('AppLayout navigation', () => {
  it('provides landmarks: skip link, main#main-content, labelled navigation', () => {
    renderLayout('active_member');
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(sidebarNav()).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('active member: sees the member sections only — no Administration or Member Management', () => {
    renderLayout('active_member');
    const names = sidebarLinkNames();
    for (const label of ['Home', 'News', 'Events', 'My Chapter', 'Resources', 'Profile']) {
      expect(names.some((name) => name.startsWith(label))).toBe(true);
    }
    expect(names.some((name) => name.startsWith('Notifications'))).toBe(true);
    for (const label of WORKSPACE_LINKS) {
      expect(within(sidebarNav()).queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
    expect(within(sidebarNav()).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('system administrator: sees every workspace section', () => {
    renderLayout('sysadmin');
    for (const label of WORKSPACE_LINKS) {
      expect(within(sidebarNav()).getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('chapter chairman: Member Management but not Administration', () => {
    renderLayout('chapter_chairman');
    expect(within(sidebarNav()).getByRole('link', { name: 'Member Management' })).toBeVisible();
    expect(
      within(sidebarNav()).queryByRole('link', { name: 'Administration' }),
    ).not.toBeInTheDocument();
  });

  it('marks the current section with aria-current="page"', () => {
    renderLayout('active_member', { route: '/events' });
    expect(within(sidebarNav()).getByRole('link', { name: 'Events' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebarNav()).getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('mobile bottom bar: Home, News, Events, Chapter, More', () => {
    renderLayout('active_member');
    const bottom = screen.getByRole('navigation', { name: 'Primary' });
    expect(
      within(bottom)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'News', 'Events', 'Chapter', 'More']);
  });

  it('shows the unread count on the Notifications item with a spoken label', async () => {
    renderLayout('active_member');
    const link = await within(sidebarNav()).findByRole('link', {
      name: /^Notifications.*unread notifications?\)$/,
    });
    expect(link).toBeInTheDocument();
  });
});

describe('Demo role switcher', () => {
  it('is shown (sidebar panel + header chip + prototype footer) in demo mode', () => {
    renderLayout('active_member', { demoMode: true });
    expect(screen.getByRole('region', { name: 'Demo role switcher' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Demo role switcher' }).length).toBeGreaterThan(0);
    expect(screen.getByText(/prototype with fictional data/)).toBeInTheDocument();
  });

  it('does not exist at all when demo mode is off', () => {
    renderLayout('active_member', { demoMode: false });
    expect(screen.queryByText('Demo role switcher')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Demo role switcher/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/prototype with fictional data/)).not.toBeInTheDocument();
  });

  it('is absent from the More page when demo mode is off', () => {
    renderWithProviders(
      <AppLayout>
        <MorePage />
      </AppLayout>,
      { persona: 'active_member', demoMode: false, route: '/more' },
    );
    expect(screen.getByRole('heading', { level: 1, name: 'More' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'View the app as' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).getByRole('button', { name: 'Sign out' }),
    ).toBeVisible();
  });

  it('switching role updates navigation immediately and confirms with a toast', async () => {
    const { user } = renderWithProviders(
      <AppLayout>
        <MorePage />
      </AppLayout>,
      { persona: 'active_member', demoMode: true, route: '/more' },
    );
    expect(
      within(sidebarNav()).queryByRole('link', { name: 'Administration' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /System administrator/ }));

    expect(
      await within(sidebarNav()).findByRole('link', { name: 'Administration' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Now viewing as System administrator.')).toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).getByRole('button', { name: 'Return to my role' }),
    ).toBeInTheDocument();
  });

  it('leaves a page the new role cannot open', async () => {
    const { user } = renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<h1>Home body</h1>} />
          <Route path="/members" element={<MorePage />} />
        </Route>
      </Routes>,
      { persona: 'sysadmin', demoMode: true, route: '/members' },
    );
    await user.click(screen.getByRole('radio', { name: /^Active member/ }));
    expect(await screen.findByRole('heading', { name: 'Home body' })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(sidebarNav()).queryByRole('link', { name: 'Member Management' }),
      ).not.toBeInTheDocument(),
    );
  });
});
