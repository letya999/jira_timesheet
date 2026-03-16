import { test, expect } from '@playwright/test';

test.describe('AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/dashboard');
  });

  test('Navigate to AI Chat and send a message', async ({ page }) => {
    await page.click('a[href="/app/ai-chat"]');
    await expect(page).toHaveURL('/app/ai-chat');
    await expect(page.locator('h1')).toContainText('AI Assistant');

    // Mock API response for health check
    await page.route('/api/v1/ai/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: true, ready: true }),
      });
    });

    // Mock SSE for chat
    await page.route('/api/v1/ai/chat', async route => {
      const chunks = [
        { stage: 'generating_sql' },
        { stage: 'sql', sql: 'SELECT * FROM worklogs;' },
        { stage: 'running_query' },
        { stage: 'data', data: [{ id: 1, hours: 8 }] },
        { stage: 'complete', answer: 'The total hours logged is 8.' }
      ];

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join(''),
      });
    });

    const input = page.locator('textarea[placeholder*="Ask anything"]');
    await input.fill('How many hours did I log?');
    await page.click('button:has(svg)'); // Send button

    // Check message bubbles
    await expect(page.locator('text=How many hours did I log?')).toBeVisible();
    await expect(page.locator('text=The total hours logged is 8.')).toBeVisible();

    // Check SQL block
    await page.click('button:has-text("Toggle SQL")');
    await expect(page.locator('pre')).toContainText('SELECT * FROM worklogs;');
    
    // Check Data Table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table')).toContainText('8');
  });

  test('Admin should see Training button, Employee should not', async ({ page }) => {
    // Admin check
    await page.goto('/app/ai-chat');
    await expect(page.locator('button:has-text("Training")')).toBeVisible();

    // Logout and login as employee
    await page.click('button:has-text("JD")'); // User menu
    await page.click('text=Logout');
    
    await page.fill('input[name="email"]', 'employee@example.com');
    await page.fill('input[name="password"]', 'employee123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/app/dashboard');

    await page.goto('/app/ai-chat');
    await expect(page.locator('button:has-text("Training")')).not.toBeVisible();
  });
});
