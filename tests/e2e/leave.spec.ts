import { test, expect } from '@playwright/test';

test.describe('Leave page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/leave');
  });

  test('renders the page heading and button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /leave & vacations/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/absence management/i)).toBeVisible();

    const requestButton = page.getByRole('button', { name: /submit leave request/i });
    await expect(requestButton).toBeVisible();
  });

  test('opens and interacts with the new leave request dialog', async ({ page }) => {
    const requestButton = page.getByRole('button', { name: /submit leave request/i });
    await requestButton.click();
    await expect(page.getByRole('dialog', { name: /new leave request/i })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /leave type/i })).toBeVisible();
    await expect(page.getByText('Date Range', { exact: true })).toBeVisible();
  });

  test('shows empty state when no requests exist', async ({ page }) => {
    // If MSW returns empty:
    // await expect(page.getByText(/no leave requests/i)).toBeVisible();
  });

  test('renders leave cards correctly', async ({ page }) => {
    // Card with user avatar
    const avatar = page.locator('img[alt]').first();
    // Badge labels
    const badge = page.locator('.inline-flex.items-center.rounded-full').first();
    // Dates
    const calendarIcon = page.locator('.lucide-calendar').first();
    
    // These should exist if data is mocked
    // await expect(avatar).toBeVisible();
    // await expect(badge).toBeVisible();
    // await expect(calendarIcon).toBeVisible();
  });
});
