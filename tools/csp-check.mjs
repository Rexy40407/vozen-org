import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';

const siteRoot = path.resolve('site');
const entryPages = [
  path.join(siteRoot, 'index.html'),
  path.join(siteRoot, 'tts', 'index.html'),
  path.join(siteRoot, 'helper', 'index.html'),
];
const failures = [];

function attrs(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
  if (node.content) visit(node.content, callback);
}

for (const page of entryPages) {
  const relative = path.relative(siteRoot, page).replaceAll('\\', '/');
  const html = fs.readFileSync(page, 'utf8');
  const document = parse(html);
  visit(document, (node) => {
    if (node.tagName !== 'script') return;
    const attributes = attrs(node);
    const type = (attributes.type ?? '').toLowerCase();
    const executable = !type || type === 'module' || /(?:java|ecma)script/.test(type);
    if (executable && !attributes.src) failures.push(`${relative} contains an inline executable script`);
  });
}

for (const filename of fs.readdirSync(path.join(siteRoot, 'css')).filter((name) => /-critical-v\d+\.css$/.test(name))) {
  const css = fs.readFileSync(path.join(siteRoot, 'css', filename), 'utf8');
  if (/url\(["']?data:font/i.test(css)) failures.push(`css/${filename} embeds a font blocked by production CSP`);
}

if (failures.length) throw new Error(`production CSP compatibility failed:\n${failures.join('\n')}`);
console.log('Public entry pages and critical CSS are compatible with the production CSP.');
