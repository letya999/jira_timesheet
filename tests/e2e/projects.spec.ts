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
    await expect(page.getByRole('heading', { name: /project management/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /refresh projects from jira/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sync all active projects/i })).toBeVisible();
  });

  test('renders search input', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: /search projects/i })).toBeVisible();
  });

  test('clicking a project navigates to project detail', async ({ page }) => {
    await expect(page.getByText('PROJ', { exact: true })).toBeVisible();
    await expect(page.getByText('My Project')).toBeVisible();
    await expect(page.getByRole('button', { name: /sync now/i })).toBeVisible();
  });
});
