import fs from 'node:fs';
import path from 'node:path';

export function walkHtml(root) {
  const files = [];
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.html')) files.push(file);
    }
  }
  walk(root);
  return files.sort();
}

export function metaContent(html, name, attribute = 'name') {
  const expression = new RegExp(`<meta\\b[^>]*${attribute}=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const reverseExpression = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*${attribute}=["']${name}["'][^>]*>`, 'i');
  return html.match(expression)?.[1] || html.match(reverseExpression)?.[1] || '';
}

export function linkHref(html, rel) {
  const expression = new RegExp(`<link\\b[^>]*rel=["']${rel}["'][^>]*href=["']([^"']+)["'][^>]*>`, 'i');
  const reverseExpression = new RegExp(`<link\\b[^>]*href=["']([^"']+)["'][^>]*rel=["']${rel}["'][^>]*>`, 'i');
  return html.match(expression)?.[1] || html.match(reverseExpression)?.[1] || '';
}

export function titleContent(html) {
  return html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
}

export function isNoindex(html) {
  return /<meta\b[^>]*(?:name=["']robots["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["'])/i.test(html);
}

export function isIndexable(relativePath, html) {
  const normalized = relativePath.replaceAll('\\', '/');
  if (isNoindex(html)) return false;
  if (normalized.startsWith('concepts/')) return false;
  if (normalized.startsWith('panel/')) return false;
  if (normalized.startsWith('account/')) return false;
  if (['404.html', 'account.html', 'dashboard.html', 'helper.html', 'tts.html'].includes(normalized)) return false;
  return true;
}

export function canonicalPathFromFile(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`;
  if (normalized.endsWith('.html')) return `/${normalized.slice(0, -'.html'.length)}`;
  return `/${normalized}`;
}

export function absoluteCanonical(relativePath, html) {
  const existing = linkHref(html, 'canonical');
  if (existing.startsWith('https://vozen.org/')) return existing;
  return `https://vozen.org${canonicalPathFromFile(relativePath)}`.replace(/([^:]\/)\/{2,}/g, '$1');
}

export function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function relativeSiteAsset(relativePath, asset = 'favicon.svg') {
  const directory = path.posix.dirname(relativePath.replaceAll('\\', '/'));
  const relative = path.posix.relative(directory === '.' ? '' : directory, asset);
  return relative || path.posix.basename(asset);
}
