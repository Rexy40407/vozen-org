import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';

const siteRoot = path.resolve('site');
const siteOrigin = 'https://vozen.org';
const htmlFiles = [];
const missing = new Set();

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (entry.name.endsWith('.html')) htmlFiles.push(filename);
  }
}

function attrs(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
  if (node.content) visit(node.content, callback);
}

function documentUrl(filename) {
  const relative = path.relative(siteRoot, filename).replaceAll('\\', '/');
  if (relative === 'index.html') return new URL('/', siteOrigin);
  if (relative.endsWith('/index.html')) {
    return new URL(`/${relative.slice(0, -'index.html'.length)}`, siteOrigin);
  }
  return new URL(`/${relative}`, siteOrigin);
}

function candidateFiles(url) {
  if (url.pathname === '/panel/helper-tracker/' && fs.existsSync(path.resolve('apps/helper-panel/index.html'))) {
    return [path.resolve('apps/helper-panel/index.html')];
  }
  const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const exact = path.resolve(siteRoot, pathname);
  if (!exact.startsWith(`${siteRoot}${path.sep}`) && exact !== siteRoot) return [];
  if (url.pathname.endsWith('/')) return [path.join(exact, 'index.html')];
  if (path.extname(pathname)) return [exact];
  return [exact, `${exact}.html`, path.join(exact, 'index.html')];
}

function checkReference(reference, page, baseUrl, kind) {
  if (!reference || /^(?:data:|mailto:|tel:|javascript:|#)/i.test(reference)) return;
  let url;
  try {
    url = new URL(reference, baseUrl);
  } catch {
    missing.add(`${path.relative(siteRoot, page)}: invalid ${kind} ${reference}`);
    return;
  }
  if (url.origin !== siteOrigin) return;
  if (!candidateFiles(url).some((filename) => fs.existsSync(filename) && fs.statSync(filename).isFile())) {
    missing.add(`${path.relative(siteRoot, page)}: missing ${kind} ${reference} -> ${url.pathname}`);
  }
}

function srcsetReferences(value) {
  return value.split(',').map((candidate) => candidate.trim().split(/\s+/, 1)[0]).filter(Boolean);
}

walk(siteRoot);

for (const page of htmlFiles) {
  const document = parse(fs.readFileSync(page, 'utf8'));
  let baseUrl = documentUrl(page);
  visit(document, (node) => {
    if (node.tagName !== 'base') return;
    const href = attrs(node).href;
    if (href) baseUrl = new URL(href, baseUrl);
  });

  visit(document, (node) => {
    if (!node.tagName) return;
    const attributes = attrs(node);
    const references = [];
    if (node.tagName === 'a' && attributes.href) references.push(['link', attributes.href]);
    if (node.tagName === 'link' && attributes.href) references.push(['resource', attributes.href]);
    if (['script', 'img', 'audio', 'video', 'source', 'iframe', 'embed', 'input'].includes(node.tagName) && attributes.src) {
      references.push(['resource', attributes.src]);
    }
    if (node.tagName === 'object' && attributes.data) references.push(['resource', attributes.data]);
    if (node.tagName === 'video' && attributes.poster) references.push(['resource', attributes.poster]);
    if (attributes.srcset) {
      for (const reference of srcsetReferences(attributes.srcset)) references.push(['resource', reference]);
    }
    if (node.tagName === 'meta' && /^(?:og:image|twitter:image)$/i.test(attributes.property ?? attributes.name ?? '')) {
      references.push(['resource', attributes.content]);
    }
    for (const [kind, reference] of references) checkReference(reference, page, baseUrl, kind);
  });
}

if (missing.size) throw new Error(`Broken internal references:\n${[...missing].join('\n')}`);
console.log(`Checked links and resources in ${htmlFiles.length} pages`);
