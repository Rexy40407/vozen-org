import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function fixture(nodes, visual = null) {
  const window = {};
  const document = { getElementById: id => nodes.find(node => node.id === id) };
  vm.runInNewContext(readFileSync('site/docs/shared/docs-reading.js', 'utf8'), { window, document, URL });
  return window.VozenDocsReading.sectionsFor({ querySelector: () => visual, querySelectorAll: () => nodes });
}
const heading = (tagName, textContent, id = '', inDetails = false, linked = false) => ({ tagName, textContent, id, closest: selector => (selector === 'details' && inDetails) || (selector === 'a' && linked) ? {} : null, querySelector: () => null });

test('page sections preserve IDs, follow article order, and point at disclosure summaries', () => {
  const first = heading('H2', 'Public greeting', 'public-greeting');
  const visual = heading('FIGURE', 'Sample values');
  const hidden = heading('H2', 'Hidden technical detail', '', true);
  const summary = heading('SUMMARY', 'Requirements and permissions', '', true);
  const sections = fixture([first, visual, hidden, summary], visual);
  assert.deepEqual(Array.from(sections, item => [item.id, item.label]), [
    ['public-greeting', 'Public greeting'], ['visual-example', 'Example'], ['requirements-and-permissions', 'Requirements and permissions'],
  ]);
});

test('section IDs are stable, normalized and unique for repeated headings', () => {
  const sections = fixture([heading('H2', 'Configuração'), heading('H2', 'Configuração'), heading('H2', '???'), heading('H2', '')]);
  assert.deepEqual(Array.from(sections, item => item.id), ['configuracao', 'configuracao-2', 'section']);
});

test('an empty page has no invented section navigation', () => {
  assert.equal(fixture([]).length, 0);
});

test('linked directory headings are not article sections or permalink targets', () => {
  const sections = fixture([heading('H2', 'Product card', '', false, true), heading('H2', 'Article section')]);
  assert.deepEqual(Array.from(sections, item => item.label), ['Article section']);
});

test('persisted heading permalinks do not remove article sections on reload', () => {
  const enhanced = heading('H2', 'Article section', 'article-section');
  enhanced.querySelector = selector => selector === 'a:not(.docs-heading-link)' ? null : {};
  const genuineLink = heading('H2', 'Linked destination');
  genuineLink.querySelector = () => ({});
  const sections = fixture([enhanced, genuineLink]);
  assert.deepEqual(Array.from(sections, item => item.id), ['article-section']);
});
