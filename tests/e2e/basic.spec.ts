import { test, expect } from '@playwright/test';

test('app loads home page', async ({ page }) => {
  await page.goto('/');
  // Title check from index.html
  await expect(page).toHaveTitle(/Desktop AI Assistant/i);
  // Root element is present
  const root = page.locator('#root');
  await expect(root).toBeVisible();
});

