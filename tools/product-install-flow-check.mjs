import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const directTtsInvite = 'https://discord.com/oauth2/authorize?client_id=1523826014935842997';
const directHelperInvite = 'https://discord.com/oauth2/authorize?client_id=1526211106081734666';
const helperInstallStart = 'https://api.vozen.org/rust/api/install/start';
const ttsInstallStart = 'https://api.vozen.org/api/install/tts/start';

const [dashboard, dashboardInstallRedirect, installResultPage, installResultScript, helperRedirect, helperPanel, main, commands, installConfig, ttsInstall, ...publicPages] = await Promise.all([
  read('site/js/dashboard-v8.js'),
  read('site/js/dashboard-install-redirect-v1.js'),
  read('site/dashboard/index.html'),
  read('site/js/install-result-v1.js'),
  read('site/js/helper-redirect-v1.js'),
  read('apps/helper-panel/src/App.tsx'),
  read('site/js/main-v51.js'),
  read('site/js/commands-v1.js'),
  read('site/js/install-config-v1.js'),
  read('site/js/tts-install-v1.js'),
  ...[
    'site/tts.html',
    'site/tts/index.html',
    'site/helper.html',
    'site/helper/index.html',
    'site/commands/index.html',
  ].map(read),
]);

assert.match(main, /FALLBACK_INVITE_URL/);
assert.match(main, /vozenTtsInstallHref/);
assert.match(commands, /vozenTtsInstallHref\("commands"\)/);
assert.match(commands, /"\/dashboard\.html\?add=1"/);
assert.match(installConfig, /ttsStartEndpoint:\s*"https:\/\/api\.vozen\.org\/api\/install\/tts\/start"/);
assert.match(installConfig, /signed state/);
assert.match(ttsInstall, /api\\\.vozen\\\.org\\\/api\\\/install\\\/tts\\\/start/);
assert.match(ttsInstall, /"home", "tts-hero", "tts-pricing", "commands", "topgg"/);
assert.match(ttsInstall, /removeAttribute\("target"\)/);
assert.equal(helperPanel.includes(helperInstallStart), true);

assert.match(dashboard, /TTS_INSTALL_START/);
assert.match(dashboard, /window\.location\.assign\(ttsInstallUrl\("home"\)\)/);
assert.equal(dashboard.includes('https://discord.com/oauth2/authorize'), false);
assert.equal(dashboard.includes('TTS_INSTALL_STATE_KEY'), false);
assert.match(dashboardInstallRedirect, /query\.get\("add"\) === "1"/);
assert.match(dashboardInstallRedirect, /window\.location\.replace\(TTS_INSTALL_START\)/);
assert.equal(dashboardInstallRedirect.includes('https://discord.com/oauth2/authorize'), false);
let dashboardRedirect = null;
vm.runInNewContext(dashboardInstallRedirect, {
  URLSearchParams,
  window: {
    location: {
      search: '?add=1',
      replace(value) { dashboardRedirect = value; },
    },
  },
});
assert.equal(dashboardRedirect, `${ttsInstallStart}?source=home`);

assert.match(installResultPage, /name="robots" content="noindex,nofollow"/);
assert.match(installResultPage, /data-install-outcome="installed"/);
assert.match(installResultPage, /Choose your server/);
assert.match(installResultPage, /Run <code>\/setup<\/code>/);
assert.match(installResultPage, /Test Vozen TTS/);
assert.equal(installResultPage.includes('static.cloudflareinsights.com'), false);
assert.match(installResultScript, /new Set\(\["installed", "cancelled", "oauth_failed", "guild_missing"\]\)/);
assert.match(installResultScript, /window\.location\.replace\("\/dashboard\.html"\)/);
assert.equal(installResultScript.includes('innerHTML'), false);
assert.equal(installResultScript.includes('textContent = outcome'), false);
assert.equal(installResultScript.includes(ttsInstallStart), false);
let invalidOutcomeRedirect = null;
vm.runInNewContext(installResultScript, {
  Set,
  URLSearchParams,
  window: {
    location: {
      search: '?installed=0&install=unexpected',
      replace(value) { invalidOutcomeRedirect = value; },
    },
  },
});
assert.equal(invalidOutcomeRedirect, '/dashboard.html');

assert.match(helperRedirect, /HELPER_INSTALL_URL/);
assert.match(helperRedirect, /window\.location\.replace\(HELPER_INSTALL_URL\)/);

for (const page of publicPages) {
  assert.equal(page.includes(directTtsInvite), false, 'public page still uses the direct TTS success-page invite');
  assert.equal(page.includes(directHelperInvite), false, 'public page still uses the direct Helper success-page invite');
}

assert.equal(publicPages[2].includes(helperInstallStart), true);
assert.equal(publicPages[3].includes(helperInstallStart), true);

assert.match(publicPages[0], /data-tts-install-source="tts-hero"/);
assert.match(publicPages[0], /data-tts-install-source="tts-pricing"/);
assert.match(publicPages[1], /tts-install-v1/);
assert.match(publicPages[4], /data-tts-install-source="commands"/);
assert.match(publicPages[4], /tts-install-v1/);

console.log('Product install redirect contracts are present.');
