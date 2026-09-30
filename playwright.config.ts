import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT) || 3000;
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // The dev server compiles each route on first visit, which can be slow
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // More parallel browser launches than this get flaky on slower machines
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'en-US',
    trace: 'on-first-retry',
    // For OSes Playwright can't download browsers for, e.g. /snap/bin/chromium
    launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH || undefined },
  },
  projects: [
    // Wide enough for the xl desktop header (nav links, language dropdown)
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
