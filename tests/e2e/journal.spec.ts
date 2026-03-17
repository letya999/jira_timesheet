import { test, expect } from '@playwright/test';

test.describe('Journal page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/journal');
  });

  test('renders journal shell and filters', async ({ page }) => {
    await expect(page.getByRole('link', { name: /journal/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /filters/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /journal\.start_date/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /journal\.end_date/i })).toBeVisible();
  });

  test('renders log list and pagination controls', async ({ page }) => {
    await expect(page.getByText(/Showing \d+-\d+ of \d+ logs/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /Go to next page/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Go to last page/i })).toBeVisible();
  });
});
