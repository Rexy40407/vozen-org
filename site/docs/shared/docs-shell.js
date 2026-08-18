(function () {
  'use strict';

  const script = document.currentScript;
  if (!script || document.body.dataset.vozenDocsShell === 'ready') return;

  const docsRoot = new URL('../', script.src);
  const siteRoot = new URL('../../', script.src);
  const productFromBody = String(document.body.dataset.docsProduct || '').toLowerCase();
  const currentPath = window.location.pathname.replace(/\\/g, '/');
  const isDocsLandingPath = /\/docs(?:\/index\.html)?$/i.test(currentPath);
  const product = productFromBody === 'docs' || isDocsLandingPath ? 'docs' : productFromBody === 'tts' || /\/docs\/tts(?:\/|$)/.test(currentPath) ? 'tts' : 'helper';
  const config = {
    docs: {
      label: 'Docs',
      mark: 'D',
      root: docsRoot,
      search: null,
      nav: null,
      status: 'Choose a product for a focused public guide.'
    },
    helper: {
      label: 'Vozen Helper',
      mark: 'H',
      root: new URL('helper/', docsRoot),
      search: new URL('helper/search-data.js', docsRoot),
      nav: new URL('helper/data/helper-docs-manifest.js', docsRoot),
      status: 'Simple guides for using Vozen Helper.'
    },
    tts: {
      label: 'Vozen TTS',
      mark: 'T',
      root: new URL('tts/', docsRoot),
      search: new URL('tts/search-data.js', docsRoot),
      nav: new URL('tts/data/tts-docs-manifest.js', docsRoot),
      status: 'Simple guides for using Vozen TTS.'
    }
  }[product];
  const localFile = window.location.protocol === 'file:';
  const docsHome = localFile ? new URL('index.html', docsRoot).href : docsRoot.href;
  const productHome = (folder) => new URL(localFile ? folder + 'index.html' : folder, docsRoot).href;
  const docsLocale = () => {
    try {
      const value = window.localStorage.getItem('vozen.lang') || 'en';
      return window.VOZEN_I18N && window.VOZEN_I18N[value] ? value : 'en';
    } catch (_) {
      return 'en';
    }
  };
  const docsText = (key, fallback, variables) => {
    const dictionary = window.VOZEN_I18N || {};
    const locale = docsLocale();
    let value = dictionary[locale]?.[key] || dictionary.en?.[key] || fallback || key;
    Object.keys(variables || {}).forEach((name) => {
      value = value.replace(new RegExp('\\{' + name + '\\}', 'g'), String(variables[name]));
    });
    return value;
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const normalize = (value) => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const pathKey = (value) => String(value || '').replace(/\\/g, '/').replace(/\/index\.html$/, '/').replace(/\/$/, '');
  const samePath = (href) => pathKey(new URL(href, window.location.href).pathname) === pathKey(window.location.pathname);
  const cleanPublicIndexUrl = (value) => {
    const target = new URL(value, window.location.href);
    if (!localFile && target.origin === window.location.origin && /\/index\.html$/i.test(target.pathname)) {
      target.pathname = target.pathname.replace(/index\.html$/i, '');
    }
    return target.href;
  };
  const docUrl = (relative) => cleanPublicIndexUrl(new URL(relative || 'index.html', config.root));
  const relativeOr = (value, fallback) => value ? new URL(value, config.root).href : fallback;
  const docsReturnStorageKey = 'vozen-docs-return-url';

  function normalisePublicIndexAddress() {
    if (localFile || !/\/index\.html$/i.test(window.location.pathname)) return;
    const target = new URL(window.location.href);
    target.pathname = target.pathname.replace(/index\.html$/i, '');
    window.history.replaceState(null, document.title, target.pathname + target.search + target.hash);
  }

  function normalisePublicIndexLinks() {
    if (localFile) return;
    document.querySelectorAll('a[href]').forEach((link) => {
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#')) return;
      try {
        const target = new URL(raw, window.location.href);
        if (target.origin !== window.location.origin || !/\/index\.html$/i.test(target.pathname)) return;
        target.pathname = target.pathname.replace(/index\.html$/i, '');
        link.href = target.pathname + target.search + target.hash;
      } catch (_) {
        // Keep a malformed legacy link untouched instead of breaking navigation.
      }
    });
  }

  // Older static pages may still link to an uncached shell stylesheet. Add the
  // current stylesheet after the document's own styles so every route — even
  // a directly opened file:// page — gets the same navigation geometry.
  function ensureCurrentShellStyles() {
    if (document.querySelector('link[data-vozen-current-docs-shell]')) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = new URL('docs-shell.css?v=ecosystem-nav-v14', docsRoot).href;
    stylesheet.dataset.vozenCurrentDocsShell = 'true';
    document.head.appendChild(stylesheet);
  }

  function installEcosystemNav() {
    if (document.querySelector('[data-vozen-nav]') || document.querySelector('.docs-ecosystem-nav')) return;

    const host = document.createElement('div');
    host.dataset.vozenNav = '';
    host.dataset.navRoot = siteRoot.href;
    host.dataset.navCurrent = 'docs';
    host.dataset.navProduct = 'Ecosystem';
    host.dataset.navSurface = 'docs';

    // On first load the legacy Docs header still exists.  Insert before it so
    // that the ecosystem header always sits above the Docs topbar, including
    // before createTopbar() upgrades that legacy header.
    const topbar = document.querySelector('.docs-topbar, .docs-header');
    if (topbar?.parentNode) topbar.parentNode.insertBefore(host, topbar);
    else document.body.insertBefore(host, document.body.querySelector('main'));

    const navScript = document.createElement('script');
    navScript.src = new URL('js/global-nav-v1.js?v=ecosystem-nav-v14', siteRoot.href).href;
    document.body.appendChild(navScript);
  }

  function isDocsUrl(value) {
    try {
      return /\/docs(?:\/|$)/i.test(new URL(value, window.location.href).pathname.replace(/\\/g, '/'));
    } catch (error) {
      return false;
    }
  }

  function safeReturnUrl(value) {
    if (!value) return null;
    try {
      const target = new URL(value, window.location.href);
      const sameFileSurface = window.location.protocol === 'file:' && target.protocol === 'file:';
      const sameWebOrigin = ['http:', 'https:'].includes(target.protocol) && target.origin === window.location.origin;
      return sameFileSurface || sameWebOrigin ? target.href : null;
    } catch (error) {
      return null;
    }
  }

  function rememberDocsEntry() {
    const referrer = safeReturnUrl(document.referrer);
    if (!referrer || isDocsUrl(referrer)) return;
    try {
      window.sessionStorage.setItem(docsReturnStorageKey, referrer);
    } catch (error) {
      // Storage is an enhancement; the referrer and site fallback remain safe options.
    }
  }

  function readDocsReturnUrl(fallback) {
    let stored = null;
    try {
      stored = safeReturnUrl(window.sessionStorage.getItem(docsReturnStorageKey));
    } catch (error) {
      stored = null;
    }
    if (stored && !isDocsUrl(stored)) return stored;
    const referrer = safeReturnUrl(document.referrer);
    return referrer && !isDocsUrl(referrer) ? referrer : fallback;
  }

  function setActiveProduct(link) {
    if (samePath(link.href) || (product === 'helper' && /\/docs\/helper\/?$/.test(new URL(link.href).pathname)) || (product === 'tts' && /\/docs\/tts\/?$/.test(new URL(link.href).pathname))) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }

  function createTopbar() {
    let legacyHeader = document.querySelector('.docs-header');
    let topbar = document.querySelector('.docs-topbar');
    if (legacyHeader && !topbar) {
      topbar = document.createElement('header');
      topbar.className = 'docs-topbar';
      legacyHeader.replaceWith(topbar);
    }
    if (!topbar) {
      topbar = document.createElement('header');
      topbar.className = 'docs-topbar';
      document.body.insertBefore(topbar, document.body.querySelector('main'));
    }

    const fallback = localFile ? new URL('index.html', siteRoot).href : siteRoot.href;
    rememberDocsEntry();
    const returnUrl = readDocsReturnUrl(fallback);
    topbar.innerHTML = '<div class="docs-topbar__inner">' +
      '<a class="docs-topbar__back" data-docs-back href="' + esc(returnUrl) + '">' + esc(docsText('docs.goBack', '← Go back')) + '</a>' +
      '<span class="docs-topbar__arrow" aria-hidden="true">→</span>' +
      '<nav aria-label="' + esc(docsText('docs.products', 'Documentation products')) + '"><ul class="docs-topbar__products">' +
      '<li><a class="docs-topbar__link" data-docs-product-link="docs" href="' + esc(docsHome) + '">' + esc(docsText('ecosystem.docs', 'Docs')) + '</a></li>' +
      '<li><span class="docs-topbar__arrow" aria-hidden="true">→</span></li>' +
      '<li><a class="docs-topbar__link" data-docs-product-link="helper" href="' + esc(productHome('helper/')) + '">' + esc(docsText('ecosystem.helper', 'Vozen Helper')) + '</a></li>' +
      '<li><span class="docs-topbar__arrow" aria-hidden="true">→</span></li>' +
      '<li><a class="docs-topbar__link" data-docs-product-link="tts" href="' + esc(productHome('tts/')) + '">' + esc(docsText('ecosystem.tts', 'Vozen TTS')) + '</a></li>' +
      '</ul></nav></div>';

    topbar.dataset.docsComponent = 'DocsTopbar';
    topbar.querySelector('nav')?.setAttribute('data-docs-component', 'ProductTabs');
    topbar.querySelectorAll('[data-docs-product-link]').forEach(setActiveProduct);
    const back = topbar.querySelector('[data-docs-back]');
    back.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.assign(returnUrl);
    });
    return topbar;
  }

  function createSidebar(topbar) {
    let sidebar = document.querySelector('.docs-sidebar');
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.className = 'docs-sidebar';
      topbar.insertAdjacentElement('afterend', sidebar);
    }
    sidebar.setAttribute('aria-label', docsText('docs.sidebarLabel', '{product} documentation navigation', { product: config.label }));
    const searchMarkup = product === 'docs' ? '' : '<form class="docs-search" role="search" aria-label="' + esc(docsText('docs.searchLabel', 'Search {product} documentation', { product: config.label })) + '" data-docs-search>' +
      '<label class="docs-search__label" for="docs-search-input">' + esc(docsText('docs.searchThisProduct', 'Search this product')) + '</label>' +
      '<div class="docs-search__control"><input id="docs-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="' + esc(docsText(product === 'tts' ? 'docs.searchTts' : 'docs.searchHelper', product === 'tts' ? 'Search TTS docs' : 'Search Helper docs')) + '" role="combobox" aria-autocomplete="list" aria-controls="docs-search-results" aria-expanded="false"><button class="docs-search__clear" type="button" aria-label="' + esc(docsText('docs.clearSearch', 'Clear search')) + '" hidden>×</button></div>' +
      '<div class="docs-search__status" aria-live="polite" data-state="idle"></div>' +
      '</form>';
    const searchResultsMarkup = product === 'docs' ? '' : '<div class="docs-search-results" id="docs-search-results" role="listbox" aria-label="' + esc(docsText('docs.searchResults', 'Search results')) + '" hidden></div>';
    const sidebarHome = product === 'docs' ? (localFile ? new URL('index.html', siteRoot).href : siteRoot.href) : docsHome;
    const sidebarHomeLabel = product === 'docs' ? docsText('docs.backToVozen', 'Back to Vozen') : docsText('docs.backToDocs', 'Back to Docs');
    sidebar.innerHTML = '<div class="docs-sidebar__inner">' +
      '<div class="docs-sidebar__product"><span class="docs-sidebar__product-mark" aria-hidden="true">' + config.mark + '</span><span><strong>' + esc(config.label) + '</strong><small>' + esc(docsText('docs.documentation', 'Documentation')) + '</small></span></div>' +
      searchMarkup +
      searchResultsMarkup +
      '<nav class="docs-sidebar__tree" aria-label="' + esc(docsText('docs.sections', 'Documentation sections')) + '"><p class="docs-search-empty">' + esc(docsText('docs.loadingNavigation', 'Loading navigation…')) + '</p></nav>' +
      '<div class="docs-sidebar__foot"><a href="' + esc(sidebarHome) + '">' + sidebarHomeLabel + '</a><span>' + esc(docsText('docs.' + product + 'Status', config.status)) + '</span></div>' +
      '</div>';

    sidebar.dataset.docsComponent = 'DocsSidebar';
    sidebar.querySelector('[data-docs-search]')?.setAttribute('data-docs-component', 'DocsSearch');
    sidebar.querySelector('.docs-search-results')?.setAttribute('data-docs-component', 'SearchResults');

    let toggle = document.querySelector('.docs-drawer-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.className = 'docs-drawer-toggle';
      toggle.type = 'button';
      toggle.textContent = docsText('docs.browse', 'Browse documentation');
      toggle.setAttribute('aria-controls', 'docs-sidebar');
      toggle.setAttribute('aria-expanded', 'false');
      topbar.insertAdjacentElement('afterend', toggle);
    }
    sidebar.id = 'docs-sidebar';
    toggle.setAttribute('aria-controls', sidebar.id);

    let scrim = document.querySelector('.docs-sidebar-scrim');
    if (!scrim) {
      scrim = document.createElement('button');
      scrim.className = 'docs-sidebar-scrim';
      scrim.type = 'button';
      scrim.setAttribute('aria-label', docsText('docs.closeNavigation', 'Close documentation navigation'));
      document.body.appendChild(scrim);
    }

    let lastFocus = null;
    const setOpen = (open) => {
      document.body.classList.toggle('docs-sidebar-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) {
        lastFocus = document.activeElement;
        window.setTimeout(() => sidebar.querySelector('input, a, button')?.focus(), 0);
      } else if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
    };
    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('docs-sidebar-open')));
    scrim.addEventListener('click', () => setOpen(false));
    sidebar.addEventListener('click', (event) => { if (event.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.classList.contains('docs-sidebar-open')) {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !document.body.classList.contains('docs-sidebar-open')) return;
      const focusable = [...sidebar.querySelectorAll('input, a, button, summary')].filter((node) => !node.hidden && !node.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    return sidebar;
  }

  function loadScript(url) {
    if ([...document.scripts].some((node) => node.src === url.href || node.dataset.vozenDocsResource === url.href)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const node = document.createElement('script');
      node.src = url.href;
      node.dataset.vozenDocsResource = url.href;
      node.onload = () => resolve();
      node.onerror = () => reject(new Error('Could not load ' + url.href));
      document.head.appendChild(node);
    });
  }

  function fallbackHelperGroups() {
    const routes = globalThis.VOZEN_HELPER_ROUTES || {};
    const labels = Object.keys(routes).map((key) => ({
      key,
      title: docsText(key, key.split('.').pop().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')),
      route: routes[key],
      maturity: 'catalog'
    }));
    return [{ label: docsText('docs.modules', 'Modules'), links: labels }];
  }

  const helperGuideLinks = [
    { key: 'docs.introduction', title: 'Introduction', route: 'get-started/introduction/index.html' },
    { key: 'docs.installHelper', title: 'Install the Helper', route: 'get-started/install/index.html' },
    { key: 'docs.quickSetup', title: 'Quick setup', route: 'get-started/quick-setup/index.html' },
    { key: 'docs.serverSelection', title: 'Server selection', route: 'get-started/server-selection/index.html' },
    { key: 'docs.featureStatus', title: 'Feature status', route: 'get-started/feature-status/index.html' }
  ];
  const helperTaskLinks = [
    { key: 'docs.protectServer', title: 'Protect a server', route: 'guides/protect-a-server/index.html' },
    { key: 'docs.welcomeMembers', title: 'Welcome members', route: 'guides/welcome/index.html' },
    { key: 'docs.buildCommunity', title: 'Build community', route: 'guides/community/index.html' },
    { key: 'docs.manageAutomate', title: 'Manage and automate', route: 'guides/manage/index.html' },
    { key: 'docs.supportMembers', title: 'Support members', route: 'guides/support/index.html' },
    { key: 'docs.useUtilities', title: 'Use utilities', route: 'guides/use/index.html' },
    { key: 'docs.understandActivity', title: 'Understand activity', route: 'guides/understand/index.html' },
    { key: 'docs.personalizeXp', title: 'Personalize the XP card', route: 'guides/personalize/index.html' },
    { key: 'docs.alertsProviders', title: 'Alerts and providers', route: 'guides/alerts/index.html' },
    { key: 'docs.growServer', title: 'Grow the server', route: 'guides/grow/index.html' },
    { key: 'docs.readOnlyWeb3', title: 'Read-only Web3', route: 'guides/web3/index.html' }
  ];
  const helperUtilityLinks = [
    { key: 'docs.commandReference', title: 'Command reference', route: 'reference/commands/index.html' },
    { key: 'docs.permissions', title: 'Permissions', route: 'reference/permissions/index.html' },
    { key: 'docs.limits', title: 'Limits', route: 'reference/limits/index.html' },
    { key: 'docs.glossary', title: 'Glossary', route: 'reference/glossary/index.html' },
    { key: 'docs.privacy', title: 'Privacy', route: 'security/privacy/index.html' },
    { key: 'docs.storedData', title: 'Stored data', route: 'security/stored-data/index.html' },
    { key: 'docs.featureStatus', title: 'Feature status', route: 'status/features/index.html' },
    { key: 'docs.providerStatus', title: 'Provider status', route: 'status/providers/index.html' }
  ];
  const helperTroubleshootingLinks = [
    { key: 'docs.botNotResponding', title: 'Bot not responding', route: 'troubleshooting/bot-not-responding/index.html' },
    { key: 'docs.missingPermissions', title: 'Missing permissions', route: 'troubleshooting/missing-permissions/index.html' },
    { key: 'docs.providerFailures', title: 'Provider failures', route: 'troubleshooting/provider-failures/index.html' },
    { key: 'docs.roleHierarchy', title: 'Role hierarchy', route: 'troubleshooting/role-hierarchy/index.html' },
    { key: 'docs.restoreConfiguration', title: 'Restore configuration', route: 'troubleshooting/restore-configuration/index.html' }
  ];

  function helperGroups(manifest) {
    const featureMap = new Map((manifest?.features || []).map((feature) => [feature.key, feature]));
    const routes = globalThis.VOZEN_HELPER_ROUTES || {};
    const modules = Object.keys(routes).map((key) => {
      const feature = featureMap.get(key) || {};
      return { key, title: feature.title || key.split('.').pop().replaceAll('_', ' '), route: routes[key], maturity: feature.maturity || 'catalog' };
    });
    const links = (items) => items.map((item) => ({ title: docsText(item.key, item.title), route: item.route }));
    return [
      { label: docsText('docs.getStarted', 'Get started'), links: links(helperGuideLinks) },
      { label: docsText('docs.taskGuides', 'Task guides'), links: links(helperTaskLinks) },
      { label: docsText('docs.modules', 'Modules'), links: modules },
      { label: docsText('docs.referencePrivacy', 'Reference and privacy'), links: links(helperUtilityLinks) },
      { label: docsText('docs.troubleshooting', 'Troubleshooting'), links: links(helperTroubleshootingLinks) }
    ];
  }

  function normaliseGroups(manifest) {
    if (product === 'docs') return [
      { label: docsText('docs.aboutDocs', 'About the docs'), links: [{ title: docsText('docs.whatAreDocs', 'What are the docs?'), route: 'index.html' }] },
      { label: docsText('docs.products', 'Products'), links: [{ title: 'Vozen Helper', route: 'helper/index.html' }, { title: 'Vozen TTS', route: 'tts/index.html' }] }
    ];
    if (product === 'helper') return helperGroups(manifest);
    return Array.isArray(manifest?.sections) ? manifest.sections.map((section) => ({
      ...section,
      label: docsText('docs.section.' + normalize(section.label).replace(/[^a-z0-9]+/g, '.'), section.label),
      links: (section.links || []).map((link) => ({
        ...link,
        title: docsText('docs.route.' + String(link.route || '').replace(/\/index\.html$/i, '').replace(/[^a-z0-9]+/gi, '.'), link.title)
      }))
    })) : [];
  }

  const disclosureStorageKey = 'vozen-docs-open-group:' + product;

  function disclosureKey(group, index) {
    return slugify(group.label || group.title || 'section') + '-' + index;
  }

  function readDisclosureState() {
    try {
      const raw = window.sessionStorage.getItem(disclosureStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeDisclosureState(groupKey, href) {
    try {
      window.sessionStorage.setItem(disclosureStorageKey, JSON.stringify({
        groupKey,
        path: pathKey(new URL(href || window.location.href, window.location.href).pathname)
      }));
    } catch (error) {
      // Local file pages can deny storage access; the current-page fallback still works.
    }
  }

  function clearDisclosureState() {
    try {
      window.sessionStorage.removeItem(disclosureStorageKey);
    } catch (error) {
      // Storage is an enhancement, not a requirement for navigation.
    }
  }

  function bindDisclosure(sidebar, groups) {
    const details = [...sidebar.querySelectorAll('.docs-sidebar__group')];
    let syncing = false;
    const save = (groupKey, href) => writeDisclosureState(groupKey, href || window.location.href);

    details.forEach((detail) => {
      const groupKey = detail.dataset.docsGroup;
      detail.addEventListener('toggle', () => {
        if (syncing) return;
        if (detail.open) {
          syncing = true;
          details.forEach((other) => {
            if (other !== detail && other.open) other.open = false;
          });
          syncing = false;
          save(groupKey);
        } else if (!details.some((other) => other.open)) {
          clearDisclosureState();
        }
      });
      detail.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => save(groupKey, link.href));
      });
    });
  }

  function renderGroups(sidebar, groups) {
    const tree = sidebar.querySelector('.docs-sidebar__tree');
    const current = window.location.pathname;
    if (!groups.length) {
      tree.innerHTML = '<p class="docs-search-error">' + esc(docsText('docs.navigationUnavailable', 'Navigation is not available right now.')) + '</p>';
      return;
    }
    const saved = readDisclosureState();
    const currentGroupIndex = groups.findIndex((group) => (group.links || []).some((link) => link && link.route && pathKey(docUrl(link.route)) === pathKey(current)));
    const savedGroupIndex = saved ? groups.findIndex((group, index) => disclosureKey(group, index) === saved.groupKey) : -1;
    const savedMatchesCurrent = saved && saved.path === pathKey(current);
    const openIndex = savedMatchesCurrent && savedGroupIndex >= 0 ? savedGroupIndex : currentGroupIndex >= 0 ? currentGroupIndex : savedGroupIndex >= 0 ? savedGroupIndex : 0;
    tree.innerHTML = groups.map((group, index) => {
      const links = (group.links || []).filter((link) => link && link.route);
      const markup = links.map((link) => {
        const href = docUrl(link.route);
        const active = samePath(href);
        const status = link.maturity && link.maturity !== 'operational' ? '<small>' + esc(docsText('docs.maturity.' + link.maturity, link.maturity)) + '</small>' : '';
        return '<a href="' + esc(href) + '"' + (active ? ' aria-current="page"' : '') + '><span>' + esc(link.title || link.label || 'Documentation') + '</span>' + status + '</a>';
      }).join('');
      const open = index === openIndex;
      return '<details class="docs-sidebar__group" data-docs-group="' + esc(disclosureKey(group, index)) + '"' + (open ? ' open' : '') + '><summary>' + esc(group.label || group.title || 'Section') + '</summary><div class="docs-sidebar__links">' + markup + '</div></details>';
    }).join('');
    bindDisclosure(sidebar, groups);
  }

  function setNodeTextWithHighlights(node, text, terms) {
    node.textContent = '';
    const source = String(text || '');
    const activeTerms = terms.filter(Boolean).sort((a, b) => b.length - a.length);
    if (!activeTerms.length) {
      node.appendChild(document.createTextNode(source));
      return;
    }
    const regex = new RegExp(activeTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'ig');
    let cursor = 0;
    let match;
    while ((match = regex.exec(source))) {
      if (match.index > cursor) node.appendChild(document.createTextNode(source.slice(cursor, match.index)));
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      node.appendChild(mark);
      cursor = match.index + match[0].length;
    }
    if (cursor < source.length) node.appendChild(document.createTextNode(source.slice(cursor)));
  }

  function excerptFor(documentEntry, terms) {
    const source = String(documentEntry.excerpt || documentEntry.text || '');
    const lower = normalize(source);
    const first = terms.map(normalize).map((term) => lower.indexOf(term)).filter((index) => index >= 0).sort((a, b) => a - b)[0];
    if (first === undefined || source.length <= 180) return source.slice(0, 190);
    const start = Math.max(0, first - 54);
    return (start ? '…' : '') + source.slice(start, start + 190).trim() + (start + 190 < source.length ? '…' : '');
  }

  function searchDocuments(documents, query) {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return documents.map((entry) => {
      const title = normalize(entry.title);
      const section = normalize(entry.section);
      const text = normalize(entry.searchText || entry.text);
      let score = 0;
      for (const term of terms) {
        if (!text.includes(term)) return null;
        if (title.includes(term)) score += 8;
        if (section.includes(term)) score += 4;
        if (text.startsWith(term)) score += 2;
        score += Math.max(0, 1 - (text.indexOf(term) / Math.max(text.length, 1)));
      }
      return { entry, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title)).map((item) => item.entry);
  }

  function setupSearch(sidebar, resourcePromise) {
    const form = sidebar.querySelector('[data-docs-search]');
    const input = form.querySelector('input');
    const clear = form.querySelector('.docs-search__clear');
    const status = form.querySelector('.docs-search__status');
    const results = sidebar.querySelector('.docs-search-results');
    const tree = sidebar.querySelector('.docs-sidebar__tree');
    let documents = [];
    let activeIndex = -1;
    let loaded = false;
    let failed = false;
    let latestResults = [];

    const setStatus = (message, state) => {
      status.textContent = message || '';
      status.dataset.state = state || 'idle';
    };
    const setActive = (index) => {
      activeIndex = index;
      results.querySelectorAll('[role="option"]').forEach((node, nodeIndex) => node.setAttribute('aria-selected', String(nodeIndex === index)));
      const active = activeIndex >= 0 ? results.querySelectorAll('[role="option"]')[activeIndex] : null;
      input.setAttribute('aria-activedescendant', active ? active.id : '');
      active?.scrollIntoView({ block: 'nearest' });
    };
    const clearSearch = () => {
      input.value = '';
      activeIndex = -1;
      latestResults = [];
      input.removeAttribute('aria-activedescendant');
      input.setAttribute('aria-expanded', 'false');
      clear.hidden = true;
      results.hidden = true;
      tree.hidden = false;
      setStatus('', 'idle');
      input.focus();
    };
    const render = () => {
      const query = input.value.trim();
      clear.hidden = !query;
      if (!query) {
        results.hidden = true;
        tree.hidden = false;
        input.setAttribute('aria-expanded', 'false');
        setStatus('', 'idle');
        return;
      }
      tree.hidden = true;
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (!loaded && !failed) {
        results.innerHTML = '<p class="docs-search-empty">' + esc(docsText('docs.loadingSearchIndex', 'Loading search index…')) + '</p>';
        setStatus(docsText('docs.loadingSearchStatus', 'Loading search index.'), 'warning');
        return;
      }
      if (failed) {
        results.innerHTML = '<p class="docs-search-error">' + esc(docsText('docs.searchDataError', 'Search data could not be loaded. Reload the page or use the section links.')) + '</p>';
        setStatus(docsText('docs.searchUnavailable', 'Search unavailable.'), 'error');
        return;
      }
      latestResults = searchDocuments(documents, query).slice(0, 24);
      activeIndex = -1;
      if (!latestResults.length) {
        results.innerHTML = '<p class="docs-search-empty">' + esc(docsText('docs.noPagesMatch', 'No pages match that search.')) + '</p>';
        setStatus(docsText('docs.noResults', 'No results.'), 'idle');
        return;
      }
      const terms = query.split(/\s+/).filter(Boolean);
      results.innerHTML = '';
      latestResults.forEach((entry, index) => {
        const link = document.createElement('a');
        link.className = 'docs-search-result';
        link.dataset.docsComponent = 'SearchResult';
        link.id = 'docs-search-result-' + index;
        link.href = docUrl(entry.url);
        link.setAttribute('role', 'option');
        link.setAttribute('aria-selected', 'false');
        const title = document.createElement('span');
        title.className = 'docs-search-result__title';
        setNodeTextWithHighlights(title, entry.title, terms);
        const meta = document.createElement('span');
        meta.className = 'docs-search-result__meta';
        setNodeTextWithHighlights(meta, entry.section || config.label, terms);
        const excerpt = document.createElement('span');
        excerpt.className = 'docs-search-result__excerpt';
        setNodeTextWithHighlights(excerpt, excerptFor(entry, terms), terms);
        link.append(title, meta, excerpt);
        results.appendChild(link);
      });
      setStatus(docsText(latestResults.length === 1 ? 'docs.resultOne' : 'docs.resultMany', latestResults.length === 1 ? '{n} result.' : '{n} results.', { n: latestResults.length }), 'idle');
    };

    input.addEventListener('input', render);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { event.preventDefault(); clearSearch(); return; }
      if (event.key === 'ArrowDown' && latestResults.length) { event.preventDefault(); setActive(Math.min(activeIndex + 1, latestResults.length - 1)); return; }
      if (event.key === 'ArrowUp' && latestResults.length) { event.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); return; }
      if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        const active = results.querySelectorAll('[role="option"]')[activeIndex];
        if (active) window.location.href = active.href;
      }
    });
    clear.addEventListener('click', clearSearch);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (activeIndex < 0 && latestResults[0]) window.location.href = docUrl(latestResults[0].url);
    });

    resourcePromise.then((data) => {
      documents = Array.isArray(data?.documents) ? data.documents : [];
      loaded = true;
      setStatus('', 'idle');
      if (input.value.trim()) render();
    }).catch(() => {
      failed = true;
      loaded = true;
      if (input.value.trim()) render();
      else setStatus('', 'idle');
    });
  }

  function slugify(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  }

  function addScaffolding(sidebar) {
    const main = document.querySelector('.docs-main');
    if (!main || main.dataset.vozenScaffold === 'ready') return;
    main.dataset.vozenScaffold = 'ready';
    main.querySelectorAll('.docs-visual').forEach((node) => node.setAttribute('data-docs-component', 'AnnotatedScreenshot'));
    main.querySelectorAll('.docs-step-grid').forEach((node) => node.setAttribute('data-docs-component', 'ChangeTrace'));
    main.querySelectorAll('.docs-failure-gallery').forEach((node) => node.setAttribute('data-docs-component', 'FailureGallery'));
    main.querySelectorAll('.docs-command-details').forEach((node) => node.setAttribute('data-docs-component', 'CommandTabs'));
    const h1 = main.querySelector('h1');
    if (!h1) return;
    if (!main.querySelector('.docs-breadcrumbs')) {
      const breadcrumb = document.createElement('nav');
      breadcrumb.className = 'docs-breadcrumbs';
      breadcrumb.setAttribute('aria-label', docsText('docs.breadcrumb', 'Breadcrumb'));
      breadcrumb.innerHTML = '<a href="' + esc(new URL('index.html', config.root).href) + '">' + esc(config.label) + ' docs</a><span aria-hidden="true">/</span><span>' + esc(h1.textContent.trim()) + '</span>';
      main.insertBefore(breadcrumb, main.firstChild);
    }
    const headings = [...main.querySelectorAll('h2')].filter((node) => node.textContent.trim());
    if (headings.length > 2 && !main.querySelector('.docs-local-toc')) {
      const toc = document.createElement('nav');
      toc.className = 'docs-local-toc';
      toc.setAttribute('aria-label', docsText('docs.onThisPage', 'On this page'));
      toc.innerHTML = '<strong>' + esc(docsText('docs.onThisPage', 'On this page')) + '</strong><ul>' + headings.map((heading) => {
        if (!heading.id) heading.id = slugify(heading.textContent);
        return '<li><a href="#' + esc(heading.id) + '">' + esc(heading.textContent.trim()) + '</a></li>';
      }).join('') + '</ul>';
      let tocAnchor = headings[0];
      while (tocAnchor.parentElement && tocAnchor.parentElement !== main) tocAnchor = tocAnchor.parentElement;
      if (tocAnchor.parentElement === main) main.insertBefore(toc, tocAnchor);
      else main.appendChild(toc);
    }
    const links = [...sidebar.querySelectorAll('.docs-sidebar__links a')];
    const currentIndex = links.findIndex((link) => link.getAttribute('aria-current') === 'page');
    if (product !== 'docs' && currentIndex >= 0 && !main.querySelector('.docs-pager')) {
      const pager = document.createElement('nav');
      pager.className = 'docs-pager';
      pager.setAttribute('aria-label', docsText('docs.navigation', 'Documentation navigation'));
      const previous = links[currentIndex - 1];
      const next = links[currentIndex + 1];
      pager.innerHTML = (previous ? '<a href="' + esc(previous.href) + '"><small>' + esc(docsText('docs.previous', 'Previous')) + '</small><strong>← ' + esc(previous.textContent.trim()) + '</strong></a>' : '<span></span>') + (next ? '<a class="next" href="' + esc(next.href) + '"><small>' + esc(docsText('docs.next', 'Next')) + '</small><strong>' + esc(next.textContent.trim()) + ' →</strong></a>' : '<span></span>');
      main.appendChild(pager);
    }
  }

  function translateLegacyChrome() {
    const locale = docsLocale();
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (key) node.textContent = docsText(key, node.textContent);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      const key = node.getAttribute('data-i18n-aria-label');
      if (key) node.setAttribute('aria-label', docsText(key, node.getAttribute('aria-label')));
    });
    const skip = document.querySelector('.skip-link');
    if (skip) skip.textContent = docsText('docs.home.skip', docsText('common.skipToContent', 'Skip to content'));
    document.querySelectorAll('.docs-footer a').forEach((link) => {
      const path = String(link.getAttribute('href') || '').toLowerCase();
      if (path.includes('privacy')) link.textContent = docsText('foot.privacy', 'Privacy');
      if (path.includes('terms')) link.textContent = docsText('foot.terms', 'Terms');
    });
  }

  async function boot() {
    normalisePublicIndexAddress();
    normalisePublicIndexLinks();
    ensureCurrentShellStyles();
    // Docs pages are static documents, so they do not load the main-site
    // runtime. Load the shared catalogue here as well; this keeps the docs
    // shell, search controls and ecosystem header on the same locale contract.
    await loadScript(new URL('js/i18n-v41.js?v=docs-shell-v1', siteRoot))
      .then(() => loadScript(new URL('js/i18n-v42.js?v=docs-shell-v1', siteRoot)))
      .catch(() => undefined);
    translateLegacyChrome();
    installEcosystemNav();
    document.body.dataset.vozenDocsShell = 'ready';
    document.body.classList.add('docs-shell-active');
    const topbar = createTopbar();
    const sidebar = createSidebar(topbar);
    const resources = product === 'docs' ? Promise.resolve({ search: null, nav: null }) : Promise.all([loadScript(config.search), loadScript(config.nav)]).then(() => ({
      search: globalThis.VOZEN_DOCS_SEARCH?.[product] || null,
      nav: globalThis.VOZEN_DOCS_NAV?.[product] || null
    }));
    resources.then(({ nav }) => renderGroups(sidebar, normaliseGroups(nav))).catch(() => renderGroups(sidebar, normaliseGroups(null)));
    if (product !== 'docs') setupSearch(sidebar, resources.then(({ search }) => search || { documents: [] }));
    resources.then(() => addScaffolding(sidebar), () => addScaffolding(sidebar));
  }

  window.addEventListener('vozen:languagechange', () => {
    if (document.body.dataset.vozenDocsShell === 'ready') window.location.reload();
  });
  boot();
})();
