import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [legacyEntry, redirectScript, ignore] = await Promise.all([
  readFile(new URL('../site/panel/helper/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../site/js/helper-redirect-v1.js', import.meta.url), 'utf8'),
  readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
]);

assert.match(ignore, /site\/panel\/helper-tracker\//);
assert.doesNotMatch(ignore, /^site\/panel\/helper\/$/m);
assert.match(
  legacyEntry,
  /<script\s+src="\/js\/helper-redirect-v1\.js"><\/script>/,
  'the compatibility route must load its redirect through the CSP-allowed external script',
);
assert.doesNotMatch(legacyEntry, /<script>\s*const incomingHash/);
assert.match(
  redirectScript,
  /location\.replace\("\/panel\/helper-tracker\/"\s*\+\s*safeHash\)/,
  'the external redirect must preserve only the allow-listed product hash',
);
assert.match(legacyEntry, /http-equiv="refresh"/);
assert.doesNotMatch(legacyEntry, /href="\/panel\/helper-tracker\//);

console.log('Helper tracker compatibility route contract passed.');
