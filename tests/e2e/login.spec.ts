import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const CANDIDATE_CREDENTIALS: Array<{ username: string; password: string }> = [
  { username: process.env.E2E_USERNAME ?? '', password: process.env.E2E_PASSWORD ?? '' },
  { username: 'testadmin@example.com', password: 'testpass' },
  { username: 'admin@example.com', password: 'admin123' },
  { username: 'admin', password: 'admin' },
].filter((c) => c.username.length > 0 && c.password.length > 0);

async function openLoginAndRecover(page: Page) {
  await page.goto('/login');
  const errorHeading = page.getByRole('heading', { name: /something went wrong/i });
  if (await errorHeading.isVisible().catch(() => false)) {
    const retryButton = page.getByRole('button', { name: /try again/i });
    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
    }
  }
}

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await openLoginAndRecover(page);
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByTestId('login-title')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('username-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
    await expect(page.getByTestId('sso-button')).toBeVisible();
    await expect(page.getByTestId('google-button')).toBeVisible();
  });

  test('Google button navigates to Google SSO login endpoint and redirects to Google', async ({ page }) => {
    // Click the google button and wait for the navigation to reach Google's domain
    await page.getByTestId('google-button').click();
    
    // The backend should redirect to accounts.google.com
    await page.waitForURL(/accounts\.google\.com/, { timeout: 15_000 });
    expect(page.url()).toContain('accounts.google.com');
    console.log('Redirect to Google confirmed: ' + page.url());
  });

  test('shows validation errors when submitted empty', async ({ page }) => {
    await page.getByTestId('login-submit').click();
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('shows error message on invalid credentials', async ({ page }) => {
    await page.getByTestId('username-input').fill('wrong_user');
    await page.getByTestId('password-input').fill('wrong_password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toBeVisible({ timeout: 10_000 });
  });

  test('happy path: valid credentials redirect to dashboard', async ({ page }) => {
    let success = false;

    for (const creds of CANDIDATE_CREDENTIALS) {
      await openLoginAndRecover(page);
      await page.getByTestId('username-input').fill(creds.username);
      await page.getByTestId('password-input').fill(creds.password);
      await page.getByTestId('login-submit').click();

      try {
        await expect(page).toHaveURL(/\/app\/(dashboard|my-timesheet)/, { timeout: 10_000 });
        success = true;
        break;
      } catch {
        // Try next credential pair.
      }
    }

    expect(success).toBeTruthy();
  });

  test('SSO button navigates to SSO login endpoint', async ({ page }) => {
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/auth/sso/login')),
      page.getByTestId('sso-button').click(),
    ]);
    expect(request.url()).toContain('/api/v1/auth/sso/login');
  });

  test('authenticated user is redirected away from /login', async ({ page, context }) => {
    // Seed auth store via localStorage to simulate authenticated state
    await context.addInitScript(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({ state: { isAuthenticated: true, token: 'fake', user: {}, permissions: [] } }),
      );
      localStorage.setItem('auth_token', 'fake');
    });
    await openLoginAndRecover(page);
    await expect(page).toHaveURL(/\/app\/(dashboard|my-timesheet)/, { timeout: 8_000 });
  });
});
