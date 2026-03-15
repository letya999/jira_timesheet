import { test, expect } from '@playwright/test';

test.describe('Dashboard page', () => {
  test.beforeEach(async ({ context, page }) => {
    // Seed auth state so we skip the login redirect
    await context.addInitScript(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: 'fake-token',
            user: { id: 1, email: 'user@example.com' },
            permissions: ['timesheet:read', 'reports:view'],
          },
        }),
      );
      localStorage.setItem('auth_token', 'fake-token');
    });
    await page.goto('/app/dashboard');
  });

  test('renders the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 8_000 });
  });

  test('renders four KPI summary cards', async ({ page }) => {
    await expect(page.getByText('This Week')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('This Month')).toBeVisible();
    await expect(page.getByText('CapEx Total')).toBeVisible();
    await expect(page.getByText('OpEx Total')).toBeVisible();
  });

  test('renders the sync status widget with Sync Now button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /sync now/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('renders the recent activity section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible({ timeout: 8_000 });
  });
});
