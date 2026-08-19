import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFile(path.join(root, relative), 'utf8');
const directTtsInvite = 'https://discord.com/oauth2/authorize?client_id=1523826014935842997';
const directHelperInvite = 'https://discord.com/oauth2/authorize?client_id=1526211106081734666';
const helperInstallStart = 'https://api.vozen.org/rust/api/install/start';

const [dashboard, helperRedirect, helperPanel, main, commands, ...publicPages] = await Promise.all([
  read('site/js/dashboard-v8.js'),
  read('site/js/helper-redirect-v1.js'),
  read('apps/helper-panel/src/App.tsx'),
  read('site/js/main-v51.js'),
  read('site/js/commands-v1.js'),
  ...[
    'site/tts.html',
    'site/tts/index.html',
    'site/helper.html',
    'site/helper/index.html',
    'site/commands/index.html',
  ].map(read),
]);

assert.match(main, /\?\s*"\/dashboard\.html\?add=1"/);
assert.match(commands, /href:\s*"\/dashboard\.html\?add=1"/);
assert.equal(helperPanel.includes(helperInstallStart), true);

assert.match(dashboard, /TTS_INSTALL_STATE_KEY/);
assert.match(dashboard, /u\.searchParams\.set\("response_type", "code"\)/);
assert.match(dashboard, /u\.searchParams\.set\("scope", "bot applications\.commands identify"\)/);
assert.match(dashboard, /consumeTtsInstallCallback/);
assert.match(dashboard, /ttsInstallRequested/);

assert.match(helperRedirect, /HELPER_INSTALL_URL/);
assert.match(helperRedirect, /window\.location\.replace\(HELPER_INSTALL_URL\)/);

for (const page of publicPages) {
  assert.equal(page.includes(directTtsInvite), false, 'public page still uses the direct TTS success-page invite');
  assert.equal(page.includes(directHelperInvite), false, 'public page still uses the direct Helper success-page invite');
}

assert.equal(publicPages[2].includes(helperInstallStart), true);
assert.equal(publicPages[3].includes(helperInstallStart), true);

console.log('Product install redirect contracts are present.');
