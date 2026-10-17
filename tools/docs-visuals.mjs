import * as parse5 from 'parse5';
import { sceneContent, scenePresentation, sceneStyles } from './docs-scene-layouts.mjs';
export const SCENE_SIZE = { desktop: { width: 960, height: 680 }, mobile: { width: 420, height: 1000 } };

export const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join(' ');
const attrs = node => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
const walk = (node, fn) => { fn(node); for (const child of node.childNodes || []) walk(child, fn); };

export function mediaMarkup(board) {
  const base = `/docs/media/${board.id}`;
  const alt = `Illustrated example: ${board.title}. ${board.steps.join('. ')}.`;
  const sizes = board.sizes || SCENE_SIZE;
  const tabId = `docs-example-${board.id}`;
  const walkthrough = board.video ? `<div id="${tabId}-video" data-docs-video-panel><details class="docs-visual-guide__walkthrough"><summary>Watch walkthrough <span>9 seconds · silent</span></summary><video controls playsinline preload="none" poster="${base}.webp" aria-label="Illustrated walkthrough: ${escapeHtml(board.title)}"><source media="(max-width: 600px)" src="${base}-mobile.mp4" type="video/mp4"><source src="${base}.mp4" type="video/mp4"><p>This browser cannot play the video. The image and the three steps describe the same example.</p></video><p>Visual transcript: ${board.steps.map(escapeHtml).join(' → ')}.</p></details></div>` : '';
  const picture = `<picture><source media="(max-width: 600px)" srcset="${base}-mobile.webp" width="${sizes.mobile.width}" height="${sizes.mobile.height}"><img src="${base}.webp" width="${sizes.desktop.width}" height="${sizes.desktop.height}" loading="lazy" decoding="async" alt="${escapeHtml(alt)}"></picture>`;
  return `<figure class="docs-visual-guide" id="visual-example" data-docs-visual-guide="${board.id}" data-docs-presentation="${scenePresentation(board)}" style="--docs-media-aspect:${sizes.desktop.width}/${sizes.desktop.height};--docs-mobile-media-aspect:${sizes.mobile.width}/${sizes.mobile.height}">
    <div class="docs-example-toolbar"><span>Illustrated example${board.blocked ? ' · Unavailable' : ''}</span>${board.video ? `<div class="docs-example-tabs" role="tablist" aria-label="Example format" data-docs-media-tabs hidden><button type="button" role="tab" id="${tabId}-image-tab" aria-controls="${tabId}-image" aria-selected="true">Image</button><button type="button" role="tab" id="${tabId}-video-tab" aria-controls="${tabId}-video" aria-selected="false" tabindex="-1">Walkthrough</button></div>` : ''}</div>
    <div class="docs-visual-guide__media" id="${tabId}-image" data-docs-image-panel>${picture}</div>
    ${walkthrough}
    <figcaption class="docs-visual-guide__provenance"><span>Fictional sample data, not a live Discord capture.${board.blocked ? ' Concept only; no working activation.' : ''}</span><a href="${base}.webp" target="_blank" rel="noopener">Open full-size image</a></figcaption>
    <ol class="docs-visual-guide__steps">${board.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    ${board.related?.length ? `<nav class="docs-visual-guide__related" aria-label="Continue this example">${board.related.map(route => `<a href="/docs/${route}">${escapeHtml(route.split('/').filter(Boolean).at(-1).replaceAll('-', ' '))} <span aria-hidden="true">→</span></a>`).join('')}</nav>` : ''}
  </figure>`;
}

export function enhanceDocument(source, board) {
  const document = parse5.parse(source);
  let main;
  walk(document, node => { if (node.tagName === 'main') main = node; });
  if (!main) throw new Error(`Missing article for ${board.route}`);
  const remove = [];
  walk(main, node => { if (attrs(node)['data-docs-visual-guide'] != null) remove.push(node); });
  for (const node of remove) node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1);
  // Keep all original copy, links and notices. The visual follows the introduction
  // and availability banner, before detailed sections or the pager.
  let insertion = main.childNodes.length;
  const heading = main.childNodes.findIndex(node => {
    let containsHeading = false;
    walk(node, child => { if (child.tagName === 'h1') containsHeading = true; });
    return containsHeading;
  });
  for (let i = Math.max(0, heading + 1); i < main.childNodes.length; i++) {
    const node = main.childNodes[i];
    if (!node.tagName || ['p', 'h1'].includes(node.tagName)) continue;
    const cls = attrs(node).class || '';
    if (/status-row|notice|docs-callout/.test(cls)) continue;
    insertion = i; break;
  }
  const firstSetup = main.childNodes.findIndex(node => node.tagName === 'section' && /\bcard\b/.test(attrs(node).class || ''));
  if (firstSetup >= 0) insertion = firstSetup + 1;
  if (board.route === 'helper/guides/welcome/') {
    const optionalDm = main.childNodes.findIndex(node => attrs(node).id === 'optional-direct-message');
    if (optionalDm >= 0) insertion = optionalDm;
  }
  const fragment = parse5.parseFragment(mediaMarkup(board));
  for (const node of fragment.childNodes) node.parentNode = main;
  main.childNodes.splice(insertion, 0, ...fragment.childNodes);
  let body, shell, hasReading = false, hasFallback = false;
  walk(document, node => {
    if (node.tagName === 'body') body = node;
    if (node.tagName === 'script' && (attrs(node).src || '').includes('docs-shell.js')) shell = node;
    if (node.tagName === 'script' && (attrs(node).src || '').includes('docs-reading.js')) hasReading = true;
    if (node.tagName === 'noscript' && attrs(node)['data-docs-reading-fallback'] != null) hasFallback = true;
  });
  if (!hasReading) {
    const reading = parse5.parseFragment('<script src="/docs/shared/docs-reading.js"></script>').childNodes[0];
    const parent = shell?.parentNode || body;
    reading.parentNode = parent;
    parent.childNodes.splice(shell ? parent.childNodes.indexOf(shell) : parent.childNodes.length, 0, reading);
  }
  if (!hasFallback) {
    const fallback = parse5.parseFragment('<noscript data-docs-reading-fallback><style>.docs-example-tabs,.docs-copy-command{display:none!important}[data-docs-image-panel],[data-docs-video-panel]{display:block!important}.docs-main pre:has(.docs-copy-command){padding-top:20px!important}.docs-media-tabs-ready .docs-visual-guide__walkthrough>summary{display:list-item!important}</style></noscript>').childNodes[0];
    fallback.parentNode = body;
    body.childNodes.push(fallback);
  }
  return parse5.serialize(document).replace(/[ \t]+$/gm, '');
}

export function readPage(source) {
  const document = parse5.parse(source);
  let main, heading;
  walk(document, node => { if (node.tagName === 'main') main = node; });
  if (main) walk(main, node => { if (!heading && node.tagName === 'h1') heading = node; });
  return { document, main, title: heading ? text(heading).trim() : '', redirect: /http-equiv=["']refresh/i.test(source) };
}

export function outputMarkup(board) {
  return sceneContent(board);
}

export function renderScene(board, origin, mobile = false) {
  const { width } = mobile ? SCENE_SIZE.mobile : SCENE_SIZE.desktop;
  const presentation = scenePresentation(board);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(board.title)}</title><style>${sceneStyles.replaceAll('ORIGIN', origin)}html,body{width:${width}px}</style></head><body data-phase="2"><div class="scene" data-presentation="${presentation}"><main class="scene-content">${outputMarkup(board)}</main><footer class="scene-caption"><span>ILLUSTRATED EXAMPLE${board.blocked ? ' · UNAVAILABLE · no activation' : ' · fictional data'}</span><span>Not a live Discord capture</span></footer></div></body></html>`;
}
