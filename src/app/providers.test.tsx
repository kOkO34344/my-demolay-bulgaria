import { screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { MoonIcon, SunIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Can, RequirePermission, useAuth, usePolicy, primaryRole } from '@/auth';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SUPPORTED_LOCALES, isLocale, labelKeys, useLocale } from '@/i18n/public';
import { ForbiddenError } from '@/data/errors';
import { useTheme } from '@/lib/theme';
import { axeViolations, mediaState, renderWithProviders, summarizeViolations } from '@/test';

/**
 * The foundation preview that used to live in src/App.tsx (SHELL agent moved it here when App.tsx
 * became the router entry; the router itself is tested in src/app/router.test.tsx).
 */
function ProvidersPreview() {
  const { t } = useTranslation();
  const { lang, setLanguage } = useLocale();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { status } = useAuth();
  return (
    <div>
      <p>{t('app.subtitle')}</p>
      <ToggleGroup
        type="single"
        value={lang}
        onValueChange={(value) => {
          if (isLocale(value)) void setLanguage(value);
        }}
        aria-label={t('common.a11y.languageSwitcher')}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <ToggleGroupItem key={locale} value={locale} aria-label={t(labelKeys.language(locale))}>
            {t(labelKeys.languageCode(locale))}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={resolvedTheme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
      >
        {resolvedTheme === 'dark' ? (
          <SunIcon aria-hidden="true" />
        ) : (
          <MoonIcon aria-hidden="true" />
        )}
      </Button>
      <main>
        <h1>{t('app.name')}</h1>
        <p>{status === 'authenticated' ? t('demo.mode') : t('demo.access')}</p>
      </main>
    </div>
  );
}

function NavProbe() {
  const policy = usePolicy();
  const { switchDemoRole, subject } = useAuth();
  return (
    <div>
      <p data-testid="role">
        {subject ? (primaryRole(subject)?.role ?? subject.memberType) : 'none'}
      </p>
      <ul aria-label="nav">
        {policy.visibleNavItems('sidebar').map((item) => (
          <li key={item.id}>{item.id}</li>
        ))}
      </ul>
      <button type="button" onClick={() => void switchDemoRole('sysadmin')}>
        switch
      </button>
    </div>
  );
}

describe('AppProviders + foundation preview', () => {
  it('switches language in place without logging out', async () => {
    const { user } = renderWithProviders(<ProvidersPreview />, { persona: 'chapter_secretary' });
    expect(screen.getByText('Member Portal')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Bulgarian' }));
    expect(await screen.findByText('Портал за членове')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('bg');
    expect(screen.getByText('Демо режим')).toBeInTheDocument(); // still authenticated
  });

  it('toggles the theme, persists it and updates theme-color', async () => {
    const { user } = renderWithProviders(<ProvidersPreview />, { theme: 'light' });
    expect(document.documentElement).not.toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.sessionStorage.getItem('mdb.theme')).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#0e1b30',
    );
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderWithProviders(<ProvidersPreview />);
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});

describe('ThemeProvider first load', () => {
  function ThemeProbe() {
    const { preference, resolvedTheme } = useTheme();
    return <p>{`${preference}:${resolvedTheme}`}</p>;
  }

  it('follows prefers-color-scheme when nothing is stored', () => {
    mediaState.prefersDark = true;
    window.sessionStorage.removeItem('mdb.theme');
    renderWithProviders(<ThemeProbe />, { theme: null });
    expect(screen.getByText('system:dark')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
  });

  it('defaults to light', () => {
    renderWithProviders(<ThemeProbe />, { theme: null });
    expect(screen.getByText('system:light')).toBeInTheDocument();
  });
});

describe('guards and permission gates', () => {
  it('shows a permission-denied state for signed-in users without access', () => {
    renderWithProviders(
      <RequirePermission routeId="admin">
        <p>admin area</p>
      </RequirePermission>,
      { persona: 'active_member', path: '/admin', route: '/admin' },
    );
    expect(screen.queryByText('admin area')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: "You don't have access to this page" }),
    ).toBeInTheDocument();
  });

  it('redirects signed-out users to login with a return path', () => {
    renderWithProviders(
      <RequirePermission routeId="news">
        <p>news</p>
      </RequirePermission>,
      {
        persona: null,
        path: '/news',
        route: '/news',
        routes: [{ path: '/login', element: <p>login page</p> }],
      },
    );
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders gated actions by permission, never by role name', () => {
    const ui = (
      <Can permission="post.create" target={{ chapterId: 'ch-1' }} fallback={<p>hidden</p>}>
        <button type="button">New announcement</button>
      </Can>
    );
    const { unmount } = renderWithProviders(ui, { persona: 'chapter_secretary' });
    expect(screen.getByRole('button', { name: 'New announcement' })).toBeInTheDocument();
    unmount();
    renderWithProviders(ui, { persona: 'active_member' });
    expect(screen.getByText('hidden')).toBeInTheDocument();
  });
});

describe('demo role switcher through React', () => {
  it('updates the subject and navigation immediately', async () => {
    const { user } = renderWithProviders(<NavProbe />, { persona: 'active_member' });
    expect(screen.getByTestId('role')).toHaveTextContent('active');
    expect(screen.queryByText('admin')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'switch' }));
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('sysadmin'));
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('cannot activate when demo mode is off', async () => {
    function SwitchAttempt() {
      const { isDemoMode, switchDemoRole, subject } = useAuth();
      const [outcome, setOutcome] = useState('idle');
      return (
        <div>
          <p data-testid="mode">{String(isDemoMode)}</p>
          <p data-testid="role">
            {subject ? (primaryRole(subject)?.role ?? subject.memberType) : 'none'}
          </p>
          <p data-testid="outcome">{outcome}</p>
          <button
            type="button"
            onClick={() => {
              switchDemoRole('sysadmin').then(
                () => setOutcome('switched'),
                (error: unknown) =>
                  setOutcome(error instanceof ForbiddenError ? error.reason : 'other'),
              );
            }}
          >
            switch
          </button>
        </div>
      );
    }
    const { user } = renderWithProviders(<SwitchAttempt />, {
      persona: 'active_member',
      demoMode: false,
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('false');
    await user.click(screen.getByRole('button', { name: 'switch' }));
    expect(await screen.findByText('demo_mode_disabled')).toBeInTheDocument();
    expect(screen.getByTestId('role')).toHaveTextContent('active');
  });
});
