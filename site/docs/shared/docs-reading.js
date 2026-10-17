(function () {
  'use strict';

  const bound = new WeakSet();
  const slug = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';

  function sectionsFor(main) {
    const visual = main.querySelector('[data-docs-visual-guide]');
    if (visual && !visual.id) visual.id = 'visual-example';
    const headings = [...main.querySelectorAll('h2, details.docs-reference-details > summary, [data-docs-visual-guide]')]
      .filter(node => node === visual || (node.textContent.trim() && (node.tagName === 'SUMMARY' || (!node.closest('details') && !node.closest('a') && !node.querySelector('a:not(.docs-heading-link)')))));
    return headings.map(node => {
      const label = node === visual ? 'Example' : node.textContent.trim();
      if (!node.id) {
        const base = slug(label);
        let candidate = base, suffix = 2;
        while (document.getElementById(candidate)) candidate = base + '-' + suffix++;
        node.id = candidate;
      }
      return { node, label, id: node.id };
    });
  }

  function makeSectionLinks(sections, className) {
    const list = document.createElement('ul');
    list.className = className;
    for (const section of sections) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#' + section.id;
      link.dataset.docsSectionLink = '';
      link.textContent = section.label;
      item.appendChild(link);
      list.appendChild(item);
    }
    return list;
  }

  function revealSection(hash, focus) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (_) { return; }
    const target = document.getElementById(id);
    if (!target || !target.closest('.docs-main')) return;
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (focus) {
        if (!target.matches('summary, a, button, input')) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    });
  }

  function bindSectionNavigation(root) {
    root.addEventListener('click', event => {
      const link = event.target.closest('[data-docs-section-link]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const hash = new URL(link.href).hash;
      if (window.location.hash !== hash) window.history.pushState(null, '', hash);
      revealSection(hash, true);
    });
  }

  function enhanceMedia(main) {
    main.querySelectorAll('[data-docs-media-tabs]').forEach(tabs => {
      if (bound.has(tabs)) return;
      bound.add(tabs);
      const figure = tabs.closest('[data-docs-visual-guide]');
      const image = figure.querySelector('[data-docs-image-panel]');
      const walkthrough = figure.querySelector('[data-docs-video-panel]');
      const disclosure = walkthrough.querySelector('details');
      const video = walkthrough.querySelector('video');
      const buttons = [...tabs.querySelectorAll('[role="tab"]')];
      const select = index => {
        const source = image.querySelector('picture source');
        video.poster = source && window.matchMedia(source.media).matches ? source.srcset : image.querySelector('img').src;
        buttons.forEach((button, i) => {
          button.setAttribute('aria-selected', String(i === index));
          button.tabIndex = i === index ? 0 : -1;
        });
        image.hidden = index !== 0;
        walkthrough.hidden = index !== 1;
        disclosure.open = index === 1;
        if (index === 0) video.pause();
      };
      for (const [index, button] of buttons.entries()) {
        button.addEventListener('click', () => select(index));
        button.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
          select(next);
          buttons[next].focus();
        });
      }
      image.setAttribute('role', 'tabpanel');
      image.setAttribute('aria-labelledby', buttons[0].id);
      walkthrough.setAttribute('role', 'tabpanel');
      walkthrough.setAttribute('aria-labelledby', buttons[1].id);
      figure.classList.add('docs-media-tabs-ready');
      tabs.hidden = false;
      select(0);
    });
  }

  function enhanceCode(main) {
    main.querySelectorAll('pre').forEach(pre => {
      if (bound.has(pre)) return;
      const code = pre.querySelector('code');
      if (!code || !code.textContent.trim()) return;
      bound.add(pre);
      pre.querySelector('.docs-copy-command')?.remove();
      const button = document.createElement('button');
      button.className = 'docs-copy-command';
      button.type = 'button';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy example');
      const status = document.createElement('span');
      status.className = 'sr-only docs-copy-status';
      status.setAttribute('role', 'status');
      pre.querySelector('.docs-copy-status')?.remove();
      pre.append(button, status);
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await navigator.clipboard.writeText(code.textContent);
          status.textContent = 'Example copied.';
          button.textContent = 'Copied';
        } catch (_) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(code);
          selection.removeAllRanges();
          selection.addRange(range);
          status.textContent = 'Clipboard unavailable. The example is selected; copy it manually.';
          button.textContent = 'Select';
        } finally {
          button.disabled = false;
          window.setTimeout(() => { button.textContent = 'Copy'; }, 1800);
        }
      });
    });
  }

  function enhance(main, sidebar) {
    if (!main || !sidebar || bound.has(main)) return;
    bound.add(main);
    main.querySelector('.docs-local-toc')?.remove();
    sidebar.querySelector('.docs-current-sections')?.remove();
    if (main.classList.contains('docs-overview')) {
      main.querySelectorAll('.docs-heading-link').forEach(link => link.remove());
      delete main.dataset.docsSectionNav;
      enhanceMedia(main);
      main.dataset.docsReadingTools = 'ready';
      return;
    }
    const sections = sectionsFor(main);
    if (sections.length > 1) {
      const toc = document.createElement('nav');
      toc.className = 'docs-local-toc';
      toc.setAttribute('aria-label', 'On this page');
      const disclosure = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'On this page';
      disclosure.append(summary, makeSectionLinks(sections, 'docs-section-links'));
      toc.appendChild(disclosure);
      let intro = main.querySelector('h1');
      while (intro?.parentElement && intro.parentElement !== main) intro = intro.parentElement;
      while (intro?.nextElementSibling?.matches('p, .lede, .status-row, .notice, .docs-callout')) intro = intro.nextElementSibling;
      if (intro) intro.after(toc);
      else main.prepend(toc);
      const active = sidebar.querySelector('.docs-sidebar__links > a[aria-current="page"]');
      if (active) {
        const localNav = document.createElement('nav');
        localNav.className = 'docs-current-sections';
        localNav.setAttribute('aria-label', 'Sections on this page');
        localNav.appendChild(makeSectionLinks(sections, 'docs-section-links'));
        active.after(localNav);
        main.dataset.docsSectionNav = 'true';
      }
    }
    for (const { node, id, label } of sections) {
      if (node.tagName !== 'H2' || node.closest('a') || node.querySelector('a')) continue;
      const anchor = document.createElement('a');
      anchor.href = '#' + id;
      anchor.dataset.docsSectionLink = '';
      anchor.className = 'docs-heading-link';
      anchor.setAttribute('aria-label', 'Link to ' + label);
      anchor.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 3-2 18M17 3l-2 18M3 9h18M2 15h18"/></svg>';
      node.appendChild(anchor);
    }
    main.querySelectorAll('table').forEach(table => {
      let wrapper = table.parentElement;
      if (!wrapper.classList.contains('docs-table-scroll')) {
        wrapper = document.createElement('div');
        wrapper.className = 'docs-table-scroll';
        table.before(wrapper);
        wrapper.appendChild(table);
      }
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', 'Reference table, scroll horizontally for more columns');
      if (!wrapper.nextElementSibling?.classList.contains('docs-table-hint')) {
        const hint = document.createElement('p');
        hint.className = 'docs-table-hint';
        hint.textContent = 'Scroll horizontally to view all columns →';
        wrapper.after(hint);
      }
    });
    enhanceMedia(main);
    enhanceCode(main);
    bindSectionNavigation(main);
    bindSectionNavigation(sidebar);
    const revealHash = () => revealSection(window.location.hash, false);
    window.addEventListener('hashchange', revealHash);
    window.addEventListener('popstate', revealHash);
    if (window.location.hash) window.setTimeout(revealHash, 0);
    main.dataset.docsReadingTools = 'ready';
  }

  window.VozenDocsReading = { enhance, sectionsFor };
})();
