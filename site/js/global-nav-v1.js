/* Shared header markup so every public Vozen surface has the same navigation. */
(function () {
  "use strict";

  const hosts = document.querySelectorAll("[data-vozen-nav]");
  // Older public pages still contain the pre-ecosystem header in their HTML.
  // Remove it before rendering the shared shell so there is only one nav and
  // the existing page scripts keep receiving the canonical #nav element.
  if (hosts.length) {
    document.querySelectorAll("header.nav:not(.vozen-global-nav)").forEach((header) => header.remove());
  }
  const githubIcon = '<svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
  const discordIcon = '<svg viewBox="0 0 24 18" width="18" height="14" fill="currentColor" aria-hidden="true"><path d="M20.3 1.6A19.8 19.8 0 0 0 15.4.1a14 14 0 0 0-.6 1.3 18.3 18.3 0 0 0-5.5 0A13 13 0 0 0 8.6.1 19.7 19.7 0 0 0 3.7 1.6C.6 6.3-.3 10.8.2 15.3a19.9 19.9 0 0 0 6 3 14.7 14.7 0 0 0 1.3-2.1 12.9 12.9 0 0 1-2-1c.2-.1.3-.3.5-.4a14.2 14.2 0 0 0 12 0l.5.4a12.8 12.8 0 0 1-2 1 14.5 14.5 0 0 0 1.3 2.1 19.8 19.8 0 0 0 6-3c.6-5.2-.8-9.7-3.5-13.7ZM8 12.6c-1.2 0-2.1-1.1-2.1-2.4S6.8 7.8 8 7.8s2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm8 0c-1.2 0-2-1-2-2.3 0-1.24.88-2.28 2-2.28s2.02 1.04 2 2.28c0 1.26-.9 2.3-2 2.3Z"/></svg>';

  hosts.forEach((host) => {
    const root = host.dataset.navRoot || "";
    const current = host.dataset.navCurrent || "";
    const product = host.dataset.navProduct || "Vozen";
    const link = (target) => `${root}${target}`;
    const currentClass = (name) => current === name ? " is-current" : "";
    const currentAria = (name) => current === name ? ' aria-current="page"' : "";

    host.outerHTML = `<header class="nav vozen-global-nav" id="nav">
      <div class="wrap nav__inner">
        <a class="brand" href="${link('index.html')}" aria-label="Vozen ecosystem home">
          <span class="brand__mark" aria-hidden="true"><img class="brand__portal" src="${link('assets/vozen-ecosystem-icon.png')}" alt="" /></span>
          <span class="brand__word">Vozen</span>
          <span class="nav__product">${product}</span>
        </a>
        <nav class="nav__links" aria-label="Primary">
          <a class="${currentClass('tts').trim()}" href="${link('tts.html')}"${currentAria('tts')}>Vozen TTS</a>
          <a class="${currentClass('helper').trim()}" href="${link('helper.html')}"${currentAria('helper')}>Vozen Helper</a>
          <a class="${currentClass('docs').trim()}" href="${link('docs/index.html')}"${currentAria('docs')}>Docs</a>
          <a class="${currentClass('commands').trim()}" href="${link('commands/index.html')}"${currentAria('commands')}>Commands</a>
          <a class="${currentClass('premium').trim()}" href="${link('premium.html')}"${currentAria('premium')}>Premium</a>
        </nav>
        <div class="nav__actions">
          <a class="nav__gh" href="https://github.com/Rexy40407/vozen" target="_blank" rel="noopener" aria-label="Vozen on GitHub (open source)" title="Open source on GitHub">${githubIcon}</a>
          <div class="lang" id="langMenu">
            <button class="lang__btn" id="langBtn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Site language">
              <span class="lang__flag" id="langBtnFlag">🇬🇧</span><span class="lang__name" id="langBtnName">English</span>
              <svg class="lang__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <ul class="lang__panel" id="langPanel" role="listbox" tabindex="-1" aria-label="Choose language"></ul>
          </div>
          <button class="btn btn--primary btn--discord-cta btn--sm nav__login" id="navLogin" type="button">${discordIcon}<span data-i18n="nav.login">Log in</span></button>
          <button class="nav__burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
        </div>
      </div>
    </header>`;
  });
})();
