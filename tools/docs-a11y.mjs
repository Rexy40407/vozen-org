import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { walkHtml } from './site-meta-utils.mjs';

const files = walkHtml(path.resolve('site/docs/helper'));
const errors = [];
const attrs = (node) => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes || []) visit(child, callback);
}
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  if (!/<html[^>]+lang="en"/i.test(html)) errors.push(`${file}: missing lang`);
  if (!html.includes('class="skip-link"')) errors.push(`${file}: missing skip link`);
  if (!/<main\b/i.test(html)) errors.push(`${file}: missing main`);
  if (!/<h1\b/i.test(html)) errors.push(`${file}: missing h1`);
  const document = parse(html);
  const labels = new Set();
  visit(document, (node) => {
    if (node.tagName === 'label' && attrs(node).for) labels.add(attrs(node).for);
  });
  visit(document, (node) => {
    if (node.tagName !== 'input' || attrs(node).type === 'hidden') return;
    const attributes = attrs(node);
    let parent = node.parentNode;
    while (parent && parent.tagName !== 'label') parent = parent.parentNode;
    if (!attributes['aria-label'] && !attributes['aria-labelledby'] && !labels.has(attributes.id) && !parent) {
      errors.push(`${file}: unlabeled input ${attributes.id || ''}`);
    }
  });
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Accessibility smoke check passed for ${files.length} pages`);
