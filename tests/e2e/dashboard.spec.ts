import { test, expect } from '@playwright/test';

const VALID_USERNAME = process.env.E2E_USERNAME ?? 'admin@example.com';
const VALID_PASSWORD = process.env.E2E_PASSWORD ?? 'admin123';

test.describe('Dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /username/i }).fill(VALID_USERNAME);
    await page.getByLabel(/password/i).fill(VALID_PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test('renders the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 8_000 });
  });

  test('renders four KPI summary cards', async ({ page }) => {
    await expect(page.getByText('Selected Week')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Selected Month')).toBeVisible();
    await expect(page.getByText('CapEx Total')).toBeVisible();
    await expect(page.getByText('OpEx Total')).toBeVisible();
  });

  test('renders collapsible dashboard filters', async ({ page }) => {
    await expect(page.getByText('Dashboard filters')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByLabel('Week')).toBeVisible();
    await expect(page.getByText('Project')).toBeVisible();
    await expect(page.getByText('Team')).toBeVisible();
  });

  test('renders the sync status widget with Sync Now button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /sync now/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('renders the recent activity section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible({ timeout: 8_000 });
  });
});
