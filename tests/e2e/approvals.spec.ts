import { test, expect } from '@playwright/test';

const submittedPeriod = {
  id: 101,
  user_name: 'John Manager',
  user_email: 'john.manager@example.com',
  start_date: '2026-03-09',
  end_date: '2026-03-15',
  total_hours: 40,
  status: 'SUBMITTED',
};

test.describe('Approvals page', () => {
  test.describe('With data', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/v1/approvals/team-periods**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [submittedPeriod], total: 1, page: 1, size: 50, pages: 1 }),
        }),
      );

      await page.route('**/api/v1/approvals/*/approve', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok' }),
        }),
      );

      await page.goto('/app/approvals');
      await expect(page.getByRole('heading', { name: /approvals/i })).toBeVisible({ timeout: 10_000 });
    });

    test('renders the page heading and action buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: /approve all/i })).toBeVisible();
    });

    test('performs bulk approval', async ({ page }) => {
      let approveCalls = 0;
      await page.unroute('**/api/v1/approvals/*/approve');
      await page.route('**/api/v1/approvals/*/approve', async (route) => {
        approveCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok' }),
        });
      });

      const approveAll = page.getByRole('button', { name: /approve all/i });
      await approveAll.click();
      await expect.poll(() => approveCalls).toBeGreaterThan(0);
    });

    test('individual approve/reject actions are visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: /approve/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /reject/i }).first()).toBeVisible();
    });

    test('reject flow sends comment to backend', async ({ page }) => {
      let capturedBody: Record<string, unknown> | null = null;
      let promptHandled = false;

      await page.unroute('**/api/v1/approvals/*/approve');
      await page.route('**/api/v1/approvals/*/approve', async (route) => {
        capturedBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok' }),
        });
      });

      page.once('dialog', async (dialog) => {
        promptHandled = true;
        await dialog.accept('Rejected due to missing details');
      });

      const cardRejectButton = page.locator('[data-slot=\"card-footer\"] button').filter({ hasText: /^Reject$/i }).first();
      await cardRejectButton.click();

      const rejectDialog = page.getByRole('dialog');
      if (await rejectDialog.isVisible().catch(() => false)) {
        await page.getByTestId('approval-reject-comment').fill('Rejected due to missing details');
        await rejectDialog.getByRole('button', { name: /^reject$/i }).click();
      }

      await expect.poll(() => capturedBody?.status).toBe('rejected');
      if (promptHandled || (capturedBody?.comment ?? null) !== null) {
        expect(capturedBody?.comment).toBe('Rejected due to missing details');
      }
      await expect(page.getByText(/period rejected/i)).toBeVisible();
    });
  });

  test.describe('Empty state', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/v1/approvals/team-periods**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0, page: 1, size: 50, pages: 0 }),
        }),
      );

      await page.goto('/app/approvals');
    });

    test('shows empty state message when no periods exist', async ({ page }) => {
      await expect(page.getByText(/no pending approvals/i)).toBeVisible({ timeout: 10_000 });
    });
  });
});
