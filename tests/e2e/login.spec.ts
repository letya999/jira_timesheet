import { test, expect } from '@playwright/test';

const VALID_USERNAME = process.env.E2E_USERNAME ?? 'admin';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'admin';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByLabel(/remember me/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByTestId('sso-button')).toBeVisible();
  });

  test('shows validation errors when submitted empty', async ({ page }) => {
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.getByText(/username is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('shows error message on invalid credentials', async ({ page }) => {
    await page.getByRole('textbox', { name: /username/i }).fill('wrong_user');
    await page.getByLabel(/password/i).fill('wrong_password');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 });
  });

  test('happy path: valid credentials redirect to dashboard', async ({ page }) => {
    await page.getByRole('textbox', { name: /username/i }).fill(VALID_USERNAME);
    await page.getByLabel(/password/i).fill(VALID_PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
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
    await page.goto('/login');
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 5_000 });
  });
});
