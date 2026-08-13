import fs from 'node:fs';
import path from 'node:path';
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
  if (ogImage !== 'https://vozen.org/assets/og-image.png') errors.push(`${relative}: missing canonical og:image`);
  if (!icon) errors.push(`${relative}: missing favicon`);
  if (!/<html\b[^>]*lang=["']en["']/i.test(html)) errors.push(`${relative}: missing lang=en`);
  if (h1Count !== 1) errors.push(`${relative}: expected one h1, found ${h1Count}`);
  if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(html)) errors.push(`${relative}: image without alt attribute`);
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

if (errors.length) throw new Error(`Site metadata check failed:\n${errors.join('\n')}`);
console.log(`Site metadata check passed for ${publicUrls.size} public pages`);
