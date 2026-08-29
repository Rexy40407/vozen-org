import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFile(path.join(root, relative), 'utf8');
const marker = 'data-vozen-public-analytics="true"';
const configScript = 'analytics-config.js?v=cf-web-analytics-v1';
const loaderScript = 'web-analytics-v1.js?v=cf-web-analytics-v1';
const publicPropertyId = '81b57bca105c44d8bc2a07e74b1d7801';

const directPublicPages = [
  'site/index.html',
  'site/tts.html',
  'site/tts/index.html',
  'site/helper/index.html',
  'site/commands/index.html',
  'site/premium.html',
  'site/privacy.html',
  'site/terms.html',
  'site/guides/discord-without-a-mic/index.html',
  'site/guides/vozen-vs-generic-discord-tts/index.html',
  'site/guides/helper-moderation-tickets-roles/index.html',
  'site/pt/tts/index.html',
];

for (const relative of directPublicPages) {
  const page = await read(relative);
  assert.equal(page.includes(marker), true, `${relative} must opt into public analytics`);
  assert.equal(page.includes(configScript), true, `${relative} must load the beacon config`);
  assert.equal(page.includes(loaderScript), true, `${relative} must load the beacon`);
}

for (const relative of [
  'site/dashboard.html',
  'site/account/index.html',
  'site/404.html',
  'site/status.html',
]) {
  const page = await read(relative);
  assert.equal(page.includes(marker), false, `${relative} must stay outside analytics`);
  assert.equal(page.includes(configScript), false, `${relative} must not load analytics config`);
  assert.equal(page.includes(loaderScript), false, `${relative} must not load analytics`);
}

const config = await read('site/js/analytics-config.js');
const loader = await read('site/js/web-analytics-v1.js');
const docsShell = await read('site/docs/shared/docs-shell.js');
assert.match(config, /cloudflareBeaconToken:\s*"[a-zA-Z0-9-]{20,80}"/);
assert.equal(config.includes(publicPropertyId), false, 'the GraphQL property ID must stay server-side');
assert.match(loader, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
assert.match(loader, /page\.dataset\.vozenPublicAnalytics !== "true"/);
assert.match(docsShell, /function installPublicAnalytics\(\)/);
assert.match(docsShell, /installPublicAnalytics\(\);/);

console.log('Cloudflare Web Analytics scope and beacon contract are valid.');
