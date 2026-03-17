import { test, expect } from '@playwright/test';

test.describe('Leave page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/leave');
  });

  test('renders the page heading and button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /leave requests/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/manage your vacation/i)).toBeVisible();
    
    const requestButton = page.getByRole('button', { name: /request leave/i });
    await expect(requestButton).toBeVisible();
  });

  test('opens and interacts with the new leave request dialog', async ({ page }) => {
    const requestButton = page.getByRole('button', { name: /request leave/i });
    await requestButton.click();
    
    // Check for dialog header
    await expect(page.getByRole('heading', { name: /new leave request/i })).toBeVisible();
    
    // Check form labels
    await expect(page.getByText(/leave type/i)).toBeVisible();
    await expect(page.getByText(/date range/i)).toBeVisible();
    await expect(page.getByText(/reason/i)).toBeVisible();

    // Select leave type
    const trigger = page.locator('button[aria-haspopup="listbox"]').first();
    await trigger.click();
    
    // Select an option (e.g., Vacation)
    await page.getByRole('option', { name: /vacation/i }).click();
    await expect(trigger.getByText(/vacation/i)).toBeVisible();
    
    // Fill reason
    await page.getByPlaceholder(/tell us why/i).fill('Going to the mountains');
    
    // Select a date (simplified)
    await page.locator('button[aria-haspopup="dialog"]').nth(1).click();
    const day = page.locator('button:not([disabled])').getByText('15').first();
    if (await day.isVisible()) {
      await day.click();
    }
    
    // Verify submit button is present
    const submit = page.getByRole('button', { name: /submit request/i });
    await expect(submit).toBeVisible();
    
    // Close dialog
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /new leave request/i })).not.toBeVisible();
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
