import { test, expect } from '@playwright/test';

test('public copy and navigation work with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const route of ['/', '/tts/', '/pt/tts/', '/helper/', '/fr/helper/', '/commands/', '/docs/', '/docs/tts/', '/docs/helper/modules/']) {
    await page.goto(baseURL + route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.vozen-global-nav, .docs-ecosystem-nav, .guide-nav')).toHaveCount(1);
    await expect(page.locator('header nav a[href*="tts/"]').first()).toHaveAttribute('href', /tts\//);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/vozen.org\//);
  }
  await page.goto(baseURL + '/commands/');
  await expect(page.locator('#catalogue-tts')).toContainText('/setup');
  await expect(page.locator('#catalogue-helper')).toContainText('/ticket-panel');
  await page.goto(baseURL + '/tts/');
  await expect(page.locator('#faq-list .qa__a').first()).toBeVisible();
  await page.goto(baseURL + '/docs/tts/');
  await expect(page.locator('.docs-sidebar__tree a').first()).toBeVisible();
  await context.close();
});

test('prerendered content still supports command filtering and a single header', async ({ page }) => {
  await page.goto('/commands/');
  await expect(page.locator('.vozen-global-nav')).toHaveCount(1);
  await page.locator('[data-command-product="helper"]').click();
  await page.locator('#commandSearch').fill('ticket-panel');
  await expect(page.locator('.command-row')).toHaveCount(1);
  await expect(page.locator('.command-row')).toContainText('/ticket-panel');
});
