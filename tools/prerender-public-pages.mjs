import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import * as parse5 from 'parse5';
import { createSiteServer, closeSiteServer } from './serve-site.mjs';
import { isIndexable, walkHtml } from './site-meta-utils.mjs';

// Only public, deterministic content is rendered. There are no credentials,
// API responses, visitor sessions or network services in this build.
const root = path.resolve('site');
const selectors = ['#faq-list', '#cmdList', '#commandGroups', '#commandFilters', '#commandResults', '#catalogueTitle', '#catalogueNote', '#marqueeTrack', '#wordle', '#chat'];
const noScript = `<noscript data-prerender-fallback><style>
.reveal{opacity:1!important;transform:none!important}.qa__a{max-height:none!important}
.helper-module-panel[hidden]{display:block!important}.nav__links{display:flex!important;flex-wrap:wrap}
.nav__inner{flex-wrap:wrap}.nav__burger,.lang,.docs-ecosystem-nav__language{display:none!important}
.vozen-global-nav{position:static!important;height:auto!important}
.vozen-global-nav .nav__inner{height:auto!important;padding-block:14px;row-gap:14px}
.vozen-global-nav .nav__links{order:3;flex:1 1 100%;justify-content:flex-start;gap:16px}
.docs-topbar{position:static!important}
.page-account main,.page-account .foot{visibility:visible!important}
@media(max-width:980px){.docs-sidebar{position:static!important;transform:none!important;visibility:visible!important}.docs-main{margin-left:0!important}.docs-drawer-toggle,.docs-sidebar-scrim{display:none!important}}
</style><p>Interactive search, audio, account information and live service checks require JavaScript. All public documentation and command descriptions are available below.</p></noscript>`;

const attrs = (node) => Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]));
function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes || []) visit(child, callback);
  if (node.content) visit(node.content, callback);
}
function find(node, predicate) {
  let match;
  visit(node, (candidate) => { if (!match && predicate(candidate)) match = candidate; });
  return match;
}
function setAttr(node, name, value) {
  node.attrs ||= [];
  const existing = node.attrs.find((item) => item.name === name);
  if (existing) existing.value = value;
  else node.attrs.push({ name, value });
}
function replace(node, replacement) {
  const parent = node.parentNode;
  replacement.parentNode = parent;
  parent.childNodes.splice(parent.childNodes.indexOf(node), 1, replacement);
}
function fill(node, html) {
  node.childNodes = parse5.parseFragment(html).childNodes;
  for (const child of node.childNodes) child.parentNode = node;
}

const { server, origin } = await createSiteServer();
let browser;
let rendered = 0;
try {
  browser = await chromium.launch();
  const files = walkHtml(root).filter((file) => {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    return isIndexable(relative, fs.readFileSync(file, 'utf8')) || relative === 'account/index.html' || relative === '404.html';
  });
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const source = fs.readFileSync(file, 'utf8');
    const document = parse5.parse(source);
    const host = find(document, (node) => attrs(node)['data-vozen-nav'] != null);
    const hostAttributes = host ? attrs(host) : { 'data-vozen-nav': '', 'data-nav-root': '/', 'data-nav-product': 'Ecosystem', 'data-nav-current': 'docs', 'data-nav-surface': 'docs' };
    const locale = attrs(find(document, (node) => node.tagName === 'html'))['data-vozen-locale'] || 'en';
    const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.addInitScript((language) => { localStorage.setItem('vozen.lang', language); }, locale);
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (route.request().isNavigationRequest()) {
        const response = await route.fetch();
        // Render the current shared header again during the build, even when
        // the input is an artifact from a previous build.
        return route.fulfill({ response, body: (await response.text()).replaceAll('data-nav-prerendered="true"', '') });
      }
      return route.continue();
    });
    const page = await context.newPage();
    try {
      const pathname = relative.endsWith('index.html') ? relative.slice(0, -10) : relative;
      const response = await page.goto(`${origin}/${pathname}`, { waitUntil: 'load' });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
      await page.evaluate(() => window.vozenPublicI18nReady || Promise.resolve());
      if (source.includes('docs-shell.js')) {
        await page.waitForFunction(() => document.body.dataset.vozenDocsShell === 'ready' && document.querySelector('.docs-sidebar__tree a'));
      }
      if (source.includes('id="faq-list"')) await page.waitForFunction(() => document.querySelector('#faq-list .qa'));
      if (source.includes('id="commandGroups"')) await page.waitForFunction(() => document.querySelector('#commandGroups .command-row'));
      let allCommands;
      if (source.includes('id="commandGroups"')) {
        const tts = await page.locator('#commandGroups').innerHTML();
        await page.locator('[data-command-product="helper"]').click();
        const helper = await page.locator('#commandGroups').innerHTML();
        allCommands = `<section id="catalogue-tts" aria-label="Vozen TTS commands">${tts}</section><section id="catalogue-helper" aria-label="Vozen Helper commands"><h2>Vozen Helper commands</h2>${helper}</section>`;
        await page.locator('[data-command-product="tts"]').click();
      }
      let marketingCommands;
      if (source.includes('id="cmdList"')) {
        const groups = [];
        for (const button of await page.locator('#cmdTabs button').all()) {
          await button.click();
          groups.push(`<section aria-label="${await button.innerText()}">${await page.locator('#cmdList').innerHTML()}</section>`);
        }
        marketingCommands = groups.join('');
      }
      const snapshot = await page.evaluate((ids) => ({
        header: document.querySelector('.vozen-global-nav, .docs-ecosystem-nav')?.outerHTML,
        docs: document.body.dataset.vozenDocsShell === 'ready' ? document.body.innerHTML : null,
        bodyClass: document.body.className,
        styles: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href),
        fragments: ids.map((selector) => [selector, document.querySelector(selector)?.innerHTML]),
      }), selectors);
      if (snapshot.docs) {
        const body = find(document, (node) => node.tagName === 'body');
        fill(body, snapshot.docs.replaceAll(origin + '/', '/'));
        setAttr(body, 'class', snapshot.bodyClass);
        setAttr(body, 'data-vozen-docs-shell', 'ready');
      }
      if (snapshot.header) {
        const header = parse5.parseFragment(snapshot.header.replaceAll(origin + '/', '/')).childNodes[0];
        for (const [name, value] of Object.entries(hostAttributes)) {
          if (name.startsWith('data-nav') || name === 'data-vozen-nav') setAttr(header, name, value);
        }
        setAttr(header, 'data-nav-prerendered', 'true');
        setAttr(header, 'data-prerender-fragment', 'navigation');
        const target = snapshot.docs
          ? find(document, (node) => (attrs(node).class || '').includes('docs-ecosystem-nav'))
          : host;
        if (target) replace(target, header);
        // Remove obsolete fallback headers so JavaScript-free visits also
        // receive exactly one primary navigation.
        const legacy = find(document, (node) => node.tagName === 'header' && /(^|\s)nav(\s|$)/.test(attrs(node).class || '') && !/vozen-global-nav/.test(attrs(node).class || ''));
        if (legacy) legacy.parentNode.childNodes.splice(legacy.parentNode.childNodes.indexOf(legacy), 1);
      }
      for (const [selector, content] of snapshot.fragments) {
        if (content == null) continue;
        const node = find(document, (candidate) => attrs(candidate).id === selector.slice(1));
        if (!node) continue;
        fill(node, (selector === '#commandGroups' ? allCommands : selector === '#cmdList' ? marketingCommands : content).replaceAll(origin + '/', '/'));
        setAttr(node, 'data-prerender-fragment', selector.slice(1));
      }
      const head = find(document, (node) => node.tagName === 'head');
      for (const href of snapshot.styles) {
        const url = new URL(href);
        if (url.origin !== origin) continue;
        const asset = url.pathname + url.search;
        let exists = false;
        visit(head, (node) => {
          if (node.tagName === 'link' && attrs(node).rel === 'stylesheet') {
            const base = find(document, (candidate) => candidate.tagName === 'base');
            const baseUrl = new URL(attrs(base || {}).href || page.url(), page.url());
            if (new URL(attrs(node).href, baseUrl).pathname === url.pathname) exists = true;
          }
        });
        if (!exists) {
          const link = parse5.parseFragment(`<link rel="stylesheet" href="${asset}">`).childNodes[0];
          link.parentNode = head;
          head.childNodes.push(link);
        }
      }
      const body = find(document, (node) => node.tagName === 'body');
      const fallback = find(body, (node) => attrs(node)['data-prerender-fallback'] != null);
      if (fallback) fallback.parentNode.childNodes.splice(fallback.parentNode.childNodes.indexOf(fallback), 1);
      const nodes = parse5.parseFragment(noScript).childNodes;
      for (const node of nodes) node.parentNode = body;
      body.childNodes.push(...nodes);
      setAttr(find(document, (node) => node.tagName === 'html'), 'data-vozen-prerendered', 'true');
      fs.writeFileSync(file, parse5.serialize(document).replace(/[ \t]+$/gm, ''));
      rendered++;
    } catch (error) {
      throw new Error(`Prerender failed for ${relative}: ${error.message}`, { cause: error });
    } finally {
      await context.close();
    }
  }
  console.log(`Prerendered ${rendered} pages with public content and navigation in raw HTML.`);
} finally {
  await browser?.close();
  await closeSiteServer(server);
}
