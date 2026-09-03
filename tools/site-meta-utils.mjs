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
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attributes = tagAttributes(tag);
    if (attributes[attribute]?.toLowerCase() === name.toLowerCase()) return attributes.content || '';
  }
  return '';
}

export function linkHref(html, rel) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const attributes = tagAttributes(tag);
    if (attributes.rel?.toLowerCase() === rel.toLowerCase()) return attributes.href || '';
  }
  return '';
}

function tagAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([^\s=<>]+)\s*=\s*(["'])([\s\S]*?)\2/g)) {
    attributes[match[1].toLowerCase()] = match[3];
  }
  return attributes;
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
