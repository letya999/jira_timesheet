import { test, expect, type Locator, type Page } from '@playwright/test';

type Worklog = {
  date: string;
  hours?: number;
  category?: string | null;
  project_name?: string;
  issue_key?: string;
  issue_summary?: string | null;
  type?: string;
  status?: string;
};

type Kpi = { total: number; capex: number; opex: number };

function extractEntries(payload: unknown): Worklog[] {
  if (Array.isArray(payload)) return payload as Worklog[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: Worklog[] }).items;
  }
  return [];
}

function computeKpi(entries: Worklog[]): Kpi {
  const total = entries.reduce((sum, item) => sum + (item.hours ?? 0), 0);
  const capex = entries
    .filter((item) => item.category?.toUpperCase() === 'CAPEX')
    .reduce((sum, item) => sum + (item.hours ?? 0), 0);
  const opex = entries
    .filter((item) => item.category?.toUpperCase() === 'OPEX')
    .reduce((sum, item) => sum + (item.hours ?? 0), 0);

  return { total, capex, opex };
}

async function findKpiCard(page: Page, title: string): Promise<Locator> {
  const card = page.locator('[data-slot=\"card\"]').filter({
    has: page.getByText(title, { exact: true }),
  }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  return card;
}

async function readCardKpi(card: Locator): Promise<Kpi> {
  const text = await card.innerText();
  const matches = [...text.matchAll(/([0-9]+(?:\.[0-9]+)?)h/g)].map((match) => Number(match[1]));
  if (matches.length < 3) {
    throw new Error(`Unable to parse KPI card values: ${text}`);
  }

  return {
    total: matches[0],
    capex: matches[1],
    opex: matches[2],
  };
}

test.describe('Dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    const weekWorklogs: Worklog[] = [
      { date: '2026-03-16', hours: 8, category: 'OPEX', project_name: 'PRJ', issue_key: 'PRJ-1', type: 'JIRA', status: 'APPROVED' },
      { date: '2026-03-17', hours: 6, category: 'OPEX', project_name: 'PRJ', issue_key: 'PRJ-2', type: 'JIRA', status: 'APPROVED' },
      { date: '2026-03-18', hours: 2.5, category: 'CAPEX', project_name: 'PRJ', issue_key: 'PRJ-3', type: 'JIRA', status: 'APPROVED' },
    ];
    const monthWorklogs: Worklog[] = [
      { date: '2026-03-01', hours: 12, category: 'OPEX', project_name: 'PRJ', issue_key: 'PRJ-11', type: 'JIRA', status: 'APPROVED' },
      { date: '2026-03-05', hours: 10, category: 'CAPEX', project_name: 'PRJ', issue_key: 'PRJ-12', type: 'JIRA', status: 'APPROVED' },
      { date: '2026-03-09', hours: 4, category: 'OPEX', project_name: 'PRJ', issue_key: 'PRJ-13', type: 'JIRA', status: 'APPROVED' },
      { date: '2026-03-12', hours: 6, category: 'CAPEX', project_name: 'PRJ', issue_key: 'PRJ-14', type: 'JIRA', status: 'APPROVED' },
    ];

    await page.route('**/api/v1/timesheet**', async (route) => {
      const requestUrl = new URL(route.request().url());
      const startDate = requestUrl.searchParams.get('start_date');
      const endDate = requestUrl.searchParams.get('end_date');
      const days = startDate && endDate
        ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      const items = days <= 8 ? weekWorklogs : monthWorklogs;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, total: items.length, page: 1, size: 500, pages: 1 }),
      });
    });

    await page.route('**/api/v1/projects**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, size: 200, pages: 0 }),
      }),
    );

    await page.route('**/api/v1/org/units**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );

    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  });

  test('renders the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 8_000 });
  });

  test('renders collapsible dashboard filters', async ({ page }) => {
    await expect(page.getByRole('button', { name: /hide filters|show filters/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByLabel('Week')).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Project$/ }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Team$/ }).first()).toBeVisible();
  });

  test('shows KPI values consistent with backend worklog data', async ({ page }) => {
    const ranges = new Map<string, Worklog[]>();

    page.on('response', async (response) => {
      if (!response.ok()) return;
      if (response.request().method() !== 'GET') return;
      if (!response.url().includes('/api/v1/timesheet')) return;

      const url = new URL(response.url());
      const start = url.searchParams.get('start_date');
      const end = url.searchParams.get('end_date');
      if (!start || !end) return;

      const payload = await response.json().catch(() => null);
      const entries = extractEntries(payload);
      ranges.set(`${start}|${end}`, entries);
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 8_000 });

    await expect.poll(() => ranges.size, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);

    const backendKpis = [...ranges.values()].map(computeKpi);
    const hasMatchingKpi = (actual: Kpi) =>
      backendKpis.some(
        (kpi) =>
          Math.abs(kpi.total - actual.total) < 0.1 &&
          Math.abs(kpi.capex - actual.capex) < 0.1 &&
          Math.abs(kpi.opex - actual.opex) < 0.1,
      );

    const weekCard = await readCardKpi(await findKpiCard(page, 'Selected Week'));
    const monthCard = await readCardKpi(await findKpiCard(page, 'Selected Month'));
    const capexCard = await readCardKpi(await findKpiCard(page, 'CapEx Total'));
    const opexCard = await readCardKpi(await findKpiCard(page, 'OpEx Total'));

    expect(hasMatchingKpi(weekCard)).toBeTruthy();

    expect(capexCard.capex).toBeCloseTo(monthCard.capex, 1);
    expect(capexCard.opex).toBeCloseTo(0, 1);

    expect(opexCard.capex).toBeCloseTo(0, 1);
    expect(opexCard.opex).toBeCloseTo(monthCard.opex, 1);
  });

  test('renders the sync status widget with Sync Now button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sync now/i })).toBeVisible({ timeout: 8_000 });
  });

  test('renders the recent activity section', async ({ page }) => {
    await expect(page.getByText('Recent Activity')).toBeVisible({ timeout: 8_000 });
  });
});
