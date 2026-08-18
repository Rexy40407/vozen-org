import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [legacyEntry, redirectScript, ignore, helperI18n, publicShell] = await Promise.all([
  readFile(new URL('../site/panel/helper/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../site/js/helper-redirect-v1.js', import.meta.url), 'utf8'),
  readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
  readFile(new URL('../apps/helper-panel/src/i18n.ts', import.meta.url), 'utf8'),
  readFile(new URL('../site/js/main-v51.js', import.meta.url), 'utf8'),
]);

const expectedLocales = ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko'];
const helperLocales = [...helperI18n.matchAll(/\{ code: '([a-z]+)'/g)].map((match) => match[1]);
const publicLocaleBlock = publicShell.match(/const LANG_UI = \[([\s\S]*?)\n  \];/);
assert.ok(publicLocaleBlock, 'the public language selector must declare its locale contract');
const publicLocales = [...publicLocaleBlock[1].matchAll(/\["([a-z]+)",/g)].map((match) => match[1]);

assert.deepEqual(helperLocales, expectedLocales, 'Helper must expose only the site languages');
assert.deepEqual(publicLocales, expectedLocales, 'the public site and Helper must expose the same languages');
assert.match(helperI18n, /export const DEFAULT_LOCALE: SupportedLocale = 'en';/);
assert.match(helperI18n, /if \(value !== null\) window\.localStorage\.setItem\(LOCALE_KEY, DEFAULT_LOCALE\);/);
assert.match(publicShell, /const DEFAULT_LANG = "en";/);
assert.match(publicShell, /else if \(storedLanguage\) localStorage\.setItem\(LS_KEY, DEFAULT_LANG\);/);

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
