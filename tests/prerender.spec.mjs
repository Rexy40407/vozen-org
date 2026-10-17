import { test, expect } from '@playwright/test';

test('public copy and navigation work with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const route of ['/', '/tts/', '/pt/tts/', '/helper/', '/fr/helper/', '/commands/', '/docs/', '/docs/tts/', '/docs/helper/modules/', '/docs/helper/guides/welcome/']) {
    await page.goto(baseURL + route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.vozen-global-nav, .docs-ecosystem-nav, .guide-nav')).toHaveCount(1);
    await expect(page.locator('header nav a[href*="tts/"]').first()).toHaveAttribute('href', /tts\//);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\/vozen.org\//);
    if (route.startsWith('/docs/')) {
      await expect(page.locator('[data-docs-visual-guide]')).toHaveCount(1);
      await expect(page.locator('[data-docs-visual-guide] img')).toHaveAttribute('alt', /Illustrated example/);
    }
    if (route === '/docs/' || route === '/docs/tts/') {
      const cards = page.locator(route === '/docs/' ? '.docs-overview__card' : '.tts-section-card');
      await expect(cards).toHaveCount(route === '/docs/' ? 2 : 6);
      for (const card of await cards.all()) {
        await expect(card.locator('h2')).toHaveCount(1);
        await expect(card.locator('a')).toHaveCount(0);
      }
    }
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

for (const width of [390, 1440]) {
  test(`docs walkthrough is opt-in and uses the matching video at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/docs/helper/guides/welcome/');
    await expect(page.locator('.docs-current-sections a[href="#optional-member-role"]')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('.docs-current-sections a[href="#optional-member-role"]')).toHaveCount(1);
    const image = page.locator('[data-docs-visual-guide] img');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(node => node.decode());
    expect(await image.evaluate(node => node.currentSrc.includes('-mobile.webp'))).toBe(width < 600);
    const video = page.locator('[data-docs-visual-guide] video');
    expect(await video.evaluate(node => node.paused && node.currentTime === 0)).toBe(true);
    await page.getByRole('tab', { name: 'Walkthrough', exact: true }).click();
    await video.evaluate(node => node.play());
    await page.waitForFunction(() => document.querySelector('.docs-visual-guide video').currentTime > .1);
    expect(await video.evaluate(node => node.videoWidth)).toBe(width < 600 ? 420 : 960);
    expect(await video.evaluate(node => node.error)).toBe(null);
    await video.evaluate(node => node.pause());
    await page.getByRole('tab', { name: 'Image', exact: true }).click();
    await expect(page.locator('[data-docs-image-panel]')).toBeVisible();
    await expect(video).not.toBeVisible();
  });
}

test('prerendered content still supports command filtering and a single header', async ({ page }) => {
  await page.goto('/commands/');
  await expect(page.locator('.vozen-global-nav')).toHaveCount(1);
  await page.locator('[data-command-product="helper"]').click();
  await page.locator('#commandSearch').fill('ticket-panel');
  await expect(page.locator('.command-row')).toHaveCount(1);
  await expect(page.locator('.command-row')).toContainText('/ticket-panel');
});
