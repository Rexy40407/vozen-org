import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
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

console.log('Release artifact contains the account route and Helper panel.');
