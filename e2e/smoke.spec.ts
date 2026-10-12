import { expect, test } from '@playwright/test';

/**
 * Foundation smoke test (core team). Feature teams add their own specs next to this one.
 * Verifies the production bundle boots without console errors and exposes PWA metadata.
 */
test('app shell boots without console errors', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning')
      problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

  await page.goto('/');
  await expect(page).toHaveTitle(/My DeMolay Bulgaria/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  );
  await expect(page.locator('#root')).not.toBeEmpty();
  expect(problems).toEqual([]);
});

test('manifest is installable', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    display: string;
    icons: Array<{ sizes: string }>;
  };
  expect(manifest.name).toBe('My DeMolay Bulgaria');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
});
