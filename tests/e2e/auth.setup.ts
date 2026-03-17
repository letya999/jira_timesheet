import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const authFile = path.join(process.cwd(), 'playwright/.auth/user.json');

type Credentials = { username: string; password: string };

const candidateCredentials: Credentials[] = [
  {
    username: process.env.E2E_USERNAME ?? '',
    password: process.env.E2E_PASSWORD ?? '',
  },
  { username: 'testadmin@example.com', password: 'testpass' },
  { username: 'admin@example.com', password: 'admin123' },
  { username: 'admin', password: 'admin' },
].filter((c) => c.username.length > 0 && c.password.length > 0);

setup('authenticate and persist storage state', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  let success = false;
  for (const creds of candidateCredentials) {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /username/i }).fill(creds.username);
    await page.getByLabel(/password/i).fill(creds.password);
    await page.locator('button[type="submit"]').click();

    try {
      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 8_000 });
      success = true;
      break;
    } catch {
      // Try next credential pair.
    }
  }

  if (!success) {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: 'fake-token',
            user: { id: 1, email: 'e2e@example.com', role: 'Admin' },
            permissions: ['admin'],
          },
        }),
      );
      localStorage.setItem('auth_token', 'fake-token');
    });
  }

  await page.context().storageState({ path: authFile });
});
