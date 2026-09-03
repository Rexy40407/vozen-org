/* Shared header markup so every public Vozen surface has the same navigation. */
(function () {
  "use strict";

  const hosts = document.querySelectorAll("[data-vozen-nav]");
  const AUTH_CHANNEL_NAME = "vozen.ecosystem.auth.v1";
  const AUTH_REV_KEY = "vozen.ecosystem.authrev";
  const AUTH_EXP_KEY = "vozen.ecosystem.authexp";
  const AUTH_STORE_KEY = "vozen.ecosystem.auth.v2";
  const AUTH_MAX_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const OAUTH_CLIENT_ID = String(window.VOZEN_ECOSYSTEM_OAUTH?.clientId || "").trim();
  const navLocale = () => {
    try {
      const routeLocale = document.documentElement.dataset.vozenLocale;
      if (window.VOZEN_I18N && window.VOZEN_I18N[routeLocale]) return routeLocale;
      const value = localStorage.getItem("vozen.lang") || "en";
      return window.VOZEN_I18N && window.VOZEN_I18N[value] ? value : "en";
    } catch (_) {
      return "en";
    }
  };
  const navText = (key, fallback) => {
    const dictionary = window.VOZEN_I18N || {};
    return dictionary[navLocale()]?.[key] || dictionary.en?.[key] || fallback || key;
  };
  const NAV_LANGUAGES = [
    ["en", "🇬🇧", "English"],
    ["pt", "🇵🇹", "Português"],
    ["fr", "🇫🇷", "Français"],
    ["es", "🇪🇸", "Español"],
    ["de", "🇩🇪", "Deutsch"],
    ["tr", "🇹🇷", "Türkçe"],
    ["ar", "🇸🇦", "العربية"],
    ["zh", "🇹🇼", "繁體中文"],
    ["ru", "🇷🇺", "Русский"],
    ["ko", "🇰🇷", "한국어"],
  ];
  const HTML_LANGUAGES = { pt: "pt-PT", zh: "zh-Hant" };
  const setNavLocale = (value) => {
    const locale = NAV_LANGUAGES.some(([code]) => code === value) ? value : "en";
    try { localStorage.setItem("vozen.lang", locale); } catch (_) {}
    document.documentElement.lang = HTML_LANGUAGES[locale] || locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    window.dispatchEvent(new CustomEvent("vozen:languagechange", { detail: { language: locale } }));
  };
  const renderDocsLanguageOptions = () => NAV_LANGUAGES.map(([code, flag, name]) =>
    `<li role="option" aria-selected="false"><button class="docs-ecosystem-nav__language-option" type="button" data-language="${code}"><span class="docs-ecosystem-nav__language-flag" aria-hidden="true">${flag}</span><span class="docs-ecosystem-nav__language-option-name">${escapeHtml(name)}</span><span class="docs-ecosystem-nav__language-check" aria-hidden="true">✓</span></button></li>`).join("");
  const syncDocsLanguageMenus = () => {
    const current = navLocale();
    const selected = NAV_LANGUAGES.find(([code]) => code === current) || NAV_LANGUAGES[0];
    document.querySelectorAll("[data-vozen-docs-language-menu]").forEach((menu) => {
      const button = menu.querySelector("[data-vozen-docs-language-button]");
      const panel = menu.querySelector("[data-vozen-docs-language-panel]");
      const flag = button?.querySelector(".docs-ecosystem-nav__language-flag");
      const name = button?.querySelector(".docs-ecosystem-nav__language-name");
      if (flag) flag.textContent = selected[1];
      if (name) name.textContent = selected[2];
      button?.setAttribute("aria-label", navText("ecosystem.siteLanguage", "Site language"));
      panel?.setAttribute("aria-label", navText("ecosystem.chooseLanguage", "Choose language"));
      menu.querySelectorAll("[data-language]").forEach((option) => {
        const active = option.getAttribute("data-language") === current;
        option.classList.toggle("is-active", active);
        option.closest('[role="option"]')?.setAttribute("aria-selected", String(active));
      });
    });
  };
  const applyNavTranslations = () => {
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (!key) return;
      const value = navText(key, element.textContent);
      if (element.textContent !== value) element.textContent = value;
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.getAttribute("data-i18n-aria-label");
      if (!key) return;
      const value = navText(key, element.getAttribute("aria-label"));
      if (element.getAttribute("aria-label") !== value) element.setAttribute("aria-label", value);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      const key = element.getAttribute("data-i18n-title");
      if (!key) return;
      const value = navText(key, element.getAttribute("title"));
      if (element.getAttribute("title") !== value) element.setAttribute("title", value);
    });
    syncDocsLanguageMenus();
  };
  window.addEventListener("vozen:i18nready", applyNavTranslations);
  window.addEventListener("vozen:languagechange", applyNavTranslations);
  const readSession = (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch (_) {
      return null;
    }
  };
  const writeSession = (key, value) => {
    try {
      if (value == null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch (_) {}
  };
  const validToken = (value) => typeof value === "string" && /^[A-Za-z0-9._~-]{20,4096}$/.test(value);
  const clearPersistentAuth = () => {
    try { localStorage.removeItem(AUTH_STORE_KEY); } catch (_) {}
  };
  const readPersistentAuth = () => {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_STORE_KEY) || "null");
      const valid = auth
        && auth.version === 2
        && OAUTH_CLIENT_ID
        && auth.clientId === OAUTH_CLIENT_ID
        && validToken(auth.token)
        && Number.isSafeInteger(auth.revision)
        && auth.revision > 0
        && Number.isFinite(auth.expiresAt)
        && auth.expiresAt > Date.now()
        && auth.expiresAt <= Date.now() + AUTH_MAX_TTL_MS;
      if (!valid) {
        clearPersistentAuth();
        return null;
      }
      return auth;
    } catch (_) {
      clearPersistentAuth();
      return null;
    }
  };
  const persistAuth = (token, revision, expiresAt, nav) => {
    if (!validToken(token) || !Number.isSafeInteger(revision) || revision <= 0) return;
    try {
      localStorage.setItem(AUTH_STORE_KEY, JSON.stringify({
        version: 2,
        clientId: OAUTH_CLIENT_ID,
        token,
        revision,
        expiresAt,
        nav: typeof nav === "string" ? nav : null,
      }));
    } catch (_) {}
  };
  const restorePersistentAuth = () => {
    if (readSession("vozen.ecosystem.dtoken")) return;
    const auth = readPersistentAuth();
    if (!auth) return;
    writeSession("vozen.ecosystem.dtoken", auth.token);
    writeSession(AUTH_REV_KEY, String(auth.revision));
    writeSession(AUTH_EXP_KEY, String(auth.expiresAt));
    if (typeof auth.nav === "string") writeSession("vozen.navuser", auth.nav);
  };
  restorePersistentAuth();
  const currentAuthRevision = () => {
    const revision = Number(readSession(AUTH_REV_KEY));
    return Number.isSafeInteger(revision) && revision > 0 ? revision : 0;
  };
  const hasOAuthResponseHash = () => {
    if (!location.hash || location.hash.length < 2) return false;
    const params = new URLSearchParams(location.hash.slice(1));
    return params.has("access_token") || params.has("error") || params.has("state");
  };
  const cachedAccount = () => {
    try {
      if (!readSession("vozen.ecosystem.dtoken")) return null;
      const raw = readSession("vozen.navuser");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.user && typeof parsed.user.username === "string" ? parsed.user : null;
    } catch (_) {
      return null;
    }
  };
  const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
  const ukFlag = String.fromCodePoint(0x1f1ec, 0x1f1e7);
  const discordDecorationAsset = (account) => {
    const asset = account.avatarDecorationAsset
      || account.avatar_decoration_asset
      || account.avatarDecorationData?.asset
      || account.avatar_decoration_data?.asset
      || "";
    return /^[A-Za-z0-9_]{1,128}$/.test(String(asset)) ? String(asset) : "";
  };
  const discordAvatarMarkup = (account) => {
    const initial = escapeHtml(account.username.trim().slice(0, 1).toUpperCase() || "V");
    const id = String(account.id || "");
    const avatar = String(account.avatar || "");
    const validId = /^\d{16,22}$/.test(id);
    const validAvatar = /^(?:a_)?[A-Za-z0-9_]{1,128}$/.test(avatar);

    if (!validId || !validAvatar) {
      return `<span class="docs-ecosystem-nav__account-mark docs-ecosystem-nav__account-mark--fallback" aria-hidden="true">${initial}</span>`;
    }

    const extension = avatar.startsWith("a_") ? "gif" : "png";
    const image = `<img class="docs-ecosystem-nav__account-avatar" src="https://cdn.discordapp.com/avatars/${escapeHtml(id)}/${escapeHtml(avatar)}.${extension}?size=96" alt="" aria-hidden="true" width="24" height="24" referrerpolicy="no-referrer">`;
    const decoration = discordDecorationAsset(account);
    if (!decoration) return image;
    return `<span class="docs-ecosystem-nav__account-avatar-wrap" aria-hidden="true">${image}<img class="docs-ecosystem-nav__account-decoration" src="https://cdn.discordapp.com/avatar-decoration-presets/${escapeHtml(decoration)}.png?size=96" alt="" width="32" height="32" referrerpolicy="no-referrer"></span>`;
  };
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
    const localeRoot = host.dataset.navLocaleRoot || "";
    const current = host.dataset.navCurrent || "";
    const product = host.dataset.navProduct || "Vozen";
    const docsSurface = host.dataset.navSurface === "docs";
    const link = (target) => {
      if (localeRoot && (!target || target === 'tts/' || target === 'helper/')) {
        return `${localeRoot}${target || ''}`;
      }
      return target ? `${root}${target}` : (root || './');
    };
    const currentClass = (name) => current === name ? " is-current" : "";
    const currentAria = (name) => current === name ? ' aria-current="page"' : "";
    const productLabel = product === "Ecosystem" ? navText("ecosystem.label", product) : product;

    // Documentation has its own shell and typography.  Keep this header
    // deliberately namespaced so public-site navigation rules can never
    // resize or overlap the Docs navigation beneath it.
    if (docsSurface) {
      host.outerHTML = `<header class="docs-ecosystem-nav">
        <div class="docs-ecosystem-nav__inner">
          <a class="docs-ecosystem-nav__brand" href="${link('')}" aria-label="Vozen ecosystem home" data-i18n-aria-label="ecosystem.homeAria">
            <span class="docs-ecosystem-nav__mark" aria-hidden="true"><img src="${link('favicon.svg')}" alt="" width="40" height="40" /></span>
            <span class="docs-ecosystem-nav__word">Vozen</span>
            <span class="docs-ecosystem-nav__product" data-i18n="ecosystem.label">${escapeHtml(productLabel)}</span>
          </a>
          <nav class="docs-ecosystem-nav__links" aria-label="Vozen products" data-i18n-aria-label="ecosystem.productsAria">
            <a class="${currentClass('tts').trim()}" href="${link('tts/')}"${currentAria('tts')} data-i18n="ecosystem.tts">Vozen TTS</a>
            <a class="${currentClass('helper').trim()}" href="${link('helper/')}"${currentAria('helper')} data-i18n="ecosystem.helper">Vozen Helper</a>
            <a class="${currentClass('docs').trim()}" href="${link('docs/')}"${currentAria('docs')} data-i18n="ecosystem.docs">Docs</a>
            <a class="${currentClass('commands').trim()}" href="${link('commands/')}"${currentAria('commands')} data-i18n="ecosystem.commands">Commands</a>
            <span class="docs-ecosystem-nav__premium-disabled" aria-disabled="true" title="Premium is temporarily unavailable" data-i18n-title="ecosystem.premiumUnavailable" data-i18n="nav.premium">Premium</span>
          </nav>
          <div class="docs-ecosystem-nav__actions">
            <a class="docs-ecosystem-nav__github" href="https://github.com/Rexy40407/vozen" target="_blank" rel="noopener noreferrer" aria-label="Vozen on GitHub" data-i18n-aria-label="ecosystem.githubAria">${githubIcon}</a>
            <div class="docs-ecosystem-nav__language" data-vozen-docs-language-menu>
              <button class="docs-ecosystem-nav__language-button" type="button" data-vozen-docs-language-button aria-haspopup="listbox" aria-expanded="false" aria-label="Site language">
                <span class="docs-ecosystem-nav__language-flag" aria-hidden="true">${ukFlag}</span><span class="docs-ecosystem-nav__language-name">English</span>
                <svg class="docs-ecosystem-nav__language-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              <ul class="docs-ecosystem-nav__language-panel" data-vozen-docs-language-panel role="listbox" tabindex="-1" aria-label="Choose language">${renderDocsLanguageOptions()}</ul>
            </div>
            <a class="docs-ecosystem-nav__login" data-vozen-docs-login href="${link('account.html')}">${discordIcon}<span data-i18n="ecosystem.login">Log in</span></a>
          </div>
        </div>
      </header>`;
      return;
    }

    host.outerHTML = `<header class="nav vozen-global-nav" id="nav">
      <div class="wrap nav__inner">
        <a class="brand" href="${link('')}" aria-label="Vozen ecosystem home" data-i18n-aria-label="ecosystem.homeAria">
          <span class="brand__mark" aria-hidden="true"><img class="brand__portal" src="${link('favicon.svg')}" alt="" width="40" height="40" /></span>
          <span class="brand__word">Vozen</span>
          <span class="nav__product"${product === "Ecosystem" ? ' data-i18n="ecosystem.label"' : ""}>${escapeHtml(productLabel)}</span>
        </a>
        <nav class="nav__links" aria-label="Primary" data-i18n-aria-label="ecosystem.productsAria">
          <a class="${currentClass('tts').trim()}" href="${link('tts/')}"${currentAria('tts')} data-i18n="ecosystem.tts">Vozen TTS</a>
          <a class="${currentClass('helper').trim()}" href="${link('helper/')}"${currentAria('helper')} data-i18n="ecosystem.helper">Vozen Helper</a>
          <a class="${currentClass('docs').trim()}" href="${link('docs/')}"${currentAria('docs')} data-i18n="ecosystem.docs">Docs</a>
          <a class="${currentClass('commands').trim()}" href="${link('commands/')}"${currentAria('commands')} data-i18n="ecosystem.commands">Commands</a>
          <span class="nav__premium-disabled" aria-disabled="true" title="Premium is temporarily unavailable" data-i18n-title="ecosystem.premiumUnavailable" data-i18n="nav.premium">Premium</span>
        </nav>
        <div class="nav__actions">
          <a class="nav__gh" href="https://github.com/Rexy40407/vozen" target="_blank" rel="noopener" aria-label="Vozen on GitHub (open source)" data-i18n-aria-label="common.githubLabel" title="Open source on GitHub" data-i18n-title="common.githubTitle">${githubIcon}</a>
          <div class="lang" id="langMenu">
            <button class="lang__btn" id="langBtn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Site language" data-i18n-aria-label="ecosystem.siteLanguage">
              <span class="lang__flag" id="langBtnFlag">${ukFlag}</span><span class="lang__name" id="langBtnName">English</span>
              <svg class="lang__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <ul class="lang__panel" id="langPanel" role="listbox" tabindex="-1" aria-label="Choose language" data-i18n-aria-label="ecosystem.chooseLanguage"></ul>
          </div>
          <button class="btn btn--primary btn--discord-cta btn--sm nav__login" id="navLogin" type="button">${discordIcon}<span data-i18n="ecosystem.login">Log in</span></button>
          <button class="nav__burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
        </div>
      </div>
    </header>`;
  });
  document.querySelectorAll("[data-vozen-docs-language-menu]").forEach((menu) => {
    const button = menu.querySelector("[data-vozen-docs-language-button]");
    const panel = menu.querySelector("[data-vozen-docs-language-panel]");
    const close = () => {
      menu.classList.remove("is-open");
      button?.setAttribute("aria-expanded", "false");
    };
    button?.addEventListener("click", () => {
      const open = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
    });
    panel?.addEventListener("click", (event) => {
      const option = event.target.closest("[data-language]");
      if (!option) return;
      setNavLocale(option.getAttribute("data-language"));
      close();
      button?.focus();
    });
    document.addEventListener("pointerdown", (event) => {
      if (!menu.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        close();
        button?.focus();
      }
    });
  });
  syncDocsLanguageMenus();

  const renderDocsAccount = () => {
    const account = cachedAccount();
    document.querySelectorAll("[data-vozen-docs-login]").forEach((link) => {
      if (!account) {
        link.classList.remove("docs-ecosystem-nav__login--account");
        link.removeAttribute("aria-label");
        link.innerHTML = `${discordIcon}<span data-i18n="ecosystem.login">${navText("ecosystem.login", "Log in")}</span>`;
        return;
      }
      const username = escapeHtml(account.username);
      link.classList.add("docs-ecosystem-nav__login--account");
      link.setAttribute("aria-label", `Open ${account.username}'s Vozen account`);
      link.innerHTML = `${discordAvatarMarkup(account)}<span>${username}</span>`;
    });
  };
  renderDocsAccount();
  if (typeof BroadcastChannel === "function") {
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.addEventListener("message", (event) => {
        const message = event.data;
        if (!message || typeof message.type !== "string") return;
        if (
          message.type === "session" &&
          typeof message.token === "string" &&
          Number.isSafeInteger(message.revision) &&
          message.revision > 0 &&
          message.revision >= currentAuthRevision() &&
          !hasOAuthResponseHash()
        ) {
          writeSession("vozen.ecosystem.dtoken", message.token);
          writeSession(AUTH_REV_KEY, String(message.revision));
          const expiresAt = Number(message.expiresAt);
          if (Number.isFinite(expiresAt) && expiresAt > Date.now()) writeSession(AUTH_EXP_KEY, String(expiresAt));
          if (typeof message.nav === "string") writeSession("vozen.navuser", message.nav);
          if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
            persistAuth(message.token, message.revision, expiresAt, message.nav);
          }
        } else if (
          message.type === "profile" &&
          Number.isSafeInteger(message.revision) &&
          message.revision > 0 &&
          message.revision >= currentAuthRevision()
        ) {
          writeSession("vozen.navuser", typeof message.nav === "string" ? message.nav : null);
          const token = readSession("vozen.ecosystem.dtoken");
          const expiresAt = Number(readSession(AUTH_EXP_KEY));
          if (token && Number.isFinite(expiresAt) && expiresAt > Date.now()) {
            persistAuth(token, currentAuthRevision(), expiresAt, message.nav);
          }
        } else if (
          message.type === "logout" &&
          Number.isSafeInteger(message.revision) &&
          message.revision > 0 &&
          message.revision >= currentAuthRevision()
        ) {
          writeSession("vozen.ecosystem.dtoken", null);
          writeSession("vozen.navuser", null);
          writeSession(AUTH_EXP_KEY, null);
          writeSession(AUTH_REV_KEY, String(message.revision));
          clearPersistentAuth();
        }
        renderDocsAccount();
      });
      if (!readSession("vozen.ecosystem.dtoken") && !hasOAuthResponseHash()) {
        channel.postMessage({ type: "request" });
      }
    } catch (_) {}
  }
  window.setTimeout(applyNavTranslations, 0);
})();
