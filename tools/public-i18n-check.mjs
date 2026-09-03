import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve('.');
const locales = ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko'];
const privatePrefixes = ['account.', 'billing.', 'dashboard.', 'panel.', 'claim.'];

const loaderPath = path.join(root, 'site', 'js', 'i18n-public-loader-v1.js');
assert.ok(fs.existsSync(loaderPath), 'public locale loader is missing');

for (const locale of locales) {
  const sourcePath = path.join(root, 'tools', 'i18n-marketing-src', `${locale}.json`);
  const bundlePath = path.join(root, 'site', 'js', 'i18n-public', `${locale}.js`);
  assert.ok(fs.existsSync(sourcePath), `structured ${locale} source is missing`);
  assert.ok(fs.existsSync(bundlePath), `public ${locale} bundle is missing`);

  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  assert.equal(source.locale, locale, `${locale} source declares the wrong locale`);
  assert.ok(Object.keys(source.messages).length >= 100, `${locale} source is unexpectedly small`);
  for (const key of Object.keys(source.messages)) {
    assert.ok(
      !privatePrefixes.some((prefix) => key.startsWith(prefix)),
      `${locale} public source leaks private key ${key}`,
    );
  }

  const context = {
    window: { VOZEN_I18N: {}, dispatchEvent() {} },
    CustomEvent: class CustomEvent {},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(bundlePath, 'utf8'), context, { filename: bundlePath });
  assert.deepEqual(Object.keys(context.window.VOZEN_I18N), [locale]);
  assert.equal(context.window.VOZEN_I18N[locale]['ecosystem.tts'], source.messages['ecosystem.tts']);
  assert.ok(context.window.VOZEN_COMMANDS, `${locale} bundle does not provide command copy`);
  assert.ok(context.window.VOZEN_FAQ, `${locale} bundle does not provide FAQ copy`);
}

for (const relative of [
  'site/index.html',
  'site/tts/index.html',
  'site/helper/index.html',
  'site/commands/index.html',
  'site/privacy.html',
  'site/terms.html',
  'site/status.html',
  'site/404.html',
  'site/tts.html',
  'site/helper.html',
]) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  assert.match(html, /i18n-public-loader-v1\.js/, `${relative} does not use the public locale loader`);
  assert.doesNotMatch(html, /i18n-v4[12]\.js/, `${relative} still loads the full workspace catalogue`);
  assert.doesNotMatch(html, /i18n-marketing-v1\.js/, `${relative} still loads the all-language overlay`);
}

console.log('Public i18n check passed: 10 isolated locale bundles and no private workspace copy');
