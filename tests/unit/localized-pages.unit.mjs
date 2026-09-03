import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildLocalizedPages,
  faqEntities,
  localize,
  translationMap,
} from '../../tools/build-localized-pages.mjs';

const readCatalogue = (locale) => JSON.parse(
  fs.readFileSync(path.resolve('tools', 'i18n-marketing-src', `${locale}.json`), 'utf8'),
);

const helperPage = {
  route: 'helper',
  slug: 'helper/',
  source: 'helper/index.html',
  title: 'helper.landing.documentTitle',
  description: 'helper.landing.heroLede',
};

test('translation map includes visible copy and FAQ pairs', () => {
  const catalogue = readCatalogue('pt');
  const translations = translationMap(catalogue);

  assert.equal(translations.get('The work around your server, made lighter.'), 'O trabalho à volta do teu servidor, mais leve.');
  assert.equal(translations.get('Is Vozen Helper available now?'), 'O Vozen Helper já está disponível?');
  assert.equal(translations.has('Vozen'), false);
});

test('FAQ entities produce valid Question and Answer objects', () => {
  const entries = [['Question?', 'Answer.']];

  assert.deepEqual(faqEntities(entries), [{
    '@type': 'Question',
    name: 'Question?',
    acceptedAnswer: { '@type': 'Answer', text: 'Answer.' },
  }]);
});

test('Helper localization is static, indexable, complete, and aligned with its schema', () => {
  const source = fs.readFileSync(path.resolve('site', 'helper', 'index.html'), 'utf8');
  const catalogue = readCatalogue('pt');
  const html = localize(source, { code: 'pt', html: 'pt-PT' }, helperPage, catalogue);

  assert.match(html, /<html[^>]+lang="pt-PT"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/vozen\.org\/pt\/helper\/">/);
  assert.match(html, /Uma ajuda mais inteligente/);
  assert.match(html, /O trabalho à volta do teu servidor, mais leve\./);
  assert.match(html, /O Vozen Helper já está disponível\?/);
  assert.doesNotMatch(html, /The work around your server, made lighter\./);

  const structured = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]));
  const application = structured.find((entry) => entry['@type'] === 'SoftwareApplication');
  const faq = structured.find((entry) => entry['@type'] === 'FAQPage');
  assert.equal(application.url, 'https://vozen.org/pt/helper/');
  assert.equal(application.inLanguage, 'pt-PT');
  assert.equal(application.description, catalogue.messages['helper.landing.heroLede']);
  assert.equal(faq.inLanguage, 'pt-PT');
  assert.equal(faq.mainEntity.length, catalogue.helperFaq.length);
  assert.equal(faq.mainEntity[0].name, catalogue.helperFaq[0][0]);
});

test('Arabic localization sets the document direction', () => {
  const source = fs.readFileSync(path.resolve('site', 'helper', 'index.html'), 'utf8');
  const html = localize(source, { code: 'ar', html: 'ar' }, helperPage, readCatalogue('ar'));

  assert.match(html, /<html[^>]+dir="rtl"/);
  assert.match(html, /هل Vozen Helper متاح الآن؟/);
});

test('the checked build covers every generated locale route', () => {
  assert.deepEqual(buildLocalizedPages({ onlyCheck: true }), {
    localeCount: 10,
    pageCount: 3,
    generatedCount: 26,
  });
});
