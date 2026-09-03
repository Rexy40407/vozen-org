import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  absoluteCanonical,
  isIndexable,
  linkHref,
  metaContent,
  titleContent,
  walkHtml,
} from './site-meta-utils.mjs';

const root = path.resolve('site');
const errors = [];
const titles = new Map();
const publicUrls = new Set();
const maxPublicImageBytes = 200 * 1024;
const expectedOgImages = new Map([
  ['helper/index.html', 'https://vozen.org/assets/helper-og-v1.jpg'],
]);
const requiredAlternates = new Map([
  ['index.html', ['en', 'x-default']],
  ['tts/index.html', ['en', 'pt-PT', 'x-default']],
  ['helper/index.html', ['en', 'x-default']],
]);

for (const file of walkHtml(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const html = fs.readFileSync(file, 'utf8');
  if (!isIndexable(relative, html)) continue;
  const title = titleContent(html);
  const description = metaContent(html, 'description');
  const canonical = linkHref(html, 'canonical');
  const ogImage = metaContent(html, 'og:image', 'property');
  const icon = /<link\b[^>]*rel=["'](?:icon|shortcut icon)["']/i.test(html);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (!title) errors.push(`${relative}: missing title`);
  if (!description || description.length < 30) errors.push(`${relative}: missing or short meta description`);
  if (!canonical || !canonical.startsWith('https://vozen.org/')) errors.push(`${relative}: missing canonical`);
  const expectedOgImage = relative === 'helper/index.html' || /^[a-z]{2}\/helper\/index\.html$/.test(relative)
    ? 'https://vozen.org/assets/helper-og-v1.jpg'
    : expectedOgImages.get(relative) || 'https://vozen.org/assets/og-image.png';
  if (ogImage !== expectedOgImage) errors.push(`${relative}: missing expected og:image`);
  const alternateLanguages = new Set(
    [...html.matchAll(/<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => match[1]),
  );
  for (const language of requiredAlternates.get(relative) || []) {
    if (!alternateLanguages.has(language)) errors.push(`${relative}: missing hreflang ${language}`);
  }
  if (!icon) errors.push(`${relative}: missing favicon`);
  if (!/<html\b[^>]*lang=["'][a-z]{2,3}(?:-[a-z0-9]{2,8})?["']/i.test(html)) errors.push(`${relative}: missing valid lang`);
  if (h1Count !== 1) errors.push(`${relative}: expected one h1, found ${h1Count}`);
  if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(html)) errors.push(`${relative}: image without alt attribute`);
  for (const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const raw = match[1].split(/[?#]/, 1)[0];
    if (!raw || /^(?:https?:|data:|\/\/)/i.test(raw)) continue;
    const asset = raw.startsWith('/')
      ? path.join(root, raw.slice(1))
      : path.resolve(path.dirname(file), raw);
    if (!asset.startsWith(root + path.sep) || !fs.existsSync(asset)) continue;
    if (fs.statSync(asset).size > maxPublicImageBytes) {
      errors.push(`${relative}: public image ${path.relative(root, asset)} exceeds 200 KB`);
    }
  }
  if (title) {
    if (titles.has(title)) errors.push(`duplicate title "${title}" in ${relative} and ${titles.get(title)}`);
    else titles.set(title, relative);
  }
  if (canonical) publicUrls.add(canonical);
}

if (!fs.existsSync(path.join(root, 'robots.txt'))) errors.push('site/robots.txt is missing');
if (!fs.existsSync(path.join(root, 'llms.txt'))) errors.push('site/llms.txt is missing');
const sitemapPath = path.join(root, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) errors.push('site/sitemap.xml is missing');
else {
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  for (const url of sitemapUrls) {
    if (!publicUrls.has(url)) errors.push(`sitemap contains non-public or unknown URL: ${url}`);
  }
  for (const url of publicUrls) {
    if (!sitemapUrls.includes(url)) errors.push(`sitemap misses public URL: ${url}`);
  }
}

const sourceMaps = [];
function walkAll(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkAll(file);
    else if (entry.name.endsWith('.map')) sourceMaps.push(file);
  }
}
walkAll(root);
if (sourceMaps.length) errors.push(`public source maps found: ${sourceMaps.map(file => path.relative(root, file)).join(', ')}`);

const ttsInitialScripts = [
  'js/analytics-config.js',
  'js/web-analytics-v1.js',
  'js/install-config-v1.js',
  'js/tts-install-v1.js',
  'js/oauth-config.js',
  'js/global-nav-v1.js',
  'js/i18n-public-loader-v1.js',
  'js/i18n-public/en.js',
  'js/main-v51.js',
  'js/motion-v1.js',
];
const ttsInitialBytes = ttsInitialScripts.reduce((total, relative) => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) {
    errors.push(`TTS initial script is missing: ${relative}`);
    return total;
  }
  return total + gzipSync(fs.readFileSync(file), { level: 9 }).length;
}, 0);
if (ttsInitialBytes > 150 * 1024) {
  errors.push(`TTS initial JavaScript is ${Math.ceil(ttsInitialBytes / 1024)} KB gzip; budget is 150 KB`);
}

if (errors.length) throw new Error(`Site metadata check failed:\n${errors.join('\n')}`);
console.log(`Site metadata check passed for ${publicUrls.size} public pages`);
