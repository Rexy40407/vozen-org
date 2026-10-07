import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
const names = git(['diff', '--name-only']).trim().split('\n').filter(name => name.endsWith('.html'));
const normalize = text => text.replace(/\r\n/g, '\n').replace(/v=[0-9a-f]{12}/g, 'v=HASH');
for (const name of names) {
  assert.equal(normalize(fs.readFileSync(name, 'utf8')), normalize(git(['show', 'HEAD:' + name])), `Only asset cache hashes may change in ${name}`);
}
console.log(`Verified ${names.length} generated HTML files: asset cache hashes only.`);
