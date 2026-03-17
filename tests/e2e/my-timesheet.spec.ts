import { test, expect } from '@playwright/test';

test.describe('My Timesheet page', () => {
  test.beforeEach(async ({ page }) => {
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

  test('renders current week toggle', async ({ page }) => {
    await expect(page.getByRole('button', { name: /current week only/i })).toBeVisible({ timeout: 8_000 });
  });

  test('renders timesheet table headers', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: /task/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('columnheader', { name: /project/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /total/i })).toBeVisible();
  });

  test('week navigation controls are disabled when period cannot change', async ({ page }) => {
    await expect(page.getByRole('button', { name: /previous week/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /next week/i })).toBeDisabled();
  });
});
