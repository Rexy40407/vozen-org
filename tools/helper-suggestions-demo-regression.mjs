// Uses synthetic API fixtures only. Never writes customer configuration or
// sends Discord messages, even when exercising validation failure/retry.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const browser = await chromium.launch();
try {
  for (const scenario of ['en', 'pt', 'api-failure', 'invalid', 'media-failure', 'mobile', 'close', 'route-change', 'timeout', 'unauthenticated']) {
    if (process.env.SUGGESTIONS_DEMO_SCENARIO && process.env.SUGGESTIONS_DEMO_SCENARIO !== scenario) continue;
    const page = await browser.newPage();
    const pt = scenario === 'pt';
    let simulations = 0, writes = 0;
    const config = { channel: 'sample-suggestions', voteMode: 'up_down', anonymous: false, cooldownHours: 24, requiredRole: '', staffChannel: '' };
    const feature = { key: 'community.suggestions', label: 'Suggestions', category: 'community', enabled: true, available: true };
    if (pt) await page.addInitScript(() => localStorage.setItem('vozen.lang', 'pt'));
    if (scenario === 'mobile') await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (scenario === 'timeout') await page.addInitScript(() => {
      const original = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => original(callback, delay === 20000 ? 200 : delay, ...args);
    });
    if (scenario === 'media-failure') await page.route('**/feature-demos/suggestions-*.webm', route => route.fulfill({ status: 404, body: '' }));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname.replace(/^.*?(?=\/api\/)/, '');
      let value;
      if (path.endsWith('/simulate')) {
        simulations++;
        assert.equal(path, '/api/config/features/community.suggestions/simulate');
        assert.equal(route.request().method(), 'POST');
        assert.deepEqual(route.request().postDataJSON().config, config);
        if ((scenario === 'api-failure' || scenario === 'unauthenticated') && simulations === 1) {
          await route.fulfill({ status: scenario === 'unauthenticated' ? 401 : 503, json: { code: scenario === 'unauthenticated' ? 'unauthenticated' : 'unavailable' } }); return;
        }
        if (['close', 'route-change', 'timeout'].includes(scenario)) await new Promise(resolve => setTimeout(resolve, 700));
        value = { ok: scenario !== 'invalid', key: feature.key, mode: 'simulation', result: { key: feature.key, would_apply: scenario !== 'invalid', effects: ['Synthetic suggestion preview'], issues: scenario === 'invalid' ? [{ severity: 'error', message: 'Select a valid channel' }] : [] } };
      } else {
        if (!['GET', 'HEAD'].includes(route.request().method())) writes++;
        if (path === '/api/me') value = { id: 'qa-user', guildId: 'sample', dbOk: true };
        else if (path === '/api/guilds') value = { guilds: [{ id: 'sample', name: 'Sample server', canManage: true }] };
        else if (path === '/api/config/features') value = { guildId: 'sample', features: [feature] };
        else if (path === '/api/config/features/community.suggestions') value = {
          ...feature, guildId: 'sample', config, defaults: {}, revision: 1,
          schema: { sections: [{ title: 'Suggestion intake', fields: [{ key: 'channel', label: 'Suggestion channel', kind: 'channel' }, { key: 'voteMode', label: 'Voting mode', kind: 'select', options: [['up_down', 'Support / against'], ['up_only', 'Support only']] }, { key: 'anonymous', label: 'Hide author in the public message', kind: 'toggle' }] }, { title: 'Moderation', fields: [{ key: 'cooldownHours', label: 'Cooldown per member (hours)', kind: 'number' }, { key: 'requiredRole', label: 'Required role (optional)', kind: 'role' }, { key: 'staffChannel', label: 'Staff notification channel (optional)', kind: 'channel' }] }] },
        };
        else if (path === '/api/guild-context') value = { guildId: 'sample', name: 'Sample server', permissions: '8', channels: [{ id: 'sample-suggestions', name: 'suggestions', type: 'text' }], roles: [], hierarchy: { known: true }, capabilities: { channelSelectors: true, roleSelectors: true, permissionPreflight: true } };
        else if (path === '/api/stats') value = { guildId: 'sample', totalCases: 0 };
        else if (path === '/api/cases') value = { cases: [] };
        else if (path === '/api/audit') value = { events: [] };
        else if (path === '/api/activity') value = { activity: [] };
        else if (path === '/api/quotas') value = { plan: 'Free', limits: {}, usage: {} };
        else { await route.fulfill({ status: 503, json: {} }); return; }
      }
      await route.fulfill({ json: value });
    });
    await page.goto(`${base}#/config/community.suggestions`);
    const simulate = page.getByRole('button', { name: pt ? 'Simular configuração' : 'Simulate configuration', exact: true });
    await simulate.click();
    const dialog = page.getByRole('dialog', { name: pt ? 'Sugestões' : 'Suggestions', exact: true });
    await dialog.waitFor();
    const video = dialog.locator('video');
    assert.equal(await video.count(), 1, 'Suggestions must include its own video, independent of API validation');
    assert.equal(await video.locator('source').getAttribute('src'), `/panel/helper-tracker/feature-demos/suggestions-${pt ? 'pt' : 'en'}.webm`);
    assert.equal(await dialog.locator('.feature-simulation__steps p').count(), 3);
    if (scenario === 'media-failure') {
      await dialog.getByRole('alert').filter({ hasText: 'video could not load' }).waitFor();
      assert.equal(await dialog.locator('.feature-simulation__steps').isVisible(), true);
    } else {
      await page.waitForFunction(() => document.querySelector('.feature-simulation video')?.readyState >= 2);
      assert.equal(await video.evaluate(element => element.paused), true, 'no autoplay, including reduced-motion');
      const duration = await video.evaluate(element => element.duration);
      assert.ok(Number.isFinite(duration) && duration > 9 && duration < 11, 'playable 10-second example');
      await video.evaluate(element => element.play());
      await page.waitForFunction(() => document.querySelector('.feature-simulation video')?.currentTime > .5);
      await video.evaluate(element => element.pause());
      if (scenario === 'en' || pt) {
        await video.evaluate(element => { element.currentTime = 8; });
        await page.waitForFunction(() => {
          const player = document.querySelector('.feature-simulation video');
          return player && !player.seeking && player.readyState >= 2 && player.currentTime >= 8;
        });
        await mkdir('output/playwright', { recursive: true });
        await video.screenshot({ path: `output/playwright/suggestions-demo-${scenario}-approved.png` });
      }
    }
    if (['api-failure', 'unauthenticated', 'timeout'].includes(scenario)) {
      await dialog.getByRole('alert').filter({ hasText: 'Could not validate' }).waitFor();
      assert.equal(await video.isVisible(), true, 'API failure must not hide the example');
      assert.equal(await dialog.getByText('The API validated these settings.', { exact: false }).count(), 0);
      if (scenario !== 'timeout') {
        await dialog.getByRole('button', { name: 'Retry validation', exact: true }).click();
        await dialog.getByText('The API validated these settings.', { exact: false }).waitFor();
        assert.equal(simulations, 2);
      }
    } else if (scenario === 'invalid') await dialog.getByText('Select a valid channel', { exact: true }).waitFor();
    if (scenario === 'mobile' || scenario === 'en' || pt || scenario === 'api-failure') {
      await mkdir('output/playwright', { recursive: true });
      await dialog.screenshot({ path: `output/playwright/suggestions-demo-${scenario}.png` });
      assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), true, 'no horizontal modal overflow');
    }
    if (scenario === 'route-change') {
      await page.evaluate(() => { window.location.hash = '#/features'; });
    } else await dialog.getByRole('button', { name: pt ? 'Fechar demonstração' : 'Close demonstration', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await new Promise(resolve => setTimeout(resolve, scenario === 'close' || scenario === 'route-change' ? 800 : 20));
    assert.equal(await dialog.count(), 0, 'late response cannot reopen a closed demo');
    assert.equal(writes, 0, 'opening, playing, retrying and closing a demo must not write settings');
    assert.equal(await page.getByRole('button', { name: 'Send a test to Discord', exact: true }).count(), 0);
    console.log(`PASS suggestions-demo-${scenario}`);
    await page.close();
  }
} finally { await browser.close(); }
