import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [legacyEntry, ignore] = await Promise.all([
  readFile(new URL('../site/panel/helper/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
]);

assert.match(ignore, /site\/panel\/helper-tracker\//);
assert.doesNotMatch(ignore, /^site\/panel\/helper\/$/m);
assert.match(legacyEntry, /location\.replace\('\/panel\/helper-tracker\/'\)/);
assert.match(legacyEntry, /http-equiv="refresh"/);
assert.doesNotMatch(legacyEntry, /href="\/panel\/helper-tracker\//);

console.log('Helper tracker compatibility route contract passed.');
