import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('homepage tab titles omit the em dash in all supported locales', () => {
  for (const locale of ['en', 'pt', 'fr', 'es', 'de', 'tr', 'ar', 'zh', 'ru', 'ko']) {
    const catalogue = JSON.parse(fs.readFileSync(`tools/i18n-marketing-src/${locale}.json`, 'utf8'));
    const title = catalogue.messages['home.documentTitle'];
    assert.ok(title.startsWith('Vozen '), locale);
    assert.ok(!title.includes('—'), locale);
    if (locale === 'en') assert.equal(title, 'Vozen Tools for Discord');
  }
  const html = fs.readFileSync('site/index.html', 'utf8');
  assert.match(html, /<title data-i18n="home.documentTitle">Vozen Tools for Discord<\/title>/);
});
