// Uses synthetic API fixtures only. Never writes customer configuration or
// sends Discord messages, even when exercising validation failure/retry.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.HELPER_TEST_URL || 'http://127.0.0.1:5179/panel/helper-tracker/';
const demoFeature = process.env.FEATURE_DEMO_FEATURE || 'suggestions';
if (!['suggestions', 'giveaways', 'tickets', 'welcome'].includes(demoFeature)) throw new Error('Unknown regression feature');
const giveaway = demoFeature === 'giveaways';
const tickets = demoFeature === 'tickets';
const welcome = demoFeature === 'welcome';
const featureKey = `${tickets || welcome ? 'support' : 'community'}.${demoFeature}`;
const browser = await chromium.launch();
try {
  for (const scenario of ['en', 'pt', 'api-failure', 'invalid', 'media-failure', 'mobile', 'close', 'route-change', 'timeout', 'unauthenticated', 'reduced-motion', 'dismiss-outside', 'dismiss-inside', 'dismiss-padding', 'dismiss-drag', 'dismiss-mobile', 'dismiss-touch', 'dismiss-escape', ...(welcome ? ['disabled-feature'] : [])]) {
    if (process.env.SUGGESTIONS_DEMO_SCENARIO && process.env.SUGGESTIONS_DEMO_SCENARIO !== scenario) continue;
    const page = await browser.newPage(scenario === 'dismiss-touch' ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {});
    const dismissScenario = scenario.startsWith('dismiss-');
    const pt = scenario === 'pt';
    let simulations = 0, writes = 0;
    const config = welcome ? { channel: 'sample-welcome', message: 'Welcome {member} to {server}!', guideEnabled: true, autoRole: '', sendDm: false }
      : tickets ? { panelChannel: 'sample-support', categoryId: '', staffRole: '', transcriptChannel: '', maxOpen: 1, panelTitle: 'Need support?', panelDescription: 'Open a private ticket.', closeAfterHours: 1 }
      : giveaway ? { defaultDurationHours: 24, defaultWinners: 1, requiredRole: '' }
      : { channel: 'sample-suggestions', voteMode: 'up_down', anonymous: false, cooldownHours: 24, requiredRole: '', staffChannel: '' };
    const feature = { key: featureKey, label: welcome ? 'Welcome' : tickets ? 'Tickets' : giveaway ? 'Giveaways' : 'Suggestions', category: tickets || welcome ? 'support' : 'community', enabled: scenario !== 'disabled-feature', available: true };
    const localizedLabel = welcome ? (pt ? 'Boas-vindas' : 'Welcome') : tickets ? 'Tickets' : pt ? (giveaway ? 'Sorteios' : 'Sugestões') : feature.label;
    if (pt) await page.addInitScript(() => localStorage.setItem('vozen.lang', 'pt'));
    if (scenario === 'mobile' || scenario === 'dismiss-mobile') await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: scenario === 'reduced-motion' ? 'reduce' : 'no-preference' });
    if (scenario === 'timeout') await page.addInitScript(() => {
      const original = window.setTimeout;
      window.setTimeout = (callback, delay, ...args) => original(callback, delay === 20000 ? 200 : delay, ...args);
    });
    if (scenario === 'media-failure') await page.route(`**/feature-demos/${demoFeature}-*.gif`, route => route.fulfill({ status: 404, body: '' }));
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname.replace(/^.*?(?=\/api\/)/, '');
      let value;
      if (path.endsWith('/simulate')) {
        simulations++;
        assert.equal(path, `/api/config/features/${featureKey}/simulate`);
        assert.equal(route.request().method(), 'POST');
        assert.deepEqual(route.request().postDataJSON().config, config);
        if ((scenario === 'api-failure' || scenario === 'unauthenticated') && simulations === 1) {
          await route.fulfill({ status: scenario === 'unauthenticated' ? 401 : 503, json: { code: scenario === 'unauthenticated' ? 'unauthenticated' : 'unavailable' } }); return;
        }
        if (['close', 'route-change', 'timeout'].includes(scenario) || dismissScenario) await new Promise(resolve => setTimeout(resolve, dismissScenario ? 1500 : 700));
        value = { ok: scenario !== 'invalid', key: feature.key, mode: 'simulation', result: { key: feature.key, would_apply: scenario !== 'invalid', effects: ['Synthetic suggestion preview'], issues: scenario === 'invalid' ? [{ severity: 'error', message: 'Select a valid channel' }] : [] } };
      } else {
        if (!['GET', 'HEAD'].includes(route.request().method())) writes++;
        if (path === '/api/me') value = { id: 'qa-user', guildId: 'sample', dbOk: true };
        else if (path === '/api/guilds') value = { guilds: [{ id: 'sample', name: 'Sample server', canManage: true }] };
        else if (path === '/api/config/features') value = { guildId: 'sample', features: [feature] };
        else if (path === `/api/config/features/${featureKey}`) value = {
          ...feature, guildId: 'sample', config, defaults: {}, revision: 1,
          schema: { sections: welcome ? [{ title: 'Welcome message', fields: [{ key: 'channel', label: 'Welcome channel', kind: 'channel' }, { key: 'message', label: 'Welcome message', kind: 'textarea' }, { key: 'guideEnabled', label: 'Orientation buttons', kind: 'toggle' }, { key: 'autoRole', label: 'Automatic role', kind: 'role' }, { key: 'sendDm', label: 'Send welcome DM', kind: 'toggle' }] }]
            : tickets ? [{ title: 'Support workflow', fields: [{ key: 'panelChannel', label: 'Ticket panel channel', kind: 'channel' }, { key: 'categoryId', label: 'Ticket category', kind: 'category' }, { key: 'staffRole', label: 'Staff role to notify', kind: 'role' }, { key: 'transcriptChannel', label: 'Transcript channel', kind: 'channel' }, { key: 'maxOpen', label: 'Open tickets per member', kind: 'number' }, { key: 'panelTitle', label: 'Panel title', kind: 'text' }, { key: 'panelDescription', label: 'Panel description', kind: 'textarea' }, { key: 'closeAfterHours', label: 'SLA reminder (hours)', kind: 'number' }] }]
            : giveaway ? [{ title: 'Giveaway defaults', fields: [{ key: 'defaultDurationHours', label: 'Default duration (hours)', kind: 'number' }, { key: 'defaultWinners', label: 'Default winners', kind: 'number' }, { key: 'requiredRole', label: 'Required role (optional)', kind: 'role' }] }]
            : [{ title: 'Suggestion intake', fields: [{ key: 'channel', label: 'Suggestion channel', kind: 'channel' }, { key: 'voteMode', label: 'Voting mode', kind: 'select', options: [['up_down', 'Support / against'], ['up_only', 'Support only']] }, { key: 'anonymous', label: 'Hide author in the public message', kind: 'toggle' }] }, { title: 'Moderation', fields: [{ key: 'cooldownHours', label: 'Cooldown per member (hours)', kind: 'number' }, { key: 'requiredRole', label: 'Required role (optional)', kind: 'role' }, { key: 'staffChannel', label: 'Staff notification channel (optional)', kind: 'channel' }] }] },
        };
        else if (path === '/api/guild-context') value = { guildId: 'sample', name: 'Sample server', permissions: '8', channels: [{ id: 'sample-suggestions', name: 'suggestions', type: 'text' }, { id: 'sample-support', name: 'support', type: 'text' }, { id: 'sample-welcome', name: 'welcome', type: 'text' }], roles: [], hierarchy: { known: true }, capabilities: { channelSelectors: true, roleSelectors: true, permissionPreflight: true } };
        else if (path === '/api/stats') value = { guildId: 'sample', totalCases: 0 };
        else if (path === '/api/cases') value = { cases: [] };
        else if (path === '/api/audit') value = { events: [] };
        else if (path === '/api/activity') value = { activity: [] };
        else if (path === '/api/quotas') value = { plan: 'Free', limits: {}, usage: {} };
        else { await route.fulfill({ status: 503, json: {} }); return; }
      }
      await route.fulfill({ json: value });
    });
    await page.goto(`${base}#/config/${featureKey}`);
    const simulate = page.getByRole('button', { name: pt ? 'Simular configuração' : 'Simulate configuration', exact: true });
    await simulate.click();
    const dialog = page.getByRole('dialog', { name: localizedLabel, exact: true });
    await dialog.waitFor();
    if (dismissScenario) {
      const box = await dialog.boundingBox();
      assert.ok(box);
      const outside = { x: Math.max(1, box.x - 8), y: box.y + 100 };
      const padding = { x: box.x + 10, y: box.y + 100 };
      if (scenario === 'dismiss-inside') {
        await dialog.getByRole('heading', { name: feature.label, exact: true }).click();
        assert.equal(await dialog.isVisible(), true, 'content click stays open');
        await page.keyboard.press('Escape');
      } else if (scenario === 'dismiss-padding') {
        await page.mouse.click(padding.x, padding.y);
        assert.equal(await dialog.isVisible(), true, 'dialog padding is not backdrop');
        await page.keyboard.press('Escape');
      } else if (scenario === 'dismiss-drag') {
        await page.mouse.move(padding.x, padding.y); await page.mouse.down();
        await page.mouse.move(outside.x, outside.y); await page.mouse.up();
        assert.equal(await dialog.isVisible(), true, 'dragging out of the form stays open');
        await page.mouse.move(outside.x, outside.y); await page.mouse.down();
        await page.mouse.move(padding.x, padding.y); await page.mouse.up();
        assert.equal(await dialog.isVisible(), true, 'dragging into the form stays open');
        await page.mouse.click(outside.x, outside.y);
      } else if (scenario === 'dismiss-touch') await page.touchscreen.tap(outside.x, outside.y);
      else if (scenario === 'dismiss-escape') await page.keyboard.press('Escape');
      else await page.mouse.click(outside.x, outside.y);
      await dialog.waitFor({ state: 'hidden', timeout: 2000 });
      assert.equal(await simulate.evaluate(element => element === document.activeElement), true, 'focus returns to the simulation trigger');
      await new Promise(resolve => setTimeout(resolve, 1600));
      assert.equal(await dialog.count(), 0, 'late validation response cannot reopen the modal');
      assert.equal(writes, 0, 'dismissal must not write configuration');
      assert.equal(new URL(page.url()).hash, `#/config/${featureKey}`, 'backdrop click must not activate underlying navigation');
      console.log(`PASS ${demoFeature}-demo-${scenario}`);
      await page.close(); continue;
    }
    assert.equal(await dialog.locator('video').count(), 0, 'no video player or native media controls');
    const animation = dialog.locator('img.feature-simulation__animation');
    assert.equal(await animation.count(), 1, `${feature.label} must include its own animation, independent of API validation`);
    assert.equal(await animation.getAttribute('src'), `/panel/helper-tracker/feature-demos/${demoFeature}-${pt ? 'pt' : 'en'}.gif`);
    assert.equal(await dialog.locator('.feature-simulation__steps p').count(), 3);
    if (scenario === 'disabled-feature') await dialog.getByText('This feature is disabled in the editor.', { exact: false }).waitFor();
    if (scenario === 'media-failure') {
      await dialog.getByRole('alert').filter({ hasText: 'animation could not load' }).waitFor();
      assert.equal(await dialog.locator('.feature-simulation__steps').isVisible(), true);
    } else {
      await page.waitForFunction(() => {
        const image = document.querySelector('.feature-simulation__animation');
        return image?.complete && image.naturalWidth > 0;
      });
      assert.equal(await animation.evaluate(element => element.currentSrc.endsWith('.png')), scenario === 'reduced-motion', 'reduced motion uses the static poster');
      if (scenario === 'en') {
        const before = await animation.screenshot();
        await new Promise(resolve => setTimeout(resolve, 2600));
        const after = await animation.screenshot();
        assert.ok(!before.equals(after), 'GIF advances automatically without pressing play');
      }
    }
    if (['api-failure', 'unauthenticated', 'timeout'].includes(scenario)) {
      await dialog.getByRole('alert').filter({ hasText: 'Could not validate' }).waitFor();
      assert.equal(await animation.isVisible(), true, 'API failure must not hide the example');
      assert.equal(await dialog.getByText('The API validated these settings.', { exact: false }).count(), 0);
      if (scenario !== 'timeout') {
        await dialog.getByRole('button', { name: 'Retry validation', exact: true }).click();
        await dialog.getByText('The API validated these settings.', { exact: false }).waitFor();
        assert.equal(simulations, 2);
      }
    } else if (scenario === 'invalid') await dialog.getByText('Select a valid channel', { exact: true }).waitFor();
    if (scenario === 'mobile' || scenario === 'en' || pt || scenario === 'api-failure') {
      await mkdir('output/playwright', { recursive: true });
      await dialog.screenshot({ path: `output/playwright/${demoFeature}-demo-${scenario}.png` });
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
    console.log(`PASS ${demoFeature}-demo-${scenario}`);
    await page.close();
  }
} finally { await browser.close(); }
