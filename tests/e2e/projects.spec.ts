import { test, expect } from '@playwright/test';

test.describe('Projects page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/v1/projects**', route => route.fulfill({
      json: { 
        items: [
          { id: 1, jira_id: 'P1', key: 'PROJ', name: 'My Project', is_active: true, created_at: '', updated_at: '' }
        ], 
        total: 1, 
        pages: 1 
      }
    }));

    await page.goto('/app/projects');
  });

  test('renders page heading and action buttons', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /refresh project list/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sync all active projects/i })).toBeVisible();
  });

  test('renders search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/filter by name or key/i)).toBeVisible();
  });

  test('clicking a project navigates to project detail', async ({ page }) => {
    await page.getByText('PROJ').click();
    await page.waitForURL('**/app/projects/1');
    expect(page.url()).toContain('/app/projects/1');
  });
});
