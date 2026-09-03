import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const siteRoot = path.resolve('site');
const maxInitialJavaScript = 150 * 1024;
const maxPublicRaster = 200 * 1024;
const entryPages = [
  path.join(siteRoot, 'index.html'),
  path.join(siteRoot, 'tts', 'index.html'),
  path.join(siteRoot, 'helper', 'index.html'),
];
const failures = [];

function pageUrl(page, html) {
  const relative = path.relative(siteRoot, page).replaceAll('\\', '/');
  const pathname = relative.endsWith('/index.html')
    ? `/${relative.slice(0, -'index.html'.length)}`
    : relative === 'index.html'
      ? '/'
      : `/${relative}`;
  const documentUrl = new URL(pathname, 'https://vozen.org');
  const baseHref = html.match(/<base\b[^>]*\bhref=["']([^"']+)["']/i)?.[1];
  return baseHref ? new URL(baseHref, documentUrl) : documentUrl;
}

function localAssetPath(reference, baseUrl) {
  if (!reference || /^(?:data:|mailto:|tel:|javascript:|#)/i.test(reference)) return null;
  try {
    const url = new URL(reference, baseUrl);
    if (url.origin !== 'https://vozen.org') return null;
    const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    return path.join(siteRoot, pathname);
  } catch {
    return null;
  }
}

for (const page of entryPages) {
  const html = fs.readFileSync(page, 'utf8');
  const baseUrl = pageUrl(page, html);
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/gi)]
    .map((match) => localAssetPath(match[1], baseUrl))
    .filter(Boolean);
  // The loader requests exactly one locale bundle at runtime.
  scripts.push(path.join(siteRoot, 'js', 'i18n-public', 'en.js'));
  const unique = [...new Set(scripts)];
  let total = 0;
  for (const filename of unique) {
    if (!fs.existsSync(filename)) {
      failures.push(`${path.relative(siteRoot, page)} references missing script ${path.relative(siteRoot, filename)}`);
      continue;
    }
    total += zlib.gzipSync(fs.readFileSync(filename), { level: 9 }).length;
  }
  if (total > maxInitialJavaScript) {
    failures.push(`${path.relative(siteRoot, page)} initial first-party JavaScript is ${total} bytes gzip (limit ${maxInitialJavaScript})`);
  }
  console.log(`[asset-budget] ${path.relative(siteRoot, page)} initial JS ${total} bytes gzip`);
}

const htmlFiles = [];
function collectHtml(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(filename);
    else if (entry.name.endsWith('.html')) htmlFiles.push(filename);
  }
}
collectHtml(siteRoot);

const publicRasters = new Set();
for (const page of htmlFiles) {
  const relative = path.relative(siteRoot, page).replaceAll('\\', '/');
  if (/^(?:account|dashboard|panel)(?:\/|\.html)/.test(relative)) continue;
  const html = fs.readFileSync(page, 'utf8');
  const baseUrl = pageUrl(page, html);
  for (const match of html.matchAll(/(?:\bsrc|\bcontent)=["']([^"']+\.(?:avif|webp|png|jpe?g)(?:[?#][^"']*)?)/gi)) {
    const filename = localAssetPath(match[1], baseUrl);
    if (filename) publicRasters.add(filename);
  }
}

function collectRasterAssets(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) collectRasterAssets(filename);
    else if (/\.(?:avif|webp|png|jpe?g)$/i.test(entry.name)) publicRasters.add(filename);
  }
}

// Keep every shipped source image inside the budget, including images loaded dynamically by
// the authenticated Helper panel and assets that may be referenced by an external product page.
collectRasterAssets(path.join(siteRoot, 'assets'));
collectRasterAssets(path.resolve('apps', 'helper-panel', 'public'));

for (const filename of publicRasters) {
  if (!fs.existsSync(filename)) {
    failures.push(`public image is missing: ${path.relative(siteRoot, filename)}`);
    continue;
  }
  const bytes = fs.statSync(filename).size;
  if (bytes > maxPublicRaster) {
    failures.push(`${path.relative(siteRoot, filename)} is ${bytes} bytes (limit ${maxPublicRaster})`);
  }
}
console.log(`[asset-budget] ${publicRasters.size} shipped raster images are within ${maxPublicRaster} bytes`);

if (failures.length) throw new Error(`asset budgets failed:\n${failures.join('\n')}`);
