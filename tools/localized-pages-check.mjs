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
const catalog = (locale) => JSON.parse(
  fs.readFileSync(path.resolve('tools', 'i18n-marketing-src', `${locale}.json`), 'utf8'),
);

function structuredData(html, type) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]))
    .find((value) => value && value['@type'] === type);
}

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

    if (page === 'helper' && locale !== 'en') {
      const messages = catalog(locale).messages;
      for (const key of [
        'helper.landing.heroLede',
        'helper.landing.outcomesTitle',
        'helper.landing.moduleCoreTitle',
        'helper.landing.setupTitle',
        'helper.landing.accessText',
        'helper.landing.comparisonTitle',
      ]) {
        assert.ok(html.includes(messages[key]), `${relative} leaves ${key} in English`);
      }
      assert.ok(!html.includes('The work around your server, made lighter.'), `${relative} keeps the English Helper body`);
    }

    if (page === 'helper') {
      const translation = catalog(locale);
      assert.ok(Array.isArray(translation.helperFaq), `${locale} has no Helper FAQ catalogue`);
      assert.ok(translation.helperFaq.length >= 5, `${locale} needs at least five real Helper FAQs`);
      const faq = structuredData(html, 'FAQPage');
      assert.ok(faq, `${relative} is missing Helper FAQPage structured data`);
      assert.equal(faq.inLanguage, htmlLang, `${relative} has the wrong Helper FAQ language`);
      assert.equal(faq.mainEntity.length, translation.helperFaq.length, `${relative} Helper FAQ schema is stale`);
      assert.equal(faq.mainEntity[0].name, translation.helperFaq[0][0], `${relative} Helper FAQ question is not localized`);
      assert.ok(html.includes(translation.helperFaq[0][0]), `${relative} does not show its Helper FAQ`);
      assert.ok(html.includes(translation.helperFaq[0][1]), `${relative} does not show its Helper FAQ answer`);
    }

    if (page === 'tts' && !(locale === 'pt')) {
      const translation = catalog(locale);
      const faq = structuredData(html, 'FAQPage');
      assert.ok(faq, `${relative} is missing FAQPage structured data`);
      assert.equal(faq.inLanguage, htmlLang, `${relative} has the wrong FAQ language`);
      assert.equal(faq.mainEntity.length, translation.faq.length, `${relative} FAQ schema is stale`);
      assert.equal(faq.mainEntity[0].name, translation.faq[0][0], `${relative} FAQ question is not localized`);
      assert.equal(
        faq.mainEntity[0].acceptedAnswer.text,
        translation.faq[0][1],
        `${relative} FAQ answer is not localized`,
      );
    }
  }
}

console.log('Localized page check passed: home, TTS and Helper expose 10 indexable locale routes');
