import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
/**
 * Optional browser channel, e.g. PLAYWRIGHT_CHANNEL=chrome to use the locally installed Google Chrome
 * when the bundled Chromium for this Playwright version has not been downloaded yet
 * (`npm run e2e:install` downloads it).
 */
const CHANNEL = process.env.PLAYWRIGHT_CHANNEL;

/**
 * End-to-end tests (Chromium only).
 *  - `npm run e2e:install` once to fetch the Chromium build this Playwright version expects.
 *  - `npm run test:e2e` builds + previews the production bundle on :4173 (or reuses a running one locally).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-GB',
    timezoneId: 'Europe/Sofia',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        ...(CHANNEL ? { channel: CHANNEL } : {}),
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        ...(CHANNEL ? { channel: CHANNEL } : {}),
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      VITE_MOCK_LATENCY_MS: '0',
    },
  },
});
