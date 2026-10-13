import { QueryClient, type QueryClient as QueryClientType } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AppProviders } from '@/app/providers';
import { queryKeys } from '@/data/hooks/queryKeys';
import { startSessionForUser } from '@/data/mock/repositories/authRepository';
import { DEMO_USER_IDS } from '@/data/mock/seed/demoAccounts';
import type { DemoPersonaId, Locale, Session } from '@/domain';
import { i18n } from '@/i18n';
import type { ThemePreference } from '@/lib/theme';

/** Fresh QueryClient for tests: no retries, no refetch on mount surprises. */
export function createTestQueryClient(): QueryClientType {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial URL (default "/"). */
  route?: string;
  /** Route pattern the `ui` is mounted at (e.g. "/news/:postId"); enables useParams. */
  path?: string;
  /** Extra routes rendered alongside (e.g. a login route to assert redirects). */
  routes?: Array<{ path: string; element: ReactNode }>;
  /**
   * Signed-in demo account by persona (default 'active_member'). `null` = signed out.
   * The session is written to the mock store and primed into the query cache synchronously.
   */
  persona?: DemoPersonaId | null;
  /** Demo role-switcher override: act as another persona on top of `persona`'s account. */
  actAs?: DemoPersonaId;
  lang?: Locale;
  /** Forced theme preference (default 'light'); null = use stored preference / OS setting. */
  theme?: ThemePreference | null;
  demoMode?: boolean;
  queryClient?: QueryClientType;
  /** Mount the sonner toast host (default true) so toasts can be asserted. */
  withToaster?: boolean;
}

export interface RenderWithProvidersResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  queryClient: QueryClientType;
  session: Session | null;
}

/**
 * Renders UI inside every app provider (QueryClient, i18n, theme, auth, tooltips) and a MemoryRouter.
 *   const { user } = renderWithProviders(<NewsPage />, { route: '/news', persona: 'chapter_secretary', lang: 'bg' });
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    path,
    routes = [],
    persona = 'active_member',
    actAs,
    lang = 'en',
    theme = 'light',
    demoMode,
    queryClient = createTestQueryClient(),
    withToaster = true,
    ...renderOptions
  }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  void i18n.changeLanguage(lang);

  const session = persona ? startSessionForUser(DEMO_USER_IDS[persona], actAs ?? null) : null;
  queryClient.setQueryData(queryKeys.auth.session(), session);

  const content =
    path || routes.length > 0 ? (
      <Routes>
        <Route path={path ?? '*'} element={ui} />
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Routes>
    ) : (
      ui
    );

  const result = render(
    <AppProviders
      queryClient={queryClient}
      initialTheme={theme ?? undefined}
      demoMode={demoMode}
      withToaster={withToaster}
    >
      <MemoryRouter initialEntries={[route]}>{content}</MemoryRouter>
    </AppProviders>,
    renderOptions,
  );

  return { ...result, user: userEvent.setup(), queryClient, session };
}
