import { expect, test } from '@playwright/test';

test.describe('Supporting pages (P5)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: 'fake-token',
            user: { id: 1, email: 'admin@example.com' },
            permissions: ['hr:read', 'settings.manage'],
          },
        }),
      );
      localStorage.setItem('auth_token', 'fake-token');
    });
  });

  test('Notifications page: renders inbox controls', async ({ page }) => {
    await page.goto('/app/notifications');
    await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /show unread|show all/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mark all as read/i })).toBeVisible();
    await expect(page.getByText(/inbox/i)).toBeVisible();
  });

  test('Settings page: admin tabs and profile controls are visible', async ({ page }) => {
    await page.goto('/app/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('tab', { name: /profile/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /notifications/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /org/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /jira integration/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /update password/i })).toBeVisible();
  });

  test('HR page: table and management form are visible', async ({ page }) => {
    await page.goto('/app/hr');
    await expect(page.getByRole('heading', { name: /hr administration/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/management form/i)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });
});
