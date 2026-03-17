import { test, expect } from '@playwright/test';

test.describe('Org Structure page', () => {
  test('renders page heading and three tabs for admin', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/org/units**', route => route.fulfill({ json: [] }));
    await page.route('**/api/v1/org/roles**', route => route.fulfill({ json: [] }));

    await page.goto('/app/org');

    await expect(page.getByRole('heading', { name: /organization structure/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /company hierarchy/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /manage structure & roles/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /approval workflows/i })).toBeVisible();
  });

  test('non-admin user is redirected to home', async ({ context, page }) => {
    // Auth setup for non-admin
    await context.addInitScript(() => {
      localStorage.setItem(
        'auth_store',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            token: 'fake-token',
            user: { id: 2, email: 'user@example.com', role: 'User' },
            permissions: [],
          },
        }),
      );
    });

    // Mock API responses
    await page.route('**/api/v1/users/me**', route => route.fulfill({ json: { id: 2, email: 'user@example.com', role: 'User' } }));

    await page.goto('/app/org');
    
    // Check if redirected (path should be '/' or at least not '/app/org')
    await page.waitForURL('**/');
    expect(page.url()).not.toContain('/app/org');
  });

  test('shows unit creation form for admin', async ({ page }) => {
    await page.route('**/api/v1/org/units**', route => route.fulfill({ json: [] }));
    await page.route('**/api/v1/org/roles**', route => route.fulfill({ json: [] }));

    await page.goto('/app/org');
    await page.getByRole('tab', { name: /manage structure & roles/i }).click();
    await expect(page.getByRole('heading', { name: /create new org unit/i })).toBeVisible();
    await expect(page.getByLabel(/unit name/i)).toBeVisible();
  });
});
