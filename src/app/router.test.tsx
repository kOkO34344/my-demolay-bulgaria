import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '@/data/hooks/queryKeys';
import { startSessionForUser } from '@/data/mock/repositories/authRepository';
import { DEMO_USER_IDS } from '@/data/mock/seed/demoAccounts';
import type { DemoPersonaId } from '@/domain';
import { createTestQueryClient } from '@/test';

import { AppProviders } from './providers';
import { appRoutes } from './router';
import { matchAppRoute, safeRedirectTarget } from './routes';

/** Renders the real route tree (lazy pages, guards, layouts) at `path`. */
function renderApp(path: string, persona: DemoPersonaId | null, demoMode = true) {
  const queryClient = createTestQueryClient();
  const session = persona ? startSessionForUser(DEMO_USER_IDS[persona], null) : null;
  queryClient.setQueryData(queryKeys.auth.session(), session);
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <AppProviders queryClient={queryClient} initialTheme="light" demoMode={demoMode}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, user: userEvent.setup() };
}

const PAGE_LOAD = { timeout: 4000 };

describe('route guards', () => {
  it('redirects signed-out visitors to /login and returns them to the page after sign-in', async () => {
    const { router, user } = renderApp('/events?scope=national', null);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }, PAGE_LOAD),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(new URLSearchParams(router.state.location.search).get('redirect')).toBe(
      '/events?scope=national',
    );

    await user.click(screen.getByRole('button', { name: 'Demo access' }));
    await user.click(screen.getByRole('button', { name: /^Active member/ }));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Events' }, PAGE_LOAD),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/events');
    expect(router.state.location.search).toBe('?scope=national');
  });

  it('signing out lands on a clean /login (no redirect back to the previous page)', async () => {
    const { router, user } = renderApp('/more', 'active_member');
    const main = await screen.findByRole('main', {}, PAGE_LOAD);
    await screen.findByRole('heading', { level: 1, name: 'More' }, PAGE_LOAD);
    await user.click(within(main).getByRole('button', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }, PAGE_LOAD),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('');
    expect(await screen.findByText("You've signed out.")).toBeInTheDocument();
    expect(
      screen.getByText('Use your username, or the email you signed up with, and your password.'),
    ).toBeInTheDocument();
  });

  it('sends signed-in users away from /login to Home', async () => {
    const { router } = renderApp('/login', 'active_member');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /^Good (morning|afternoon|evening), / },
        PAGE_LOAD,
      ),
    ).toBeInTheDocument();
  });

  it('renders a permission-denied page (not a blank screen) for forbidden routes', async () => {
    const { router } = renderApp('/members', 'active_member');
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: "You don't have access to this page" },
        PAGE_LOAD,
      ),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/members');
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
    // The shell around it still works.
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('guards each Administration section', async () => {
    renderApp('/admin/sync', 'chapter_chairman');
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: "You don't have access to this page" },
        PAGE_LOAD,
      ),
    ).toBeInTheDocument();
  });

  it('opens /admin at the first allowed section for administrators', async () => {
    const { router } = renderApp('/admin', 'sysadmin');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/members'), PAGE_LOAD);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Administration' }, PAGE_LOAD),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Members' }, PAGE_LOAD),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('aria-current', 'page');
  });

  it('lets chapter officers into the officer workspace (and the /officer alias)', async () => {
    const { router } = renderApp('/officer', 'chapter_secretary');
    await waitFor(() => expect(router.state.location.pathname).toBe('/workspace'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Officer Workspace' }, PAGE_LOAD),
    ).toBeInTheDocument();
  });

  it('shows Not found for unknown in-app URLs and sets the document title', async () => {
    renderApp('/no-such-page', 'active_member');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }, PAGE_LOAD),
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toMatch(/^Page not found . My DeMolay Bulgaria$/));
  });

  it('sets a translated document title per route', async () => {
    renderApp('/events', 'active_member');
    await screen.findByRole('heading', { level: 1, name: 'Events' }, PAGE_LOAD);
    expect(document.title).toMatch(/^Events . My DeMolay Bulgaria$/);
  });
});

describe('route table helpers', () => {
  it('resolves static segments before params', () => {
    expect(matchAppRoute('/events/new').id).toBe('eventCreate');
    expect(matchAppRoute('/events/e-1').id).toBe('eventDetail');
    expect(matchAppRoute('/events/e-1/attendance').id).toBe('eventAttendance');
    expect(matchAppRoute('/admin/roles').id).toBe('adminRoles');
    expect(matchAppRoute('/nowhere').id).toBe('notFound');
  });

  it('only accepts same-origin in-app redirect targets', () => {
    expect(safeRedirectTarget('/events?tab=past')).toBe('/events?tab=past');
    expect(safeRedirectTarget('//evil.example')).toBeNull();
    expect(safeRedirectTarget('https://evil.example')).toBeNull();
    expect(safeRedirectTarget('/\\evil.example')).toBeNull();
    expect(safeRedirectTarget('/login?redirect=/x')).toBeNull();
    expect(safeRedirectTarget(null)).toBeNull();
  });
});
