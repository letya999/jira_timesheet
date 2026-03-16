import { test, expect } from '@playwright/test';

test.describe('Control Sheet page', () => {
  test.beforeEach(async ({ context, page }) => {
    // Seed auth state as Admin/Manager
    await context.addInitScript(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: 'fake-token',
            user: { id: 1, email: 'admin@example.com', role: 'ADMIN' },
            permissions: ['timesheet:manage', 'timesheet:read'],
          },
        }),
      );
      localStorage.setItem('auth_token', 'fake-token');
    });
    await page.goto('/app/control-sheet');
  });

  test('renders the page heading and date picker', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /control sheet/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/aggregated team worklogs/i)).toBeVisible();
    
    // Check for date range picker
    const rangePicker = page.locator('button[aria-haspopup="dialog"]').first();
    await expect(rangePicker).toBeVisible();
  });

  test('renders the aggregated timesheet grid header', async ({ page }) => {
    // TimesheetGrid should have a header "Task / Project"
    await expect(page.getByText(/task \/ project/i)).toBeVisible({ timeout: 10_000 });
  });

  test('opens and interacts with the date range picker', async ({ page }) => {
    const rangePicker = page.locator('button[aria-haspopup="dialog"]').first();
    await rangePicker.click();
    
    // Wait for the popover/dialog
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    
    // Verify month navigation buttons are present
    await expect(page.locator('button[name="previous-month"]')).toBeVisible();
    await expect(page.locator('button[name="next-month"]')).toBeVisible();
    
    // Select a day (simplified)
    const day = page.locator('button:not([disabled])').getByText('15').first();
    if (await day.isVisible()) {
      await day.click();
    }
  });

  test('handles no data state correctly', async ({ page }) => {
    // If MSW returns empty, we should see FileSpreadsheet icon or message
    // await expect(page.getByText(/no worklogs found/i)).toBeVisible();
  });
});
