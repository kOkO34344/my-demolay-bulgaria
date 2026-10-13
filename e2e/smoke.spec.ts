import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke test (shell team): the production bundle boots on the login page, a member signs in through
 * "Demo access", lands on Home and signs out again — with zero console errors or warnings.
 * Feature teams: copy `collectConsoleProblems` into your specs.
 */

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

test('signed-out visitors land on a production-like login page', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('/events');

  await expect(page).toHaveURL(/\/login\?redirect=%2Fevents$/);
  await expect(page).toHaveTitle('Sign in · My DeMolay Bulgaria');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  const demoAccess = page.getByRole('button', { name: 'Demo access' });
  await expect(demoAccess).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: /member\.demo/ })).toBeHidden();
  expect(problems).toEqual([]);
});

test('member signs in via demo access, lands on Home and signs out', async ({ page }, testInfo) => {
  const problems = collectConsoleProblems(page);
  const isMobile = testInfo.project.name === 'mobile';
  await page.goto('/login');

  await page.getByRole('button', { name: 'Demo access' }).click();
  await page.getByRole('button', { name: /^Active member/ }).click();
  await expect(page.getByLabel('Username')).toHaveValue('member.demo');
  // Filling never signs in by itself; focus moves to the submit button.
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Martin$/ }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Home · My DeMolay Bulgaria');
  await expect(page.getByText('Welcome, Martin.')).toBeVisible();

  if (isMobile) {
    const bottomNav = page.getByRole('navigation', { name: 'Primary' });
    await expect(bottomNav).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
    await bottomNav.getByRole('link', { name: 'More' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'More' })).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Sign out' }).click();
  } else {
    const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(sidebar.getByRole('link', { name: 'Administration' })).toHaveCount(0);
    await sidebar.getByRole('button', { name: 'Sign out' }).click();
  }

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await expect(page.getByText("You've signed out.")).toBeVisible();
  expect(problems).toEqual([]);
});

test('member reads a post and changes an event reply', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await page.goto('/login');
  await page.getByLabel('Username').fill('member.demo');
  await page.getByRole('textbox', { name: 'Password' }).fill('Demo!Member2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);

  const latestNews = page.getByRole('region', { name: 'Latest news' });
  await latestNews.getByRole('link', { name: 'Installation of officers: save the date' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Installation of officers: save the date' }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Installation of officers: save the date · My DeMolay Bulgaria');

  await page.goto('/events');
  await page.getByRole('link', { name: 'Working meeting: public speaking' }).click();
  await expect(page.getByRole('button', { name: 'Going', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Not going' }).click();
  await expect(page.getByText('Reply saved: Not going')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Not going' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(problems).toEqual([]);
});

test('a new member signs up, is verified by a coordinator and signs in', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  const year = new Date().getFullYear() - 16;

  await page.goto('/login');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await page.getByRole('radio', { name: /Active member/ }).click();
  await page.getByLabel('First name').fill('Kalin');
  await page.getByLabel('Last name').fill('Petrov');
  await page.getByLabel('Date of birth').fill(`${year}-03-20`);
  await page.getByRole('combobox', { name: 'Chapter' }).click();
  await page.getByRole('option', { name: 'Sveta Sofia Chapter' }).click();
  await page.getByRole('textbox', { name: 'DeM ID', exact: true }).fill('DEM-BG-20001');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByLabel('Email').fill('kalin.petrov@example.org');
  await page.getByLabel('Phone').fill('+359 888 000 111');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('Test!Signup2026');
  await page.getByRole('textbox', { name: 'Confirm password' }).fill('Test!Signup2026');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('checkbox', { name: /privacy notice/ }).click();
  await page.getByRole('checkbox', { name: /terms of use/ }).click();
  await page.getByRole('button', { name: 'Create account' }).click();

  const notice = page.getByText('Simulated codes').locator('..').locator('..');
  const codes = await notice.getByText(/^\d{6}$/).allTextContents();
  expect(codes).toHaveLength(2);
  await page.getByLabel(/Code sent to kalin/).fill(codes[0] ?? '');
  await page.getByLabel(/Code sent to \+359/).fill(codes[1] ?? '');
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Your account is waiting for verification')).toBeVisible();

  await page.getByRole('link', { name: 'Go to sign in' }).click();
  await page.getByLabel('Username').fill('national.officer.demo');
  await page.getByRole('textbox', { name: 'Password' }).fill('Demo!National2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/verification');
  await page.getByRole('button', { name: 'Review Kalin Petrov' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Kalin Petrov approved.')).toBeVisible();

  await page.goto('/more');
  await page.getByRole('main').getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Username').fill('kalin.petrov@example.org');
  await page.getByRole('textbox', { name: 'Password' }).fill('Test!Signup2026');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // First sign-in: the onboarding questions, then Home.
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome, Kalin' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Sports' }).check();
  await page.getByRole('checkbox', { name: 'Saturdays' }).check();
  await page.getByRole('button', { name: 'Save answers' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Kalin$/ }),
  ).toBeVisible();
  expect(problems).toEqual([]);
});

test('manifest is installable and every declared icon exists', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    short_name: string;
    display: string;
    start_url: string;
    scope: string;
    background_color: string;
    theme_color: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };
  expect(manifest).toMatchObject({
    name: 'My DeMolay Bulgaria',
    short_name: 'My DeMolay',
    display: 'standalone',
    start_url: '/',
    scope: '/',
    background_color: '#F5F7FA',
    theme_color: '#ffffff',
  });
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  for (const icon of [...manifest.icons, { src: 'apple-touch-icon-180x180.png' }]) {
    const file = await request.get(`/${icon.src}`);
    expect(file.ok(), icon.src).toBe(true);
    expect(file.headers()['content-type']).toContain('image/png');
  }
});
