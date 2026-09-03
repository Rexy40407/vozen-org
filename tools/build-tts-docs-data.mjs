import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';

const checkOnly = process.argv.includes('--check');
const ttsRoot = path.resolve('site/docs/tts');
const manifestJsonPath = path.join(ttsRoot, 'data', 'tts-docs-manifest.json');
const manifestJsPath = path.join(ttsRoot, 'data', 'tts-docs-manifest.js');
const searchJsonPath = path.join(ttsRoot, 'search.json');
const searchJsPath = path.join(ttsRoot, 'search-data.js');

function attrs(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes ?? []) {
    const match = find(child, predicate);
    if (match) return match;
  }
  if (node.content) return find(node.content, predicate);
  return null;
}

function text(node) {
  if (!node || ['script', 'style', 'noscript'].includes(node.tagName)) return '';
  if (node.nodeName === '#text') return node.value ?? '';
  return (node.childNodes ?? []).map(text).join(' ');
}

function compact(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function searchable(value) {
  return compact(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function output(pathname, value) {
  if (checkOnly) {
    if (!fs.existsSync(pathname) || fs.readFileSync(pathname, 'utf8') !== value) {
      throw new Error(`${path.relative(process.cwd(), pathname)} is stale; run npm run docs:build`);
    }
    return;
  }
  fs.writeFileSync(pathname, value, 'utf8');
}

const manifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
for (const section of manifest.sections ?? []) {
  for (const link of section.links ?? []) {
    const filename = path.resolve(ttsRoot, link.route);
    if (!filename.startsWith(`${ttsRoot}${path.sep}`) || !fs.existsSync(filename)) {
      throw new Error(`TTS docs manifest references missing route: ${link.route}`);
    }
  }
}

const search = JSON.parse(fs.readFileSync(searchJsonPath, 'utf8'));
const documents = (search.documents ?? []).map((entry) => {
  const filename = path.resolve(ttsRoot, entry.url);
  if (!filename.startsWith(`${ttsRoot}${path.sep}`) || !fs.existsSync(filename)) {
    throw new Error(`TTS docs search references missing route: ${entry.url}`);
  }
  const document = parse(fs.readFileSync(filename, 'utf8'));
  const main = find(document, (node) => node.tagName === 'main');
  const heading = find(main, (node) => node.tagName === 'h1');
  const lede = find(main, (node) => node.tagName === 'p' && (attrs(node).class ?? '').split(/\s+/).includes('lede'));
  const title = compact(text(heading)) || entry.title;
  const section = attrs(main)['data-docs-section'] || entry.section;
  const body = compact(text(main));
  const excerpt = compact(text(lede)) || entry.excerpt || body.slice(0, 190);
  return {
    ...entry,
    title,
    section,
    excerpt,
    text: body,
    searchText: searchable(`${title} - Vozen TTS ${title} ${section} ${body}`),
  };
});
const nextSearch = { ...search, documents };
const searchJson = `${JSON.stringify(nextSearch, null, 2)}\n`;
const searchJs = `globalThis.VOZEN_DOCS_SEARCH=globalThis.VOZEN_DOCS_SEARCH||{};globalThis.VOZEN_DOCS_SEARCH.tts=${JSON.stringify(nextSearch)};\n`;
const manifestJs = `globalThis.VOZEN_DOCS_NAV=globalThis.VOZEN_DOCS_NAV||{};globalThis.VOZEN_DOCS_NAV.tts=${JSON.stringify(manifest)};\n`;

output(searchJsonPath, searchJson);
output(searchJsPath, searchJs);
output(manifestJsPath, manifestJs);
console.log(`${checkOnly ? 'Checked' : 'Built'} TTS navigation and ${documents.length} search records`);
