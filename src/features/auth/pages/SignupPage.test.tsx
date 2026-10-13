import { describe, expect, it } from 'vitest';

import { db } from '@/data/store';
import { clock } from '@/lib/clock';
import { axeViolations, renderWithProviders, screen, summarizeViolations, within } from '@/test';

import SignupPage from './SignupPage';

type User = ReturnType<typeof renderSignup>['user'];

function renderSignup(lang: 'en' | 'bg' = 'en') {
  return renderWithProviders(<SignupPage />, {
    route: '/signup',
    path: '/signup',
    persona: null,
    lang,
  });
}

const bornYearsAgo = (years: number) => `${clock.now().getUTCFullYear() - years}-03-20`;

async function fillDetails(user: User, options: { birthDate?: string } = {}) {
  await user.click(screen.getByRole('radio', { name: /Active member/ }));
  await user.type(screen.getByLabelText('First name'), 'Kalin');
  await user.type(screen.getByLabelText('Last name'), 'Petrov');
  await user.type(screen.getByLabelText(/Date of birth/), options.birthDate ?? bornYearsAgo(16));
  await user.click(screen.getByRole('combobox', { name: 'Chapter' }));
  await user.click(await screen.findByRole('option', { name: 'Sveta Sofia Chapter' }));
  await user.type(screen.getByLabelText('DeM ID'), 'dem-bg-20001');
}

async function fillAccount(user: User) {
  await user.type(screen.getByLabelText('Email'), 'kalin.petrov@example.org');
  await user.type(screen.getByLabelText('Phone'), '+359 888 000 111');
  await user.type(screen.getByLabelText('Password'), 'Test!Signup2026');
  await user.type(screen.getByLabelText('Confirm password'), 'Test!Signup2026');
}

describe('SignupPage', () => {
  it('validates each step before moving on, with translated messages', async () => {
    const { user } = renderSignup();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Create an account' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText('Select an option.')).toHaveLength(2);
    expect(screen.getAllByText('This field is required.').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Enter your DeM ID.')).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true');
    // Still on step 1.
    expect(screen.getByRole('heading', { level: 2, name: 'About you' })).toBeInTheDocument();
  });

  it('refuses members under 14', async () => {
    const { user } = renderSignup();
    await fillDetails(user, { birthDate: bornYearsAgo(12) });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Members must be at least 14 years old.')).toBeInTheDocument();
  });

  it('asks parents for their child’s DeM ID', async () => {
    const { user } = renderSignup();
    await user.click(screen.getByRole('radio', { name: /Parent/ }));
    expect(screen.getByLabelText('Your child’s DeM ID'.replace('’', "'"))).toBeInTheDocument();
    expect(screen.queryByLabelText('DeM ID')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: "Your child's chapter" })).toBeInTheDocument();
  });

  it('requires the privacy notice and terms but not photo consent', async () => {
    const { user } = renderSignup();
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await fillAccount(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Consent' })).toBeInTheDocument();
    expect(screen.getAllByText(/Version 2026-09\./)).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findAllByText('You need to accept this to create an account.'),
    ).toHaveLength(2);
  });

  it('creates a pending account after both codes are confirmed', async () => {
    const { user } = renderSignup();
    await fillDetails(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await fillAccount(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByRole('checkbox', { name: /privacy notice/ }));
    await user.click(screen.getByRole('checkbox', { name: /terms of use/ }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const notice = await screen.findByText('Simulated codes');
    const box = notice.closest('[data-slot="info-notice"]') ?? notice.parentElement?.parentElement;
    const codes = within(box as HTMLElement)
      .getAllByText(/^\d{6}$/)
      .map((element) => element.textContent ?? '');
    expect(codes).toHaveLength(2);
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();

    const [emailCode, phoneCode] = codes;
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0] as HTMLElement, emailCode ?? '');
    await user.type(inputs[1] as HTMLElement, phoneCode ?? '');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Your account is waiting for verification')).toBeInTheDocument();
    expect(screen.getByText('Your username will be kalin.petrov@example.org.')).toBeInTheDocument();
    const credential = db.find('credentials', (c) => c.username === 'kalin.petrov@example.org')[0];
    expect(db.get('users', credential?.id ?? '')?.status).toBe('pending');
  });

  it('renders in Bulgarian', () => {
    renderSignup('bg');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Създаване на профил' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Активен член/ })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderSignup();
    await screen.findByRole('combobox', { name: 'Chapter' });
    expect(summarizeViolations(await axeViolations(container))).toEqual([]);
  });
});
