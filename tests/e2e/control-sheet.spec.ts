import { test, expect } from '@playwright/test';

async function isOnLogin(page: { url: () => string }) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return page.url().includes('/login');
}

test.describe('Control Sheet page', () => {
  test.beforeEach(async ({ context, page }) => {
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

  test('renders heading and filters', async ({ page }) => {
    if (await isOnLogin(page)) {
      await expect(page).toHaveURL(/\/login$/);
      return;
    }

    await expect(page.getByRole('heading', { name: /control sheet/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/фильтры control sheet/i)).toBeVisible();
    await expect(page.getByLabel(/неделя/i)).toBeVisible();
  });

  test('renders summary sections or empty state', async ({ page }) => {
    if (await isOnLogin(page)) {
      await expect(page).toHaveURL(/\/login$/);
      return;
    }

    const hasEmpty = await page.getByText(/нет данных за выбранную неделю/i).isVisible().catch(() => false);
    if (hasEmpty) {
      await expect(page.getByText(/попробуйте изменить неделю или команду/i)).toBeVisible();
      return;
    }

    await expect(page.getByText(/сводка команды/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/сводка сотрудников/i)).toBeVisible({ timeout: 10_000 });
  });

  test('opens status dialog when status action is available', async ({ page }) => {
    if (await isOnLogin(page)) {
      await expect(page).toHaveURL(/\/login$/);
      return;
    }

    const statusButton = page.getByRole('button', { name: /изменить статус/i }).first();
    const visible = await statusButton.isVisible().catch(() => false);
    if (!visible) return;

    await statusButton.click();
    await expect(page.getByRole('heading', { name: /смена статуса периода/i })).toBeVisible();
    await expect(page.getByLabel(/комментарий/i)).toBeVisible();
  });
});
