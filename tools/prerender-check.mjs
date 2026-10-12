import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { isIndexable, walkHtml, titleContent, metaContent, linkHref } from './site-meta-utils.mjs';

function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes || []) visit(child, callback);
}
const attrs = (node) => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
let count = 0;
for (const file of walkHtml('site')) {
  const relative = path.relative('site', file).replaceAll('\\', '/');
  const html = fs.readFileSync(file, 'utf8');
  for (const [name, value] of [['title', titleContent(html)], ['description', metaContent(html, 'description')], ['canonical', linkHref(html, 'canonical')]]) {
    assert.ok(value, `${relative}: missing ${name} in raw HTML`);
  }
  if (!isIndexable(relative, html)) continue;
  assert.match(html, /data-vozen-prerendered="true"/, `${relative}: public page was not prerendered`);
  const document = parse(html);
  visit(document, (node) => {
    const attributes = attrs(node);
    if (attributes['data-vozen-nav'] != null) {
      let links = 0;
      visit(node, (child) => { if (child.tagName === 'a' && attrs(child).href) links++; });
      assert.ok(links >= 4, `${relative}: shared navigation is empty before JavaScript`);
    }
    if (['faq-list', 'cmdList', 'commandGroups', 'marqueeTrack', 'wordle', 'chat'].includes(attributes.id)) {
      assert.ok(node.childNodes?.some((child) => child.tagName), `${relative}: ${attributes.id} is empty before JavaScript`);
    }
    if (node.tagName === 'a') assert.doesNotMatch(attributes.href || '', /^javascript:/i, `${relative}: navigation requires JavaScript`);
    for (const reference of [attributes.href, attributes.src]) {
      assert.doesNotMatch(reference || '', /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/)/i, `${relative}: preview-server URL leaked into published HTML`);
    }
  });
  count++;
}
const commands = fs.readFileSync('site/commands/index.html', 'utf8');
assert.ok(commands.includes('/setup') && commands.includes('/ticket-panel'), 'Raw command catalogue must include both TTS and Helper');
const robots = fs.readFileSync('site/robots.txt', 'utf8');
assert.match(robots, /Sitemap: https:\/\/vozen.org\/sitemap.xml/);
console.log(`Raw HTML, metadata and navigation verified for ${count} public pages.`);
