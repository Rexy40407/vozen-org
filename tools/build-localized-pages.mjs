/* Generate indexable locale routes for the three public product entry pages.
 * English remains the authored HTML source. Portuguese TTS keeps its reviewed,
 * purpose-built page; the other routes use the shared product templates and
 * the isolated locale catalogues.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as parse5 from 'parse5';

const root = path.resolve('site');
const checkOnly = process.argv.includes('--check');
const locales = [
  { code: 'en', html: 'en' },
  { code: 'pt', html: 'pt-PT' },
  { code: 'fr', html: 'fr' },
  { code: 'es', html: 'es' },
  { code: 'de', html: 'de' },
  { code: 'tr', html: 'tr' },
  { code: 'ar', html: 'ar' },
  { code: 'zh', html: 'zh-Hant' },
  { code: 'ru', html: 'ru' },
  { code: 'ko', html: 'ko' },
];
const pages = [
  { route: 'home', slug: '', source: 'index.html', title: 'home.documentTitle', description: 'home.heroLead' },
  { route: 'tts', slug: 'tts/', source: 'tts/index.html', title: 'tts.documentTitle', description: 'hero.sub' },
  { route: 'helper', slug: 'helper/', source: 'helper/index.html', title: 'helper.landing.documentTitle', description: 'helper.landing.heroLede' },
];
const normalized = (value) => value.replace(/\r\n?/g, '\n');

function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes || []) visit(child, callback);
  if (node.content) visit(node.content, callback);
}

const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
function setAttr(node, name, value) {
  node.attrs ||= [];
  const current = node.attrs.find((item) => item.name === name);
  if (current) current.value = value;
  else node.attrs.push({ name, value });
}
const isElement = (node, name) => node.tagName === name;
const elements = (document, predicate) => {
  const matches = [];
  visit(document, (node) => { if (node.tagName && predicate(node)) matches.push(node); });
  return matches;
};
const first = (document, predicate) => elements(document, predicate)[0];
const setText = (node, value) => {
  if (!node) return;
  node.childNodes = [{ nodeName: '#text', value, parentNode: node }];
};
const canonicalFor = (locale, page) =>
  `https://vozen.org/${locale.code === 'en' ? '' : `${locale.code}/`}${page.slug}`;

function alternateMarkup(page) {
  const links = locales.map((locale) =>
    `<link rel="alternate" hreflang="${locale.html}" href="${canonicalFor(locale, page)}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${canonicalFor(locales[0], page)}">`);
  return links.join('');
}

function replaceStructuredUrls(value, from, to) {
  if (Array.isArray(value)) return value.map((item) => replaceStructuredUrls(item, from, to));
  if (!value || typeof value !== 'object') return value === from ? to : value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceStructuredUrls(item, from, to)]),
  );
}

function localize(sourceHtml, locale, page, messages) {
  const document = parse5.parse(sourceHtml);
  const html = first(document, (node) => isElement(node, 'html'));
  const head = first(document, (node) => isElement(node, 'head'));
  setAttr(html, 'lang', locale.html);
  setAttr(html, 'data-vozen-locale', locale.code);
  setAttr(html, 'data-vozen-localized-route', page.route);
  if (locale.code === 'ar') setAttr(html, 'dir', 'rtl');

  let base = first(head, (node) => isElement(node, 'base'));
  if (!base) {
    base = parse5.parseFragment('<base href="../">').childNodes[0];
    base.parentNode = head;
    head.childNodes.unshift(base);
  }
  setAttr(base, 'href', page.route === 'home' ? '../' : '../../');

  const canonical = canonicalFor(locale, page);
  const englishCanonical = canonicalFor(locales[0], page);
  const canonicalLink = first(head, (node) => isElement(node, 'link') && attr(node, 'rel') === 'canonical');
  setAttr(canonicalLink, 'href', canonical);
  head.childNodes = head.childNodes.filter((node) =>
    !(isElement(node, 'link') && attr(node, 'rel') === 'alternate' && attr(node, 'hreflang')));
  const alternates = parse5.parseFragment(alternateMarkup(page)).childNodes;
  for (const node of alternates) node.parentNode = head;
  const canonicalIndex = head.childNodes.indexOf(canonicalLink);
  head.childNodes.splice(canonicalIndex + 1, 0, ...alternates);

  const title = messages[page.title] || messages['home.documentTitle'] || 'Vozen';
  const descriptionBase = messages[page.description] || '';
  const description = descriptionBase.length >= 30
    ? descriptionBase
    : `${descriptionBase} Vozen TTS · Vozen Helper · Discord.`;
  setText(first(head, (node) => isElement(node, 'title')), title);
  for (const meta of elements(head, (node) => isElement(node, 'meta'))) {
    const name = attr(meta, 'name');
    const property = attr(meta, 'property');
    if (name === 'description' || property === 'og:description' || name === 'twitter:description') {
      setAttr(meta, 'content', description);
    } else if (property === 'og:url') setAttr(meta, 'content', canonical);
    else if (property === 'og:title' || name === 'twitter:title') setAttr(meta, 'content', title);
  }

  for (const script of elements(head, (node) => isElement(node, 'script') && attr(node, 'type') === 'application/ld+json')) {
    try {
      const data = replaceStructuredUrls(
        JSON.parse(script.childNodes?.[0]?.value || ''),
        englishCanonical,
        canonical,
      );
      if (data && typeof data === 'object' && !Array.isArray(data)) data.inLanguage = locale.html;
      setText(script, JSON.stringify(data));
    } catch {}
  }

  visit(document, (node) => {
    if (!node.tagName) return;
    const key = attr(node, 'data-i18n');
    if (key && messages[key] != null) setText(node, messages[key]);
    for (const [marker, target] of [
      ['data-i18n-aria-label', 'aria-label'],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-title', 'title'],
    ]) {
      const attributeKey = attr(node, marker);
      if (attributeKey && messages[attributeKey] != null) setAttr(node, target, messages[attributeKey]);
    }
    if (attr(node, 'data-vozen-nav') != null) setAttr(node, 'data-nav-locale-root', `${locale.code}/`);
    if (isElement(node, 'a')) {
      const href = attr(node, 'href');
      if (href?.startsWith('#')) setAttr(node, 'href', `${canonical}${href}`);
      else if (href === 'tts/' || href === 'helper/') setAttr(node, 'href', `${locale.code}/${href}`);
      else if (href === './') setAttr(node, 'href', canonical);
    }
  });

  return parse5.serialize(document).replace(/[ \t]+$/gm, '');
}

const desiredFiles = [];
for (const locale of locales.slice(1)) {
  const source = JSON.parse(fs.readFileSync(path.resolve('tools', 'i18n-marketing-src', `${locale.code}.json`), 'utf8'));
  for (const page of pages) {
    if (locale.code === 'pt' && page.route === 'tts') continue;
    const sourceHtml = fs.readFileSync(path.join(root, ...page.source.split('/')), 'utf8');
    const output = path.join(root, locale.code, ...page.slug.split('/').filter(Boolean), 'index.html');
    desiredFiles.push([output, localize(sourceHtml, locale, page, source.messages)]);
  }
}

let sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const locale of locales) {
  for (const page of pages) {
    const canonical = canonicalFor(locale, page);
    if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
      sitemap = sitemap.replace(/\s*<\/urlset>\s*$/, `\n  <url><loc>${canonical}</loc></url>\n</urlset>\n`);
    }
  }
}

const mismatches = [];
for (const [output, generated] of desiredFiles) {
  let current = '';
  try { current = fs.readFileSync(output, 'utf8'); } catch {}
  if (normalized(current) !== normalized(generated)) {
    if (checkOnly) mismatches.push(path.relative(root, output));
    else {
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, generated);
    }
  }
}
const sitemapPath = path.join(root, 'sitemap.xml');
if (normalized(fs.readFileSync(sitemapPath, 'utf8')) !== normalized(sitemap)) {
  if (checkOnly) mismatches.push('sitemap.xml');
  else fs.writeFileSync(sitemapPath, sitemap);
}

if (mismatches.length) {
  throw new Error(`localized pages are out of date; run npm run build:localized\n${mismatches.join('\n')}`);
}
console.log(`[${checkOnly ? 'check' : 'build'}-localized-pages] 10 locales × 3 public entry routes are current`);
