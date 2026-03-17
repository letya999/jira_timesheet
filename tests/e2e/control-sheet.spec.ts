import { test, expect } from '@playwright/test';

test.describe('Control Sheet page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/control-sheet');
  });

  test('renders heading and filters', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /control sheet/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /hide filters|show filters/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /week/i })).toBeVisible();
  });

  test('renders summary sections or empty state', async ({ page }) => {
    const hasEmpty = await page.getByText(/no data|empty/i).isVisible().catch(() => false);
    if (hasEmpty) {
      await expect(page.getByText(/no data|empty/i)).toBeVisible();
      return;
    }

    await expect(page.getByText('Team Summary', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Employee Summary \(\d+\)/i)).toBeVisible({ timeout: 10_000 });
  });

  test('opens status dialog when status action is available', async ({ page }) => {
    const statusButton = page.getByRole('button', { name: /change status/i }).first();
    const visible = await statusButton.isVisible().catch(() => false);
    if (!visible) return;

    await statusButton.click();
    await expect(page.getByRole('heading', { name: /status/i })).toBeVisible();
  });
});
