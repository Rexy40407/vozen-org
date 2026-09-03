import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('site');
const locales = [
  ['en', 'en'],
  ['pt', 'pt-PT'],
  ['fr', 'fr'],
  ['es', 'es'],
  ['de', 'de'],
  ['tr', 'tr'],
  ['ar', 'ar'],
  ['zh', 'zh-Hant'],
  ['ru', 'ru'],
  ['ko', 'ko'],
];
const pages = [
  ['home', ''],
  ['tts', 'tts/'],
  ['helper', 'helper/'],
];
const hrefLanguages = [...locales.map(([, hreflang]) => hreflang), 'x-default'];
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');

for (const [locale, htmlLang] of locales) {
  for (const [page, slug] of pages) {
    const relative = locale === 'en' ? `${slug}index.html` : `${locale}/${slug}index.html`;
    const filename = path.join(root, ...relative.split('/'));
    assert.ok(fs.existsSync(filename), `${relative} is missing`);
    const html = fs.readFileSync(filename, 'utf8');
    const canonical = `https://vozen.org/${locale === 'en' ? '' : `${locale}/`}${slug}`;
    assert.match(html, new RegExp(`<html\\b[^>]*\\blang=["']${htmlLang}["']`, 'i'), `${relative} has the wrong lang`);
    assert.match(html, new RegExp(`data-vozen-localized-route=["']${page}["']`), `${relative} has no route locale contract`);
    assert.ok(html.includes(`rel="canonical" href="${canonical}"`), `${relative} has the wrong canonical`);
    assert.doesNotMatch(html, /name=["']robots["'][^>]*noindex/i, `${relative} is not indexable`);
    for (const hreflang of hrefLanguages) {
      assert.match(html, new RegExp(`hreflang=["']${hreflang}["']`, 'i'), `${relative} misses ${hreflang}`);
    }
    if (!(locale === 'pt' && page === 'tts')) {
      assert.match(html, /i18n-public-loader-v1\.js/, `${relative} does not load its isolated locale`);
    }
    if (locale === 'ar') assert.match(html, /<html\b[^>]*\bdir=["']rtl["']/i, `${relative} is not RTL`);
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), `${relative} is missing from sitemap.xml`);
  }
}

console.log('Localized page check passed: home, TTS and Helper expose 10 indexable locale routes');
