import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const checkOnly = process.argv.includes('--check');
const siteRoot = path.resolve('site');
const htmlFiles = [];
const stale = [];

function collectHtml(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(absolute);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(absolute);
  }
}

function versionFor(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
}

function documentBase(html, relativeFile) {
  const baseHref = html.match(/<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  const pageUrl = new URL(`/${relativeFile.replaceAll(path.sep, '/')}`, 'https://vozen.local');
  return baseHref ? new URL(baseHref, pageUrl) : pageUrl;
}

function replaceAssetUrls(html, relativeFile) {
  const base = documentBase(html, relativeFile);
  return html.replace(/(<(?:link|script)\b[^>]*?\b(?:href|src)\s*=\s*["'])([^"']+)(["'])/gi, (whole, prefix, rawUrl, suffix) => {
    if (/^(?:https?:)?\/\//i.test(rawUrl) || /^(?:data|mailto|tel|#):/i.test(rawUrl)) return whole;

    let resolved;
    try {
      resolved = new URL(rawUrl, base);
    } catch {
      return whole;
    }
    if (!/\.(?:css|js)$/i.test(resolved.pathname)) return whole;

    const localFile = path.join(siteRoot, decodeURIComponent(resolved.pathname).replace(/^\//, ''));
    if (!fs.existsSync(localFile) || !fs.statSync(localFile).isFile()) return whole;

    // parse5 serializes `&` as `&amp;` in localized HTML. Decode that one
    // HTML-attribute encoding before reading query parameters, otherwise a
    // later pass sees `amp;foo` as a separate parameter and corrupts URLs.
    const decodedUrl = rawUrl.replaceAll('&amp;', '&');
    // Keep relative URLs relative so the source stays readable and existing <base>
    // contracts continue to work. Only the cache version is changed.
    const pathOnly = decodedUrl.split(/[?#]/, 1)[0];
    const sourceQuery = new URL(decodedUrl, base).searchParams;
    sourceQuery.delete('v');
    sourceQuery.append('v', versionFor(localFile));
    const relativeQuery = rawUrl.includes('&amp;')
      ? sourceQuery.toString().replaceAll('&', '&amp;')
      : sourceQuery.toString();
    const rawHash = rawUrl.includes('#') ? `#${rawUrl.split('#').slice(1).join('#')}` : '';
    const next = `${pathOnly}?${relativeQuery}${rawHash}`;
    return `${prefix}${next}${suffix}`;
  });
}

collectHtml(siteRoot);
for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(siteRoot, file);
  const expected = replaceAssetUrls(source, relative);
  if (source === expected) continue;
  if (checkOnly) stale.push(relative);
  else fs.writeFileSync(file, expected);
}

if (stale.length) {
  throw new Error(`public asset URLs are stale; run npm run version:assets\n${stale.join('\n')}`);
}
console.log(`[${checkOnly ? 'check' : 'version'}-public-assets] ${htmlFiles.length} HTML files are cache-safe`);
