import { defineConfig, devices, test as baseTest } from '@playwright/test';
import path from 'path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321';

// Custom test fixture that intercepts OpenStreetMap tile requests
export const test = baseTest.extend({
  page: async ({ page }, use) => {
    await page.route('**/tile.openstreetmap.org/**/*.png', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        path: path.resolve(process.cwd(), 'tests/e2e/transparent.png'),
      });
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'es-CR',
        timezoneId: 'America/Costa_Rica',
      },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
