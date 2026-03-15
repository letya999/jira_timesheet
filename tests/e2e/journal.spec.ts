import { test, expect } from '@playwright/test';

test.describe('Journal page', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: 'fake-token',
            user: { id: 1, email: 'user@example.com' },
            permissions: ['timesheet:read'],
          },
        }),
      );
      localStorage.setItem('auth_token', 'fake-token');
    });
    await page.goto('/app/journal');
  });

  test('renders the page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /journal/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('renders the date range picker', async ({ page }) => {
    // DateRangePickerTZ renders a button with date range text
    await expect(
      page.getByRole('button', { name: /pick a date range|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('renders data table with expected column headers', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('columnheader', { name: /project/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /issue/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /hours/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /type/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /category/i })).toBeVisible();
  });

  test('renders the pagination bar', async ({ page }) => {
    // PaginationBar renders prev/next navigation
    await expect(
      page.getByRole('navigation'),
    ).toBeVisible({ timeout: 8_000 });
  });
});
