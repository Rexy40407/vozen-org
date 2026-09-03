/* Generate indexable locale routes for the three public product entry pages.
 * English remains the authored HTML source. Portuguese TTS keeps its reviewed,
 * purpose-built page; the other routes use the shared product templates and
 * the isolated locale catalogues.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as parse5 from 'parse5';

const root = path.resolve('site');
const checkOnly = process.argv.includes('--check');
const locales = [
  { code: 'en', html: 'en' },
  { code: 'pt', html: 'pt-PT' },
  { code: 'fr', html: 'fr' },
  { code: 'es', html: 'es' },
  { code: 'de', html: 'de' },
  { code: 'tr', html: 'tr' },
  { code: 'ar', html: 'ar' },
  { code: 'zh', html: 'zh-Hant' },
  { code: 'ru', html: 'ru' },
  { code: 'ko', html: 'ko' },
];
const pages = [
  { route: 'home', slug: '', source: 'index.html', title: 'home.documentTitle', description: 'home.heroLead' },
  { route: 'tts', slug: 'tts/', source: 'tts/index.html', title: 'tts.documentTitle', description: 'hero.sub' },
  { route: 'helper', slug: 'helper/', source: 'helper/index.html', title: 'helper.landing.documentTitle', description: 'helper.landing.heroLede' },
];
const englishCatalogue = JSON.parse(
  fs.readFileSync(path.resolve('tools', 'i18n-marketing-src', 'en.json'), 'utf8'),
);
const normalized = (value) => value.replace(/\r\n?/g, '\n');

function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes || []) visit(child, callback);
  if (node.content) visit(node.content, callback);
}

const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
function setAttr(node, name, value) {
  node.attrs ||= [];
  const current = node.attrs.find((item) => item.name === name);
  if (current) current.value = value;
  else node.attrs.push({ name, value });
}
const isElement = (node, name) => node.tagName === name;
const elements = (document, predicate) => {
  const matches = [];
  visit(document, (node) => { if (node.tagName && predicate(node)) matches.push(node); });
  return matches;
};
const first = (document, predicate) => elements(document, predicate)[0];
const hasClass = (node, name) => (attr(node, 'class') || '').split(/\s+/).includes(name);
const byClass = (document, name) => first(document, (node) => hasClass(node, name));
const allByClass = (document, name) => elements(document, (node) => hasClass(node, name));
const byId = (document, id) => first(document, (node) => attr(node, 'id') === id);
const setText = (node, value) => {
  if (!node) return;
  node.childNodes = [{ nodeName: '#text', value, parentNode: node }];
};
const setOwnText = (node, value) => {
  if (!node) return;
  const textNodes = (node.childNodes || []).filter((child) => child.nodeName === '#text');
  if (!textNodes.length) {
    const textNode = { nodeName: '#text', value, parentNode: node };
    node.childNodes ||= [];
    node.childNodes.push(textNode);
    return;
  }
  const target = textNodes[textNodes.length - 1];
  const leading = target.value.match(/^\s*/)?.[0] || '';
  const trailing = target.value.match(/\s*$/)?.[0] || '';
  target.value = `${leading}${value}${trailing}`;
};
const canonicalFor = (locale, page) =>
  `https://vozen.org/${locale.code === 'en' ? '' : `${locale.code}/`}${page.slug}`;

function alternateMarkup(page) {
  const links = locales.map((locale) =>
    `<link rel="alternate" hreflang="${locale.html}" href="${canonicalFor(locale, page)}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${canonicalFor(locales[0], page)}">`);
  return links.join('');
}

function replaceStructuredUrls(value, from, to) {
  if (Array.isArray(value)) return value.map((item) => replaceStructuredUrls(item, from, to));
  if (!value || typeof value !== 'object') return value === from ? to : value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceStructuredUrls(item, from, to)]),
  );
}

export function translationMap(catalogue) {
  const result = new Map();
  const add = (source, translated) => {
    if (typeof source === 'string' && typeof translated === 'string' && source && source !== translated) {
      result.set(source, translated);
    }
  };
  for (const [key, source] of Object.entries(englishCatalogue.messages)) {
    add(source, catalogue.messages[key]);
  }
  for (const collection of ['faq', 'helperFaq']) {
    (englishCatalogue[collection] || []).forEach((pair, index) => {
      add(pair[0], catalogue[collection]?.[index]?.[0]);
      add(pair[1], catalogue[collection]?.[index]?.[1]);
    });
  }
  return result;
}

function replaceStructuredText(value, translations) {
  if (Array.isArray(value)) return value.map((item) => replaceStructuredText(item, translations));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceStructuredText(item, translations)]),
    );
  }
  return typeof value === 'string' && translations.has(value) ? translations.get(value) : value;
}

export function faqEntities(entries) {
  return entries.map(([question, answer]) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  }));
}

function translateExactText(document, translations) {
  visit(document, (node) => {
    if (node.nodeName === '#text' && !['script', 'style', 'noscript'].includes(node.parentNode?.tagName)) {
      const leading = node.value.match(/^\s*/)?.[0] || '';
      const trailing = node.value.match(/\s*$/)?.[0] || '';
      const source = node.value.slice(leading.length, node.value.length - trailing.length || undefined);
      if (translations.has(source)) node.value = `${leading}${translations.get(source)}${trailing}`;
    }
    for (const name of ['aria-label', 'placeholder', 'title']) {
      const value = attr(node, name);
      if (value && translations.has(value)) setAttr(node, name, translations.get(value));
    }
  });
}

function applyHelperTranslations(document, messages) {
  const message = (key) => messages[key];
  const set = (node, key) => { if (message(key) != null) setText(node, message(key)); };
  const setOwn = (node, key) => { if (message(key) != null) setOwnText(node, message(key)); };

  setOwn(byClass(document, 'helper-available'), 'helper.landing.available');
  const heroTitle = byId(document, 'helper-title');
  const heroTitleParts = elements(heroTitle, (node) => isElement(node, 'span'));
  set(heroTitleParts[0], 'helper.landing.heroTitle1');
  set(heroTitleParts[1], 'helper.landing.heroTitle2');
  set(byClass(document, 'helper-hero__lede'), 'helper.landing.heroLede');
  setOwn(byClass(document, 'helper-private-action'), 'helper.landing.getStarted');
  setOwn(byClass(document, 'helper-explore-action'), 'helper.landing.exploreModules');
  set(byClass(document, 'helper-hero__proof'), 'helper.landing.proof');

  const tasks = [
    ['security', 'helper.landing.securityCheck', 'helper.landing.protected'],
    ['ticket', 'helper.landing.ticketRouted', 'helper.landing.support'],
    ['event', 'helper.landing.eventReady', 'helper.landing.members'],
    ['workflow', 'helper.landing.workflowRan', 'helper.landing.replied'],
    ['insight', 'helper.landing.weeklyPulse', 'helper.landing.healthy'],
  ];
  for (const [name, titleKey, detailKey] of tasks) {
    const task = byClass(document, `helper-task--${name}`);
    set(first(task, (node) => isElement(node, 'b')), titleKey);
    set(first(task, (node) => isElement(node, 'small')), detailKey);
  }
  set(byClass(document, 'helper-console__channel'), 'helper.landing.operations');
  set(byClass(document, 'helper-console__preview'), 'helper.landing.preview');
  const consoleHeading = byClass(document, 'helper-console__heading');
  set(first(consoleHeading, (node) => isElement(node, 'span')), 'helper.landing.serverPulse');
  set(first(consoleHeading, (node) => isElement(node, 'strong')), 'helper.landing.everythingView');
  setOwn(byClass(document, 'helper-console__live'), 'helper.landing.live');
  const consoleEvents = [
    ['security', 'helper.landing.securityCheck', 'helper.landing.protected', 'helper.landing.active'],
    ['support', 'helper.landing.ticketRouted', 'helper.landing.support', 'helper.landing.now'],
    ['event', 'helper.landing.eventReady', 'helper.landing.members', 'helper.landing.now'],
  ];
  for (const [name, titleKey, detailKey, stateKey] of consoleEvents) {
    const event = byClass(document, `helper-console-event--${name}`);
    set(first(event, (node) => isElement(node, 'strong')), titleKey);
    set(first(event, (node) => isElement(node, 'small')), detailKey);
    set(byClass(event, 'helper-console-event__state') || byClass(event, 'helper-console-event__time'), stateKey);
  }
  for (const [module, key] of Object.entries({
    security: 'helper.moduleProtection',
    support: 'helper.moduleSupport',
    events: 'helper.moduleEvents',
    insights: 'helper.moduleInsights',
  })) {
    set(first(document, (node) => attr(node, 'data-console-module') === module), key);
  }

  const outcomes = byClass(document, 'helper-outcomes');
  set(byId(outcomes, 'outcomes-title'), 'helper.landing.outcomesTitle');
  set(byClass(outcomes, 'helper-kicker'), 'helper.landing.whatFor');
  const outcomeCopy = [
    ['helper.landing.protect', 'helper.landing.protectText', 'helper.landing.exploreProtection'],
    ['helper.moduleSupport', 'helper.landing.supportText', 'helper.landing.exploreSupport'],
    ['helper.landing.run', 'helper.landing.runText', 'helper.landing.exploreInsights'],
  ];
  allByClass(outcomes, 'helper-outcome').forEach((outcome, index) => {
    const copy = outcomeCopy[index];
    if (!copy) return;
    set(first(outcome, (node) => isElement(node, 'h3')), copy[0]);
    set(first(outcome, (node) => isElement(node, 'p')), copy[1]);
    setOwn(first(outcome, (node) => isElement(node, 'a')), copy[2]);
  });

  const explorer = byClass(document, 'helper-explorer');
  set(byId(explorer, 'modules-title'), 'helper.landing.explorerTitle');
  set(byClass(explorer, 'helper-kicker'), 'helper.landing.moduleMap');
  const splitHeading = byClass(explorer, 'helper-section-heading--split');
  set(first(splitHeading, (node) => isElement(node, 'p')), 'helper.landing.explorerText');
  const moduleNav = byClass(explorer, 'helper-module-nav');
  setAttr(moduleNav, 'aria-label', message('helper.landing.moduleMap'));
  const moduleLabels = {
    core: 'helper.moduleCore', security: 'helper.moduleProtection', support: 'helper.moduleSupport',
    events: 'helper.moduleEvents', community: 'helper.moduleCommunity', automate: 'helper.moduleAutomation',
    insights: 'helper.moduleInsights', studio: 'helper.moduleStudio',
  };
  const moduleCopy = {
    core: ['helper.landing.moduleCoreTitle', 'helper.landing.moduleCoreBody'],
    security: ['helper.landing.moduleSecurityTitle', 'helper.landing.moduleSecurityBody'],
    support: ['helper.landing.moduleSupportTitle', 'helper.landing.moduleSupportBody'],
    events: ['helper.landing.moduleEventsTitle', 'helper.landing.moduleEventsBody'],
    community: ['helper.landing.moduleCommunityTitle', 'helper.landing.moduleCommunityBody'],
    automate: ['helper.landing.moduleAutomateTitle', 'helper.landing.moduleAutomateBody'],
    insights: ['helper.landing.moduleInsightsTitle', 'helper.landing.moduleInsightsBody'],
    studio: ['helper.landing.moduleStudioTitle', 'helper.landing.moduleStudioBody'],
  };
  elements(moduleNav, (node) => hasClass(node, 'helper-module-tab')).forEach((tab) => {
    set(first(tab, (node) => isElement(node, 'b')), moduleLabels[attr(tab, 'data-module')]);
    set(first(tab, (node) => isElement(node, 'small')), 'helper.landing.commandSurface');
  });
  elements(explorer, (node) => attr(node, 'data-panel') != null).forEach((panel) => {
    const id = attr(panel, 'data-panel');
    const [titleKey, bodyKey] = moduleCopy[id] || [];
    const top = byClass(panel, 'helper-module-panel__top');
    set(byClass(top, 'helper-kicker'), moduleLabels[id]);
    set(byClass(top, 'helper-module-state'), 'helper.landing.moduleState');
    set(first(panel, (node) => isElement(node, 'h3')), titleKey);
    set(elements(panel, (node) => isElement(node, 'p') && !hasClass(node, 'helper-command'))[0], bodyKey);
    elements(byClass(panel, 'helper-feature-list'), (node) => isElement(node, 'li')).forEach((item, index) => {
      set(item, `helper.landing.bullet${Math.min(index + 1, 4)}`);
    });
    set(first(byClass(panel, 'helper-command'), (node) => isElement(node, 'span')), 'helper.landing.commandSurface');
  });

  const setup = byClass(document, 'helper-setup');
  set(byId(setup, 'setup-title'), 'helper.landing.setupTitle');
  set(byClass(setup, 'helper-kicker'), 'helper.landing.ready');
  const setupCopy = [
    ['helper.landing.chooseModules', 'helper.landing.chooseModulesText'],
    ['helper.landing.confirmPermissions', 'helper.landing.confirmPermissionsText'],
    ['helper.landing.configureMonitor', 'helper.landing.configureMonitorText'],
  ];
  elements(byClass(setup, 'helper-setup__steps'), (node) => isElement(node, 'li')).forEach((step, index) => {
    const [titleKey, bodyKey] = setupCopy[index] || [];
    set(first(step, (node) => isElement(node, 'h3')), titleKey);
    set(first(step, (node) => isElement(node, 'p')), bodyKey);
  });
  const access = byClass(document, 'helper-access');
  set(byId(access, 'access-title'), 'helper.landing.accessTitle');
  set(byClass(access, 'helper-kicker'), 'helper.landing.access');
  set(first(access, (node) => isElement(node, 'p')), 'helper.landing.accessText');
  setOwn(byClass(access, 'helper-access__badge'), 'helper.landing.available');

  const pricing = byClass(document, 'helper-pricing');
  set(byId(pricing, 'helper-plans-title'), 'premium.title');
  set(byClass(pricing, 'eyebrow'), 'premium.pricing');
  set(first(byClass(pricing, 'helper-pricing__heading'), (node) => isElement(node, 'p')), 'premium.subtitle');
  setOwn(byClass(pricing, 'payments-paused'), 'price.paused');
  const freeCard = byClass(pricing, 'price-card--free');
  set(first(freeCard, (node) => isElement(node, 'h3')), 'price.free.name');
  set(byClass(freeCard, 'price-card__pitch'), 'helper.landing.freePitch');
  set(byClass(freeCard, 'price-card__note'), 'helper.landing.freeNote');
  set(byClass(freeCard, 'price-card__idnote'), 'helper.landing.startNote');
  elements(byClass(freeCard, 'price-card__highlights'), (node) => isElement(node, 'li')).forEach((item, index) => {
    set(item, `helper.landing.freeFeature${index + 1}`);
  });
  const plusCard = byClass(pricing, 'price-card--plus');
  const plusKeys = [
    'price.includesFree', 'price.m.21', 'price.m.22', 'price.m.9',
    'price.m.15', 'price.m.11', 'price.m.12', 'price.m.14',
  ];
  elements(byClass(plusCard, 'price-card__highlights'), (node) => isElement(node, 'li')).forEach((item, index) => {
    set(item, plusKeys[index]);
  });
  const proCard = byClass(pricing, 'price-card--pro');
  set(first(proCard, (node) => isElement(node, 'h3')), 'price.pro.name');
  set(byClass(proCard, 'price-card__pitch'), 'premium.premiumPitch');
  set(byClass(proCard, 'price-card__scope-note'), 'helper.landing.scopeNote');
  const proLists = allByClass(proCard, 'price-card__highlights');
  const helperBundleKeys = [
    'price.includesFree', 'premium.proFeature1', 'premium.proFeature2',
    'helper.landing.ttsPremiumFeature', 'premium.proFeature3', 'premium.proFeature4', 'premium.proFeature5',
  ];
  elements(proLists[0], (node) => isElement(node, 'li')).forEach((item, index) => set(item, helperBundleKeys[index]));
  const ttsBundleKeys = [
    'price.includesFree', 'price.m.18', 'price.m.21', 'price.m.22', 'price.m.9',
    'price.m.19', 'price.m.16', 'price.m.23', 'price.m.11',
  ];
  elements(proLists[1], (node) => isElement(node, 'li')).forEach((item, index) => set(item, ttsBundleKeys[index]));

  const comparison = byClass(document, 'helper-plan-comparison');
  set(byClass(comparison, 'helper-kicker'), 'helper.landing.planComparison');
  set(byId(comparison, 'helper-plan-comparison-title'), 'helper.landing.comparisonTitle');
  set(first(byClass(comparison, 'helper-plan-comparison__header'), (node) => isElement(node, 'p')), 'helper.landing.comparisonText');
  setOwn(byClass(comparison, 'helper-plan-comparison__status'), 'helper.landing.paymentsPaused');
  set(byClass(comparison, 'helper-plan-comparison__caption'), 'helper.landing.comparisonCaption');
  const headers = elements(comparison, (node) => isElement(node, 'th'));
  set(headers[0], 'helper.landing.features');
  const rowKeys = [
    'helper.landing.freeFeature1', 'helper.landing.freeFeature2', 'helper.landing.freeFeature3',
    'helper.landing.freeFeature4', 'helper.landing.freeFeature5', 'premium.proFeature3',
    'premium.proFeature4', 'premium.proFeature5', 'premium.proFeature1',
  ];
  headers.filter((header) => attr(header, 'scope') === 'row').forEach((header, index) => set(header, rowKeys[index]));
  set(byClass(comparison, 'helper-plan-comparison__footnote'), 'helper.landing.limitsNote');
  allByClass(comparison, 'helper-plan-comparison__mark--yes').forEach((mark) => setAttr(mark, 'aria-label', message('helper.landing.included')));
  allByClass(comparison, 'helper-plan-comparison__mark--no').forEach((mark) => setAttr(mark, 'aria-label', message('helper.landing.notIncluded')));
}

export function localize(sourceHtml, locale, page, catalogue) {
  const { messages } = catalogue;
  const translations = translationMap(catalogue);
  const document = parse5.parse(sourceHtml);
  const html = first(document, (node) => isElement(node, 'html'));
  const head = first(document, (node) => isElement(node, 'head'));
  setAttr(html, 'lang', locale.html);
  setAttr(html, 'data-vozen-locale', locale.code);
  setAttr(html, 'data-vozen-localized-route', page.route);
  if (locale.code === 'ar') setAttr(html, 'dir', 'rtl');

  let base = first(head, (node) => isElement(node, 'base'));
  if (!base) {
    base = parse5.parseFragment('<base href="../">').childNodes[0];
    base.parentNode = head;
    head.childNodes.unshift(base);
  }
  setAttr(base, 'href', page.route === 'home' ? '../' : '../../');

  const canonical = canonicalFor(locale, page);
  const englishCanonical = canonicalFor(locales[0], page);
  const canonicalLink = first(head, (node) => isElement(node, 'link') && attr(node, 'rel') === 'canonical');
  setAttr(canonicalLink, 'href', canonical);
  head.childNodes = head.childNodes.filter((node) =>
    !(isElement(node, 'link') && attr(node, 'rel') === 'alternate' && attr(node, 'hreflang')));
  const alternates = parse5.parseFragment(alternateMarkup(page)).childNodes;
  for (const node of alternates) node.parentNode = head;
  const canonicalIndex = head.childNodes.indexOf(canonicalLink);
  head.childNodes.splice(canonicalIndex + 1, 0, ...alternates);

  const title = messages[page.title] || messages['home.documentTitle'] || 'Vozen';
  const descriptionBase = messages[page.description] || '';
  const description = descriptionBase.length >= 30
    ? descriptionBase
    : `${descriptionBase} Vozen TTS · Vozen Helper · Discord.`;
  setText(first(head, (node) => isElement(node, 'title')), title);
  for (const meta of elements(head, (node) => isElement(node, 'meta'))) {
    const name = attr(meta, 'name');
    const property = attr(meta, 'property');
    if (name === 'description' || property === 'og:description' || name === 'twitter:description') {
      setAttr(meta, 'content', description);
    } else if (property === 'og:url') setAttr(meta, 'content', canonical);
    else if (property === 'og:title' || name === 'twitter:title') setAttr(meta, 'content', title);
  }

  for (const script of elements(document, (node) => isElement(node, 'script') && attr(node, 'type') === 'application/ld+json')) {
    try {
      let data = replaceStructuredUrls(
        JSON.parse(script.childNodes?.[0]?.value || ''),
        englishCanonical,
        canonical,
      );
      data = replaceStructuredText(data, translations);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        data.inLanguage = locale.html;
        if (data['@type'] === 'FAQPage') {
          const entries = page.route === 'helper' ? catalogue.helperFaq : page.route === 'tts' ? catalogue.faq : null;
          if (entries) data.mainEntity = faqEntities(entries);
        }
        if (data['@type'] === 'SoftwareApplication' && messages[page.description]) {
          data.description = messages[page.description];
        }
      }
      setText(script, JSON.stringify(data));
    } catch {}
  }

  visit(document, (node) => {
    if (!node.tagName) return;
    const key = attr(node, 'data-i18n');
    if (key && messages[key] != null) setText(node, messages[key]);
    for (const [marker, target] of [
      ['data-i18n-aria-label', 'aria-label'],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-title', 'title'],
    ]) {
      const attributeKey = attr(node, marker);
      if (attributeKey && messages[attributeKey] != null) setAttr(node, target, messages[attributeKey]);
    }
    if (attr(node, 'data-vozen-nav') != null) setAttr(node, 'data-nav-locale-root', `${locale.code}/`);
    if (isElement(node, 'a')) {
      const href = attr(node, 'href');
      if (href?.startsWith('#')) setAttr(node, 'href', `${canonical}${href}`);
      else if (href === 'tts/' || href === 'helper/') setAttr(node, 'href', `${locale.code}/${href}`);
      else if (href === './') setAttr(node, 'href', canonical);
    }
  });

  if (page.route === 'helper') applyHelperTranslations(document, messages);
  translateExactText(document, translations);

  return parse5.serialize(document).replace(/[ \t]+$/gm, '');
}

export function buildLocalizedPages({ onlyCheck = checkOnly } = {}) {
  const desiredFiles = [];
  for (const locale of locales.slice(1)) {
    const source = JSON.parse(fs.readFileSync(path.resolve('tools', 'i18n-marketing-src', `${locale.code}.json`), 'utf8'));
    for (const page of pages) {
      if (locale.code === 'pt' && page.route === 'tts') continue;
      const sourceHtml = fs.readFileSync(path.join(root, ...page.source.split('/')), 'utf8');
      const output = path.join(root, locale.code, ...page.slug.split('/').filter(Boolean), 'index.html');
      desiredFiles.push([output, localize(sourceHtml, locale, page, source)]);
    }
  }

  let sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  for (const locale of locales) {
    for (const page of pages) {
      const canonical = canonicalFor(locale, page);
      if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
        sitemap = sitemap.replace(/\s*<\/urlset>\s*$/, `\n  <url><loc>${canonical}</loc></url>\n</urlset>\n`);
      }
    }
  }

  const mismatches = [];
  for (const [output, generated] of desiredFiles) {
    let current = '';
    try { current = fs.readFileSync(output, 'utf8'); } catch {}
    if (normalized(current) !== normalized(generated)) {
      if (onlyCheck) mismatches.push(path.relative(root, output));
      else {
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, generated);
      }
    }
  }
  const sitemapPath = path.join(root, 'sitemap.xml');
  if (normalized(fs.readFileSync(sitemapPath, 'utf8')) !== normalized(sitemap)) {
    if (onlyCheck) mismatches.push('sitemap.xml');
    else fs.writeFileSync(sitemapPath, sitemap);
  }

  if (mismatches.length) {
    throw new Error(`localized pages are out of date; run npm run build:localized\n${mismatches.join('\n')}`);
  }
  console.log(`[${onlyCheck ? 'check' : 'build'}-localized-pages] 10 locales × 3 public entry routes are current`);
  return { localeCount: locales.length, pageCount: pages.length, generatedCount: desiredFiles.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildLocalizedPages();
}
