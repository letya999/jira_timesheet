import { defineConfig, devices } from '@playwright/test';

const AUTH_STATE_PATH = 'playwright/.auth/user.json';
const WEB_PORT = process.env.PW_WEB_PORT ?? '5173';
const WEB_BASE_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: WEB_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE_PATH },
      dependencies: ['setup'],
      testIgnore: ['**/login.spec.ts'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: AUTH_STATE_PATH },
      dependencies: ['setup'],
      testIgnore: ['**/login.spec.ts'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: AUTH_STATE_PATH },
      dependencies: ['setup'],
      testIgnore: ['**/login.spec.ts'],
    },
    {
      name: 'chromium-login',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/login.spec.ts',
    },
  ],
  webServer: {
    command: `cd web && bun run dev -- --port ${WEB_PORT} --strictPort`,
    url: WEB_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
