import { test, expect } from '@playwright/test';

test.describe('Employees page', () => {
  test.beforeEach(async ({ context, page }) => {
    // Auth setup
    await context.addInitScript(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: 'fake-token',
            user: { id: 1, email: 'admin@example.com', role: 'Admin' },
            permissions: ['admin'],
          },
        }),
      );
    });

    // Mock API responses
    await page.route('**/api/v1/org/employees**', route => route.fulfill({
      json: { 
        items: [
          { id: 1, display_name: 'Alice', email: 'a@x.com', jira_account_id: 'J1', avatar_url: null, is_active: true, weekly_quota: 40, org_unit_id: null, user_id: null }
        ], 
        total: 1, 
        pages: 1 
      }
    }));
    await page.route('**/api/v1/org/units**', route => route.fulfill({ json: [] }));

    await page.goto('/app/employees');
  });

  test('renders page heading and tabs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /employees/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /list view/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /hierarchy view/i })).toBeVisible();
  });

  test('shows sync button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sync from jira/i })).toBeVisible();
  });

  test('renders search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search employees/i)).toBeVisible();
  });

  test('switching to hierarchy view works', async ({ page }) => {
    await page.getByRole('tab', { name: /hierarchy view/i }).click();
    await expect(page.getByText(/unassigned/i)).toBeVisible();
    await expect(page.getByText('Alice')).toBeVisible();
  });
});
