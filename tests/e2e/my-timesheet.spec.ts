import { test, expect } from '@playwright/test';

test.describe('My Timesheet page', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: 'fake-token',
            user: { id: 1, email: 'user@example.com' },
            permissions: ['timesheet:read', 'timesheet:write'],
          },
        }),
      );
      localStorage.setItem('auth_token', 'fake-token');
    });
    await page.goto('/app/my-timesheet');
  });

  test('renders the page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /my timesheet/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('renders week navigation with current week label', async ({ page }) => {
    await expect(page.getByText(/week of/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /previous week/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /next week/i })).toBeVisible();
  });

  test('renders the Log Time button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /log time/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('clicking Log Time opens the dialog', async ({ page }) => {
    await page.getByRole('button', { name: /log time/i }).click();
    await expect(
      page.getByRole('dialog'),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole('heading', { name: /log time/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /log work/i }),
    ).toBeVisible();
  });

  test('dialog closes when Cancel is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /log time/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  test('week navigation moves to previous week', async ({ page }) => {
    const labelBefore = await page.getByText(/week of/i).textContent();
    await page.getByRole('button', { name: /previous week/i }).click();
    const labelAfter = await page.getByText(/week of/i).textContent();
    expect(labelAfter).not.toBe(labelBefore);
  });
});
