import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { PublicOnlyRoute } from '@/components/layout/PublicOnlyRoute';
import { axeViolations, renderWithProviders, screen, summarizeViolations, within } from '@/test';

import LoginPage from './LoginPage';

function renderLogin(options: { lang?: 'en' | 'bg'; demoMode?: boolean; route?: string } = {}) {
  return renderWithProviders(
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route path="/" element={<p>Home screen</p>} />
      <Route path="/events" element={<p>Events screen</p>} />
    </Routes>,
    {
      persona: null,
      route: options.route ?? '/login',
      lang: options.lang,
      demoMode: options.demoMode,
    },
  );
}

describe('LoginPage', () => {
  it('looks production-like by default: no demo accounts visible', () => {
    renderLogin();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    const disclosure = screen.getByRole('button', { name: 'Demo access' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /member\.demo/ })).not.toBeInTheDocument();
  });

  it('shows translated required-field errors and marks the fields invalid', async () => {
    const { user } = renderLogin();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findAllByText('This field is required.')).toHaveLength(2);
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Username').getAttribute('aria-describedby')).toMatch(/message/);
  });

  it('translates validation errors into Bulgarian', async () => {
    const { user } = renderLogin({ lang: 'bg' });
    expect(screen.getByRole('heading', { level: 1, name: 'Вход' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Вход' }));
    // `validation.required` in src/i18n/bg.json (the zod schema emits the key; FormMessage translates).
    expect(await screen.findAllByText('Полето е задължително.')).toHaveLength(2);
    expect(screen.getByLabelText('Потребителско име')).toHaveAttribute('aria-invalid', 'true');
    expect(document.documentElement).toHaveAttribute('lang', 'bg');
  });

  it('shows a generic alert for invalid credentials', async () => {
    const { user } = renderLogin();
    await user.type(screen.getByLabelText('Username'), 'member.demo');
    await user.type(screen.getByLabelText('Password'), 'not-the-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Incorrect username or password.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('locks sign-in with a countdown after repeated failures', async () => {
    const { user } = renderLogin();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const username = screen.getByLabelText('Username');
      await user.clear(username);
      await user.type(username, 'member.demo');
      await user.type(screen.getByLabelText('Password'), `wrong-${attempt}`);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      if (attempt < 4) await screen.findByText('Incorrect username or password.');
    }
    expect(await screen.findByText('Sign-in is temporarily locked')).toBeInTheDocument();
    expect(
      screen.getByText(/Too many sign-in attempts\. Try again in \d+ seconds?\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('toggles password visibility with an accessible control', async () => {
    const { user } = renderLogin();
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('reveals seven demo accounts; choosing one fills the form (no auto-submit) and focuses Sign in', async () => {
    const { user } = renderLogin();
    const disclosure = screen.getByRole('button', { name: 'Demo access' });
    await user.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('list', { name: 'Demo accounts' });
    expect(within(list).getAllByRole('button')).toHaveLength(7);
    await user.click(within(list).getByRole('button', { name: /Chapter Chairman/ }));
    expect(screen.getByLabelText('Username')).toHaveValue('advisor.demo');
    expect(screen.getByLabelText('Password')).toHaveValue('Demo!Advisor2026');
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveFocus();
    expect(screen.queryByText('Home screen')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { hidden: false, name: '' })).toBeDefined();
  });

  it('signs in and continues to the requested page', async () => {
    const { user } = renderLogin({ route: '/login?redirect=%2Fevents' });
    await user.click(screen.getByRole('button', { name: 'Demo access' }));
    await user.click(screen.getByRole('button', { name: /^Active member/ }));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Events screen')).toBeInTheDocument();
  });

  it('ignores unsafe redirect targets', async () => {
    const { user } = renderLogin({ route: '/login?redirect=%2F%2Fevil.example' });
    await user.click(screen.getByRole('button', { name: 'Demo access' }));
    await user.click(screen.getByRole('button', { name: /^Active member/ }));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Home screen')).toBeInTheDocument();
  });

  it('hides demo access entirely when demo mode is off', () => {
    renderLogin({ demoMode: false });
    expect(screen.queryByRole('button', { name: 'Demo access' })).not.toBeInTheDocument();
  });

  it('has no detectable accessibility violations (closed and open)', async () => {
    const { container, user } = renderLogin();
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Demo access' }));
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});
