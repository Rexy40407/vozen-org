import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');
const requiredFiles = [
  'site/account/index.html',
  'site/panel/helper-tracker/index.html',
];

for (const relativePath of requiredFiles) {
  await access(resolve(root, relativePath), constants.R_OK);
}

const panel = await readFile(resolve(root, 'site/panel/helper-tracker/index.html'), 'utf8');
assert.match(panel, /<script[^>]+type="module"[^>]+src="\/panel\/helper-tracker\//);
assert.doesNotMatch(panel, /sourceMappingURL|\.map(?:["']|$)/i);

const panelScriptPath = panel.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
assert.ok(panelScriptPath, 'Helper panel must expose its module bundle');
const panelScript = await readFile(resolve(root, 'site', panelScriptPath.replace(/^\/+/, '')), 'utf8');
assert.match(panelScript, /rank-card-banners\/banner-01-aurora-lake\.webp/);
assert.match(panelScript, /loading:["'`]lazy["'`]/);

const bannerDirectory = resolve(root, 'site/panel/helper-tracker/rank-card-banners');
const bannerFiles = await readdir(bannerDirectory);
assert.equal(bannerFiles.filter((name) => name.endsWith('.webp')).length, 10);
assert.equal(bannerFiles.filter((name) => name.endsWith('.png')).length, 10);
for (const name of bannerFiles.filter((entry) => /\.(?:png|webp)$/i.test(entry))) {
  assert.ok((await stat(resolve(bannerDirectory, name))).size <= 200 * 1024, `${name} exceeds 200 KB`);
}

console.log('Release artifact contains the account route and an optimized Helper panel.');
