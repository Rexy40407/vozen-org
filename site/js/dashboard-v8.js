/* Vozen — dashboard web de configuração da guild.
  A conta Vozen trata do login e guarda o token OAuth no sessionStorage; as abas Vozen
  sincronizam-no em memória pelo BroadcastChannel. O dashboard usa-o apenas no pedido
  autenticado à API TTS (/api/dashboard/*). O Helper usa,
   em paralelo, o cookie HttpOnly da sessão partilhada. A autorização real
   (MANAGE_GUILD + bot presente) é no servidor.
   HUD v5: formulário agrupado por secções (Reading/Voice/Community/Limits), toggle
   switches em vez de checkboxes nativas, campo de língua (locale — a API já o aceita),
   e save com estado (só ativo quando há alterações). CSP: zero handlers inline, tudo
   por addEventListener; CSS injetado num <style> (style-src tem 'unsafe-inline'). */
(function () {
  "use strict";
  var API = "https://api.vozen.org";
  var TTS_INSTALL_START = API + "/api/install/tts/start";
  var TOK_KEY = "vozen.ecosystem.dtoken";
  var AUTH_CHANNEL_NAME = "vozen.ecosystem.auth.v1";
  var LEGACY_TOK_KEY = "vozen.dtoken";
  var LS_LANG = "vozen.lang";

  var workspaceRoot = document.getElementById("dashRoot");
  var pickerRoot = document.getElementById("dashPickerRoot");
  var pickerPage = document.getElementById("ttsPickerPage");
  var ttsWorkspace = document.getElementById("ttsWorkspace");
  var root = workspaceRoot;
  var authChannel = null;
  if (!root || !pickerRoot || !pickerPage || !ttsWorkspace) {
    var bootFallback = document.getElementById("ttsBootFallback");
    if (bootFallback) bootFallback.hidden = false;
    return;
  }

  var REQUEST_TIMEOUT_MS = 15000;

  function fetchWithTimeout(url, options, timeoutMs) {
    // Product dashboards share the ecosystem session cookie. Keep the legacy
    // bearer header optional for existing sessions, but never omit cookies.
    var requestOptions = Object.assign({ credentials: "include" }, options || {});
    var controller = typeof window.AbortController === "function" ? new window.AbortController() : null;
    var timer = null;
    if (controller) requestOptions.signal = controller.signal;
    var timeout = Number(timeoutMs) || REQUEST_TIMEOUT_MS;
    var request = window.fetch(url, requestOptions);
    if (!request || typeof request.then !== "function") return request;
    timer = window.setTimeout(function () {
      if (controller) controller.abort();
    }, timeout);
    return request.then(
      function (response) {
        if (timer) window.clearTimeout(timer);
        return response;
      },
      function (error) {
        if (timer) window.clearTimeout(timer);
        throw error;
      },
    );
  }

  function showPickerShell() {
    root = pickerRoot;
    pickerPage.hidden = false;
    ttsWorkspace.hidden = true;
    document.body.classList.add("tts-picker-mode");
  }

  function showWorkspaceShell() {
    root = workspaceRoot;
    pickerPage.hidden = true;
    ttsWorkspace.hidden = false;
    document.body.classList.remove("tts-picker-mode");
  }

  // The dashboard keeps navigation client-side so existing API contracts and deep
  // links remain untouched. This small state object also gives Overview a truthful
  // summary instead of inventing usage metrics.
  var workspaceState = { guild: null, guilds: [], data: null, view: "overview", pendingView: null, dirty: false, requestSeq: 0 };
  var TTS_VIEWS = { overview: true, quick: true, reading: true, community: true, profiles: true, limits: true };

  function viewFromHash() {
    var raw = String(window.location.hash || "").replace(/^#\/?/, "");
    var name = raw.split(/[/?#]/)[0];
    return TTS_VIEWS[name] ? name : "overview";
  }

  function syncTtsHash(viewName, mode) {
    if (!mode || !window.history || !window.history.pushState) return;
    var next = viewName === "overview" ? "" : "#/" + viewName;
    if (window.location.hash === next) return;
    var url = window.location.pathname + window.location.search + next;
    if (mode === "push") window.history.pushState({ ttsView: viewName }, "", url);
    else window.history.replaceState({ ttsView: viewName }, "", url);
  }

  function setTtsView(viewName, historyMode) {
    workspaceState.view = TTS_VIEWS[viewName] ? viewName : "overview";
    syncTtsHash(workspaceState.view, historyMode);
    var buttons = document.querySelectorAll("[data-tts-view]");
    for (var i = 0; i < buttons.length; i++) {
      var active = buttons[i].getAttribute("data-tts-view") === workspaceState.view;
      if (active) buttons[i].setAttribute("aria-current", "page");
      else buttons[i].removeAttribute("aria-current");
    }
  }

  function confirmTtsDiscard() {
    if (!workspaceState.dirty) return true;
    return window.confirm(t("dashboard.unsavedConfirm"));
  }

  window.addEventListener("beforeunload", function (event) {
    if (!workspaceState.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  function renderTtsServerPicker() {
    var select = document.getElementById("ttsServerSelect");
    var add = document.getElementById("ttsSidebarAddServer");
    if (!select) return;
    var guilds = Array.isArray(workspaceState.guilds) ? workspaceState.guilds : [];
    select.innerHTML = "";
    if (!guilds.length) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = t("dashboard.noServersAvailable");
      select.appendChild(empty);
      select.disabled = true;
    } else {
      for (var i = 0; i < guilds.length; i++) {
        var guild = guilds[i] || {};
        var option = document.createElement("option");
        option.value = String(guild.id || "");
        option.textContent = String(guild.name || "Unnamed server");
        option.selected = !!workspaceState.guild && String(workspaceState.guild.id) === option.value;
        select.appendChild(option);
      }
      select.disabled = false;
    }
    if (add && add.getAttribute("data-bound") !== "true") {
      add.setAttribute("data-bound", "true");
      add.addEventListener("click", function () {
        if (!confirmTtsDiscard()) return;
        workspaceState.dirty = false;
        addServer();
      });
    }
    if (select.getAttribute("data-bound") !== "true") {
      select.setAttribute("data-bound", "true");
      select.addEventListener("change", function (event) {
        var targetId = String(event.currentTarget.value || "");
        var target = workspaceState.guilds.filter(function (guild) {
          return guild && String(guild.id) === targetId;
        })[0];
        if (!target || (workspaceState.guild && String(workspaceState.guild.id) === targetId)) {
          renderTtsServerPicker();
          return;
        }
        if (!confirmTtsDiscard()) {
          renderTtsServerPicker();
          return;
        }
        workspaceState.dirty = false;
        workspaceState.pendingView = workspaceState.view;
        loadForm(target, workspaceState.guilds);
      });
    }
  }

  function updateTtsServerLabel() {
    renderTtsServerPicker();
  }

  function boolLabel(value) {
    return value ? t("dashboard.on") : t("dashboard.off");
  }

  function renderTtsOverview() {
    if (!workspaceState.guild || !workspaceState.data || !workspaceState.data.config) {
      setTtsView("overview", false);
      renderPicker(workspaceState.guilds || []);
      return;
    }
    showWorkspaceShell();
    var cfg = workspaceState.data.config;
    var hasChannel = !!cfg.ttsChannelId;
    var voice = cfg.defaultVoice || t("dashboard.notSelected");
    var locale = cfg.locale || t("dashboard.defaultLocale");
    setTtsView("overview", false);
    view(
      '<div class="workspace-heading">' +
        '<p class="workspace-heading__eyebrow">' + esc(t("dashboard.overviewEyebrow")) + '</p>' +
        '<h1>' + esc(t("dashboard.overviewTitle")) + '</h1>' +
        '<p>' + esc(t("dashboard.overviewIntro").replace("{name}", workspaceState.guild.name)) + '</p>' +
      '</div>' +
      '<div class="workspace-overview-grid">' +
        '<section class="workspace-card workspace-checklist" aria-labelledby="ttsReadyTitle">' +
          '<div><p class="workspace-heading__eyebrow">' + esc(t("dashboard.readiness")) + '</p><h2 id="ttsReadyTitle">' + esc(t("dashboard.voiceSetup")) + '</h2></div>' +
          '<div class="workspace-checklist__item"><span class="workspace-status-dot"></span><div><strong>' + esc(t("dashboard.readingChannel")) + '</strong><span>' + esc(hasChannel ? t("dashboard.configuredReady") : t("dashboard.chooseChannelQuick")) + '</span></div></div>' +
          '<div class="workspace-checklist__item"><span class="workspace-status-dot"></span><div><strong>' + esc(t("dashboard.voice")) + '</strong><span>' + esc(voice + " · " + locale) + '</span></div></div>' +
          '<div class="workspace-checklist__item"><span class="workspace-status-dot"></span><div><strong>' + esc(t("dashboard.safety")) + '</strong><span>' + esc(t("dashboard.autoReadStatus").replace("{value}", boolLabel(cfg.autoread)) + " · " + t("dashboard.antiSpamStatus").replace("{value}", boolLabel(cfg.antispam))) + '</span></div></div>' +
          '<div><button class="workspace-button" type="button" data-tts-view="quick">' + esc(t("dashboard.continueSetup")) + ' <span aria-hidden="true">→</span></button></div>' +
        '</section>' +
        '<aside class="workspace-card workspace-card--soft workspace-checklist" aria-labelledby="ttsSummaryTitle">' +
          '<div><p class="workspace-heading__eyebrow">' + esc(t("dashboard.serverSnapshot")) + '</p><h2 id="ttsSummaryTitle">' + esc(workspaceState.guild.name) + '</h2></div>' +
          '<div class="workspace-checklist__item"><div><strong>' + esc(t("dashboard.textInVoice")) + '</strong><span>' + esc(boolLabel(cfg.textInVoice)) + '</span></div></div>' +
          '<div class="workspace-checklist__item"><div><strong>' + esc(t("dashboard.readBotMessages")) + '</strong><span>' + esc(boolLabel(cfg.readBots)) + '</span></div></div>' +
          '<div class="workspace-checklist__item"><div><strong>' + esc(t("dashboard.recording")) + '</strong><span>' + esc(t("dashboard.noRecording")) + '</span></div></div>' +
        '</aside>' +
      '</div>'
    );
    var next = root.querySelector('[data-tts-view="quick"]');
    if (next) next.addEventListener("click", function () { navigateTtsView("quick"); });
    onLang = renderTtsOverview;
  }

  function renderCurrentTtsView() {
    if (workspaceState.view === "overview") return renderTtsOverview();
    if (!workspaceState.guild || !workspaceState.data || !workspaceState.data.config) {
      renderPicker(workspaceState.guilds || []);
      return;
    }
    showWorkspaceShell();
    renderForm(workspaceState.guild, workspaceState.data.config, workspaceState.guilds, workspaceState.data, false);
  }

  function navigateTtsView(viewName) {
    var next = TTS_VIEWS[viewName] ? viewName : "overview";
    if (next !== workspaceState.view && !confirmTtsDiscard()) return;
    if (next !== workspaceState.view) workspaceState.dirty = false;
    setTtsView(next, "push");
    renderCurrentTtsView();
  }

  function bindTtsNavigation() {
    var buttons = document.querySelectorAll("[data-tts-view]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (event) {
        var viewName = event.currentTarget.getAttribute("data-tts-view") || "overview";
        navigateTtsView(viewName);
      });
    }
  }

  workspaceState.view = viewFromHash();
  window.addEventListener("popstate", function () {
    var previous = workspaceState.view;
    var next = viewFromHash();
    if (next !== previous && !confirmTtsDiscard()) {
      syncTtsHash(previous, "replace");
      return;
    }
    workspaceState.dirty = false;
    workspaceState.view = next;
    setTtsView(workspaceState.view, false);
    renderCurrentTtsView();
  });

  bindTtsNavigation();

  /* Re-localização ao vivo: main-v39 anuncia `vozen:languagechange` depois de atualizar
     texto, atributos e título. Cada vista regista aqui o seu relocalizador; no formulário
     ele atua in-place para não tocar nos inputs nem no estado por guardar. */
  var onLang = null;

  /* O bundle versionado é a única fonte de strings da homepage, conta e painel. */
  var DICT = window.VOZEN_I18N || {};
  function lang() {
    try {
      var l = localStorage.getItem(LS_LANG) || "en";
      return DICT[l] ? l : "en";
    } catch (e) {
      return "en";
    }
  }
  function t(k) {
    var l = lang();
    return (DICT[l] && DICT[l][k]) || (DICT.en && DICT.en[k]) || k;
  }

  /* Estrutura do formulário: campos agrupados por tema. A whitelist de escrita é no
     backend (DASHBOARD_FIELDS em src/premium/dashboardApi.ts) — isto é só a vista. */
  var SECTIONS = [
    { id: "reading", fields: ["autoread", "readBots", "textInVoice", "antispam", "translationEnabled"] },
    { id: "voice", fields: ["xsaid", "autojoin", "greetOnJoin", "stayInCall"] },
    { id: "community", fields: ["streakAnnounce", "soundboard", "votePromos"] },
    { id: "limits", fields: ["maxChars", "ratePerMin", "locale", "priorityRoleId", "blockedRoleId"] },
  ];
  var FIELD = {
    autoread: { type: "toggle" },
    readBots: { type: "toggle" },
    textInVoice: { type: "toggle" },
    antispam: { type: "toggle" },
    xsaid: { type: "toggle" },
    autojoin: { type: "toggle" },
    greetOnJoin: { type: "toggle" },
    streakAnnounce: { type: "toggle" },
    soundboard: { type: "toggle" },
    maxChars: { type: "num", min: 1, max: 2000 },
    ratePerMin: { type: "num", min: 1, max: 120 },
    locale: { type: "select" },
    ttsChannelId: { type: "channel" },
    defaultVoice: { type: "voice" },
    priorityRoleId: { type: "role" },
    blockedRoleId: { type: "role" },
    translationEnabled: { type: "toggle" },
    votePromos: { type: "toggle" },
    stayInCall: { type: "toggle" },
  };
  var NEW_FIELD_COPY = {
    priorityRoleId: ["Priority queue role", "Members with this role use the accessibility queue lane."],
    blockedRoleId: ["Blocked TTS role", "This restriction always wins over priority and subscriptions."],
    translationEnabled: ["Automatic translation", "Allow only the channel mappings explicitly configured for this server."],
    votePromos: ["Community reminders", "Show the opt-in Top.gg and support rotation."],
    stayInCall: ["Stay in call", "Keep the bot connected when an active Premium server is empty."],
  };
  function fieldCopy(key, description) {
    var copy = NEW_FIELD_COPY[key];
    return copy ? copy[description ? 1 : 0] : t("dashboard." + (description ? "d_" : "f_") + key);
  }

  function sectionsFor(meta) {
    var sections = SECTIONS.map(function (section) {
      return { id: section.id, fields: section.fields.slice() };
    });
    if (
      meta &&
      meta.capabilities &&
      meta.options &&
      meta.capabilities.ttsChannelId &&
      meta.capabilities.defaultVoice &&
      Array.isArray(meta.options.channels) &&
      Array.isArray(meta.options.voices)
    ) {
      var voice = sections.filter(function (section) {
        return section.id === "voice";
      })[0];
      var fields = voice.fields;
      fields.unshift("ttsChannelId", "defaultVoice");
    }
    return sections;
  }

  function eachField(sections, fn) {
    for (var s = 0; s < sections.length; s++) {
      var f = sections[s].fields;
      for (var i = 0; i < f.length; i++) fn(f[i], FIELD[f[i]]);
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function token() {
    try {
      return (
        sessionStorage.getItem(TOK_KEY) || sessionStorage.getItem(LEGACY_TOK_KEY)
      );
    } catch (e) {
      return null;
    }
  }
  function clearToken() {
    try {
      sessionStorage.removeItem(TOK_KEY);
      sessionStorage.removeItem(LEGACY_TOK_KEY);
    } catch (e) {}
    try {
      if (authChannel) authChannel.postMessage({ type: "logout" });
    } catch (e) {}
  }
  function waitForSharedSession() {
    if (token() || typeof BroadcastChannel !== "function") return Promise.resolve();
    return new Promise(function (resolve) {
      var settled = false;
      var finish = function () {
        if (settled) return;
        settled = true;
        if (authChannel) {
          try { authChannel.close(); } catch (e) {}
          authChannel = null;
        }
        resolve();
      };
      try {
        authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        authChannel.addEventListener("message", function (event) {
          var message = event.data;
          if (!message || message.type !== "session" || typeof message.token !== "string") return;
          try { sessionStorage.setItem(TOK_KEY, message.token); } catch (e) {}
          finish();
        });
        authChannel.postMessage({ type: "request" });
        window.setTimeout(finish, 250);
      } catch (e) {
        finish();
      }
    });
  }
  function authHeaders() {
    var value = token();
    return value ? { Authorization: "Bearer " + value } : {};
  }

  function ttsInstallUrl(source) {
    var url = new URL(TTS_INSTALL_START);
    url.searchParams.set("source", source);
    return url.toString();
  }

  function addServer() {
    // State signing, replay protection and code exchange all happen server-side.
    // No Discord credential or authorization code is handled by this bundle.
    window.location.assign(ttsInstallUrl("home"));
  }

  /* ── estilos inline (CSP permite; usam as vars do tema do site) ── */
  var CARD =
    "background:var(--panel-2,#12121c);border:1px solid var(--line-2,#23233a);border-radius:16px;padding:22px;margin-top:18px";
  var BTN = "btn btn--primary";
  var MUTED = "color:var(--text-2,#9a9ab0)";

  /* Seletor cai um SVG chevron via data: (img-src permite data:). %23 = # (cor). */
  var SEL_ARROW =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9ab0' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E";

  /* Classes precisam de :hover/:focus/::after — impossível em style="" inline;
     injetamos um <style> uma vez. */
  var CSS = [
    /* Every product workspace has a safe, first-party way back to the account. */
    ".dash-productbar{display:flex;justify-content:flex-end;width:min(100%,960px);margin:0 auto 14px}",
    ".dash-exit{align-items:center;color:var(--text-2,#9a9ab0);display:inline-flex;font-size:.88rem;font-weight:700;justify-content:center;min-height:44px;padding:0 13px;text-decoration:none;border:1px solid var(--line-2,#23233a);border-radius:10px;transition:border-color .16s ease,color .16s ease,background .16s ease}",
    ".dash-exit:hover,.dash-exit:focus-visible{background:rgba(56,224,200,.08);border-color:var(--aqua,#38e0c8);color:var(--aqua,#38e0c8)}",
    /* picker de servidores: lista horizontal, com a densidade do dashboard de billing */
    ".dash-picker{margin-top:18px;padding:22px;background:rgba(23,22,19,.74);border:1px solid rgba(225,205,157,.13);border-radius:16px}",
    ".dash-picker__list{display:grid;gap:10px;margin-top:28px}",
    ".dash-server{display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:14px;width:100%;min-height:66px;padding:10px 14px;background:#171613;border:1px solid rgba(225,205,157,.13);border-radius:14px;cursor:pointer;font:inherit;color:var(--text-1,#e9e9f2);text-align:left;transition:border-color .16s ease,background .16s ease,transform .16s ease,box-shadow .16s ease}",
    ".dash-server:hover,.dash-server:focus-visible{border-color:rgba(225,205,157,.42);background:#1c1a17;box-shadow:0 10px 24px rgba(0,0,0,.16);transform:translateY(-1px)}",
    ".dash-server:active{transform:translateY(0)}",
    ".dash-server__img,.dash-server__ph{width:40px;height:40px;border-radius:12px;flex:none}",
    ".dash-server__img{object-fit:cover;background:#292721}",
    ".dash-server__ph{display:flex;align-items:center;justify-content:center;background:#292721;border:1px solid rgba(225,205,157,.16);font-weight:800;font-size:.92rem;color:#e8d39a}",
    ".dash-server__name{min-width:0;font-size:.94rem;font-weight:700;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".dash-server__arrow{display:grid;width:34px;height:34px;place-items:center;border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#d8c99f;font-size:1.2rem;line-height:1}",
    /* formulário */
    ".dash-form{background:var(--panel-2,#12121c);border:1px solid var(--line-2,#23233a);border-radius:16px;padding:22px;margin-top:18px}",
    ".dash-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:4px}",
    ".dash-head__ic,.dash-head__ph{width:44px;height:44px;border-radius:50%;flex:none}",
    ".dash-head__ic{object-fit:cover;background:var(--bg-0,#0a0a12)}",
    ".dash-head__ph{display:flex;align-items:center;justify-content:center;background:var(--bg-0,#0a0a12);border:1px solid var(--line-2,#23233a);font-weight:700;color:var(--aqua,#38e0c8)}",
    ".dash-head__name{margin:0;font-size:1.2rem;font-family:var(--f-display,inherit);flex:1;min-width:120px;overflow-wrap:anywhere}",
    ".dash-back{margin-left:auto}",
    ".dash-sec{margin-top:22px}",
    ".dash-sec__t{font-family:var(--f-mono,inherit);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--aqua,#38e0c8);margin:0 0 2px}",
    ".dash-row{display:flex;align-items:center;gap:16px;padding:13px 10px;margin:0 -10px;border-radius:10px;border-bottom:1px solid var(--line-2,#23233a);cursor:pointer}",
    ".dash-sec .dash-row:last-child{border-bottom:0}",
    ".dash-row:hover{background:var(--glass,rgba(255,255,255,.03))}",
    ".dash-row__txt{flex:1;min-width:0}",
    ".dash-row__l{display:block;font-size:.98rem;color:var(--text-1,#e9e9f2)}",
    ".dash-row__d{display:block;font-size:.82rem;color:var(--text-2,#9a9ab0);margin-top:2px}",
    /* toggle switch */
    ".dash-sw{position:relative;flex:none;width:44px;height:24px}",
    ".dash-sw input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}",
    ".dash-sw__tr{position:absolute;inset:0;border-radius:999px;background:var(--line-2,#23233a);transition:background .15s ease;pointer-events:none}",
    ".dash-sw__tr::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s ease}",
    ".dash-sw input:checked+.dash-sw__tr{background:var(--aqua,#38e0c8)}",
    ".dash-sw input:checked+.dash-sw__tr::after{transform:translateX(20px)}",
    ".dash-sw input:focus-visible+.dash-sw__tr{outline:2px solid var(--aqua,#38e0c8);outline-offset:2px}",
    /* número + select */
    ".dash-num,.dash-sel{background:var(--bg-0,#0a0a12);color:var(--text-1,#e9e9f2);border:1px solid var(--line-2,#23233a);border-radius:10px;font:inherit;transition:border-color .15s ease}",
    ".dash-num{width:92px;padding:9px 10px;font-family:var(--f-mono,inherit);text-align:right}",
    ".dash-sel{max-width:180px;padding:9px 30px 9px 11px;cursor:pointer;-webkit-appearance:none;-moz-appearance:none;appearance:none;background-image:url(\"" + SEL_ARROW + "\");background-repeat:no-repeat;background-position:right 10px center}",
    ".dash-num:focus,.dash-sel:focus{outline:none;border-color:var(--aqua,#38e0c8)}",
    /* barra de guardar */
    ".dash-savebar{display:flex;align-items:center;gap:14px;max-height:0;overflow:hidden;opacity:0;pointer-events:none;margin-top:0;padding-top:0;border-top:1px solid transparent;transition:max-height .18s ease,opacity .18s ease,margin-top .18s ease,padding-top .18s ease,border-color .18s ease}",
    ".dash-savebar--visible{max-height:110px;opacity:1;pointer-events:auto;margin-top:22px;padding-top:18px;border-top-color:var(--line-2,#23233a)}",
    ".dash-save[disabled]{opacity:.45;cursor:not-allowed}",
    ".dash-status{font-size:.9rem;color:var(--text-2,#9a9ab0)}",
    ".dash-status--ok{color:var(--aqua,#38e0c8)}",
    ".dash-status--err{color:var(--amber,#e6b34d)}",
    ".dash-profiles{margin-top:22px;padding-top:20px;border-top:1px solid var(--line-2,#23233a)}",
    ".dash-profiles__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}",
    ".dash-profile-field{display:flex;flex-direction:column;gap:6px;color:var(--text-2,#9a9ab0);font-size:.78rem}",
    ".dash-profile-field .dash-sel,.dash-profile-field .dash-num{width:100%;max-width:none;text-align:left;box-sizing:border-box}",
    ".dash-profile-actions{display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}",
    /* mobile: barra de guardar colada ao fundo (forms longos) */
    "@media(max-width:720px){.dash-savebar--visible{position:sticky;bottom:0;margin:22px -22px -22px;padding:14px 22px;background:var(--panel-2,#171613);border-top:1px solid var(--line-2,#23233a)}.dash-sel{max-width:150px}.dash-profiles__grid{grid-template-columns:1fr}.dash-server{grid-template-columns:38px minmax(0,1fr) auto;gap:11px;padding-left:11px;padding-right:11px}.dash-server__img,.dash-server__ph{width:38px;height:38px}}",
    "@media(prefers-reduced-motion:reduce){.dash-server,.dash-sw__tr,.dash-sw__tr::after,.dash-num,.dash-sel{transition:none}}",
  ].join("\n");
  var styleEl = document.createElement("style");
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  function view(html) {
    root.innerHTML = html;
    var moveFocus = function () {
      var heading = root.querySelector("h1, h2");
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        try { heading.focus({ preventScroll: true }); } catch (e) { heading.focus(); }
      }
      var main = document.querySelector(".tts-workspace__main");
      if (main) main.scrollTop = 0;
      var picker = document.getElementById("ttsPickerPage");
      if (picker) picker.scrollTop = 0;
      window.scrollTo(0, 0);
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(moveFocus);
    else moveFocus();
  }

  function renderLogin(msgKey) {
    // The account page is the only authentication surface. Product routes
    // redirect there and reuse its shared session instead of showing a second
    // Discord login card inside the dashboard.
    if (!window.location.pathname.startsWith("/account")) {
      window.location.replace("/account/");
      return;
    }
    // Authentication belongs exclusively to /account. This function is kept
    // as a compatibility guard for stale dashboard bundles, but never renders
    // a second login card inside a product workspace.
    return;
  }

  function renderMessage(titleKey, hintKey, opts) {
    opts = opts || {};
    var title = t(titleKey);
    var hint = hintKey ? t(hintKey) : "";
    view(
      '<div style="' +
        CARD +
        '"><h2 style="margin:0 0 6px;font-size:1.25rem">' +
        esc(title) +
        '</h2><p style="' +
        MUTED +
        ';margin:0">' +
        esc(hint) +
        "</p>" +
        (opts.retry
          ? '<button type="button" class="' +
            BTN +
            '" id="dashRetry" style="margin-top:16px">' +
            esc(t("dashboard.retry")) +
            "</button>"
          : "") +
        (opts.addServer
          ? '<button type="button" class="' +
            BTN +
            '" id="dashAddServer" style="margin-top:16px">' + esc(t("dashboard.addServerButton")) + '</button>'
          : "") +
        "</div>",
    );
    if (opts.retry) {
      var r = document.getElementById("dashRetry");
      if (r) r.addEventListener("click", opts.onRetry || boot);
    }
    if (opts.addServer) {
      var add = document.getElementById("dashAddServer");
      if (add) add.addEventListener("click", addServer);
    }
    // Keep semantic keys so a language change can also translate loading/error/empty states.
    onLang = function () {
      renderMessage(titleKey, hintKey, opts);
    };
  }

  // Keep the dashboard shell useful while a request is in flight.  This is
  // deliberately shaped like the final picker/form instead of showing a
  // generic spinner, so the transition does not make the page jump.
  function renderSkeleton(kind) {
    var picker = kind === "picker";
    var label = picker ? t("dashboard.loadingAvailable") : t("dashboard.loadingSettings");
    var pulse = function (extra) {
      return '<span class="dash-skeleton__pulse' + (extra ? " " + extra : "") + '" aria-hidden="true"></span>';
    };
    var html = picker
      ? '<div class="dash-skeleton dash-skeleton--picker" role="status" aria-live="polite" aria-busy="true" aria-label="' +
        esc(label) +
        '"><span class="dash-skeleton__sr">' +
        esc(label) +
        '</span><div class="dash-skeleton__picker-title">' +
        pulse("dash-skeleton__pulse--title") +
        pulse("dash-skeleton__pulse--copy") +
        '</div><div class="dash-skeleton__picker-list">' +
        [0, 1, 2, 3].map(function () {
          return '<div class="dash-skeleton__server">' +
            pulse("dash-skeleton__pulse--avatar") +
            pulse("dash-skeleton__pulse--server-name") +
            pulse("dash-skeleton__pulse--arrow") +
            '</div>';
        }).join("") +
        '</div><div class="dash-skeleton__picker-action">' +
        pulse("dash-skeleton__pulse--action-copy") +
        pulse("dash-skeleton__pulse--action-button") +
        '</div></div>'
      : '<div class="dash-skeleton dash-skeleton--workspace" role="status" aria-live="polite" aria-busy="true" aria-label="' +
        esc(label) +
        '"><span class="dash-skeleton__sr">' +
        esc(label) +
        '</span><div class="dash-skeleton__workspace-head">' +
        pulse("dash-skeleton__pulse--avatar") +
        pulse("dash-skeleton__pulse--workspace-name") +
        pulse("dash-skeleton__pulse--button") +
        '</div><div class="dash-skeleton__workspace-intro">' +
        pulse("dash-skeleton__pulse--eyebrow") +
        pulse("dash-skeleton__pulse--heading") +
        pulse("dash-skeleton__pulse--heading-short") +
        pulse("dash-skeleton__pulse--intro-copy") +
        '</div><div class="dash-skeleton__steps">' +
        [0, 1, 2, 3].map(function () {
          return '<div class="dash-skeleton__step">' + pulse("dash-skeleton__pulse--step-number") + pulse("dash-skeleton__pulse--step-copy") + '</div>';
        }).join("") +
        '</div><div class="dash-skeleton__settings">' +
        [0, 1, 2, 3, 4].map(function () {
          return '<div class="dash-skeleton__setting"><span>' + pulse("dash-skeleton__pulse--setting-title") + pulse("dash-skeleton__pulse--setting-copy") + '</span>' + pulse("dash-skeleton__pulse--toggle") + '</div>';
        }).join("") +
        '</div></div>';
    view(html);
    onLang = function () {
      renderSkeleton(kind);
    };
  }

  /* CDN de ícones da Discord (img-src já permite cdn.discordapp.com no CSP).
     Ícones animados têm hash "a_..." e servem-se como .gif. */
  function guildIconUrl(g) {
    if (!g.icon) return null;
    var ext = String(g.icon).indexOf("a_") === 0 ? "gif" : "png";
    return "https://cdn.discordapp.com/icons/" + g.id + "/" + g.icon + "." + ext + "?size=128";
  }
  function guildInitials(name) {
    var parts = String(name).trim().split(/\s+/).slice(0, 2);
    var out = "";
    for (var i = 0; i < parts.length; i++) out += parts[i].charAt(0);
    return out.toUpperCase() || "?";
  }
  // Liga o fallback de um <img> de ícone: se falhar, troca por placeholder de iniciais.
  function wireIconFallback(img, name, phClass) {
    if (!img) return;
    img.addEventListener("error", function () {
      var ph = document.createElement("span");
      ph.className = phClass;
      ph.setAttribute("aria-hidden", "true");
      ph.textContent = guildInitials(name || "?");
      if (img.parentNode) img.parentNode.replaceChild(ph, img);
    });
  }

  function renderPicker(guilds) {
    workspaceState.requestSeq += 1;
    showPickerShell();
    var pendingView = workspaceState.view || "overview";
    workspaceState.guild = null;
    workspaceState.guilds = guilds || [];
    workspaceState.data = null;
    workspaceState.pendingView = pendingView;
    updateTtsServerLabel();
    setTtsView("overview", false);
    var cards = guilds
      .map(function (g, i) {
        var url = guildIconUrl(g);
        var art = url
          ? '<img class="dash-server__img" src="' + esc(url) + '" alt="">'
          : '<span class="dash-server__ph" aria-hidden="true">' +
            esc(guildInitials(g.name)) +
            "</span>";
        return (
          '<button type="button" class="dash-server" data-i="' +
          i +
          '">' +
          art +
          '<span class="dash-server__name">' +
          esc(g.name) +
          '</span><span class="dash-server__arrow" aria-hidden="true">›</span></button>'
        );
      })
      .join("");
    view(
      '<div class="tts-picker-page__back"><a class="dash-exit" href="/account/">' + esc(t("dashboard.backAccount")) + '</a></div>' +
      '<div class="dash-picker"><h2 style="margin:0 0 6px;font-size:1.25rem">' +
        esc(t("dashboard.pick")) +
        '</h2><p style="' +
        MUTED +
        ';margin:0">' +
        esc(t("dashboard.pickHint")) +
        '</p><div class="dash-picker__list">' +
        cards +
        '</div><div class="dash-picker__actions"><div class="dash-picker__actions-copy"><strong>' + esc(t("dashboard.addAnotherServer")) + '</strong><span>' + esc(t("dashboard.installAndReturn")) + '</span></div><button type="button" class="dash-picker__add" id="dashAddServer">' + esc(t("dashboard.addServerButton")) + '</button></div></div>',
    );
    var btns = root.querySelectorAll(".dash-server");
    function onPick(ev) {
      var g = guilds[Number(ev.currentTarget.getAttribute("data-i"))];
      if (g && confirmTtsDiscard()) {
        workspaceState.dirty = false;
        loadForm(g, guilds);
      }
    }
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", onPick);
      var g = guilds[i];
      wireIconFallback(btns[i].querySelector(".dash-server__img"), g && g.name, "dash-server__ph");
    }
    var add = document.getElementById("dashAddServer");
    if (add) add.addEventListener("click", addServer);
    onLang = function () {
      renderPicker(guilds);
    };
  }

  /* ── construção das linhas do formulário ── */
  function swHtml(key, on) {
    return (
      '<span class="dash-sw"><input type="checkbox" data-k="' +
      key +
      '"' +
      (on ? " checked" : "") +
      '><span class="dash-sw__tr"></span></span>'
    );
  }
  function numHtml(key, f, val) {
    return (
      '<input class="dash-num" type="number" data-k="' +
      key +
      '" min="' +
      f.min +
      '" max="' +
      f.max +
      '" value="' +
      esc(val) +
      '">'
    );
  }
  function optionsFor(key, val, meta) {
    if (meta && meta.options) {
      if (key === "ttsChannelId" && Array.isArray(meta.options.channels)) {
        return meta.options.channels;
      }
      if (key === "defaultVoice" && Array.isArray(meta.options.voices)) {
        return meta.options.voices;
      }
      if (key === "locale" && Array.isArray(meta.options.locales)) {
        return meta.options.locales;
      }
      if ((key === "priorityRoleId" || key === "blockedRoleId") && Array.isArray(meta.options.roles)) {
        return meta.options.roles;
      }
    }
    // Compatibility with the old API: keep the current locale visible without inventing a
    // client-side catalogue. Channel and voice remain hidden by sectionsFor().
    return key === "locale" ? [{ id: String(val || "en"), label: String(val || "en") }] : [];
  }
  function selectOptionsHtml(key, val, meta) {
    var opts = "";
    if (key === "ttsChannelId") {
      opts += '<option value=""' + (val === null ? " selected" : "") + ">" + esc(t("dashboard.channelNone")) + "</option>";
    } else if (key === "defaultVoice") {
      opts += '<option value=""' + (val === "" ? " selected" : "") + ">" + esc(t("dashboard.voiceGlobal")) + "</option>";
    } else if (key === "priorityRoleId" || key === "blockedRoleId") {
      opts += '<option value=""' + (val === null ? " selected" : "") + '>' + esc(t("dashboard.noRole")) + '</option>';
    }
    var options = optionsFor(key, val, meta);
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var label = option.label;
      if (option.unavailable) {
        var unavailableKey =
          key === "ttsChannelId" ? "dashboard.unavailableChannel" : "dashboard.unavailableVoice";
        label = t(unavailableKey).replace("{name}", option.label);
      }
      opts +=
        '<option value="' +
        esc(option.id) +
        '"' +
        (option.id === val ? " selected" : "") +
        (option.unavailable ? " disabled" : "") +
        ">" +
        esc(label) +
        "</option>";
    }
    return opts;
  }
  function selHtml(key, val, meta) {
    return (
      '<select class="dash-sel" data-k="' +
      key +
      '">' +
      selectOptionsHtml(key, val, meta) +
      "</select>"
    );
  }
  function rowHtml(key, cfg, meta) {
    var f = FIELD[key];
    var control;
    var desc = fieldCopy(key, true);
    if (f.type === "toggle") control = swHtml(key, !!cfg[key]);
    else if (f.type === "num") {
      control = numHtml(key, f, cfg[key]);
      desc += " (" + f.min + "–" + f.max + ")";
    } else control = selHtml(key, fieldValue(key, cfg), meta);
    return (
      '<label class="dash-row"><span class="dash-row__txt"><span class="dash-row__l">' +
      esc(fieldCopy(key, false)) +
      '</span><span class="dash-row__d">' +
      esc(desc) +
      "</span></span>" +
      control +
      "</label>"
    );
  }
  function headHtml(guild) {
    var url = guildIconUrl(guild);
    var art = url
      ? '<img class="dash-head__ic" src="' + esc(url) + '" alt="">'
      : '<span class="dash-head__ph" aria-hidden="true">' + esc(guildInitials(guild.name)) + "</span>";
    return (
      '<div class="dash-head">' +
      art +
      '<h2 class="dash-head__name">' +
      esc(guild.name) +
      '</h2><button type="button" id="dashBack" class="btn btn--ghost btn--sm dash-back">' +
      esc(t("dashboard.back")) +
      "</button></div>"
    );
  }

  function loadForm(guild, guilds) {
    var requestId = ++workspaceState.requestSeq;
    showWorkspaceShell();
    workspaceState.dirty = false;
    workspaceState.guild = guild;
    workspaceState.guilds = guilds || [];
    workspaceState.data = null;
    updateTtsServerLabel();
    var requestedView = workspaceState.pendingView || (workspaceState.view === "overview" ? "quick" : workspaceState.view);
    workspaceState.pendingView = null;
    setTtsView(requestedView, false);
    renderSkeleton("workspace");
    fetchWithTimeout(API + "/api/dashboard/guild/" + guild.id, { headers: authHeaders() })
      .then(function (res) {
        if (requestId !== workspaceState.requestSeq) return null;
        if (res.status === 401) {
          clearToken();
          renderLogin("dashboard.expired");
          return null;
        }
        if (res.status === 403) {
          renderMessage("dashboard.forbidden", "dashboard.noneHint");
          return null;
        }
        if (!res.ok) {
          renderMessage("dashboard.error", "", {
            retry: true,
            onRetry: function () { loadForm(guild, guilds); },
          });
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (requestId !== workspaceState.requestSeq) return;
        if (data && data.config) {
          workspaceState.data = data;
          updateTtsServerLabel();
          renderCurrentTtsView();
        }
      })
      .catch(function () {
        if (requestId !== workspaceState.requestSeq) return;
        renderMessage("dashboard.error", "", {
          retry: true,
          onRetry: function () { loadForm(guild, guilds); },
        });
      });
  }

  function profileOptionHtml(options, value, emptyLabel) {
    var out = '<option value="">' + esc(emptyLabel) + "</option>";
    for (var i = 0; i < options.length; i++) {
      out +=
        '<option value="' +
        esc(options[i].id) +
        '"' +
        (options[i].id === value ? " selected" : "") +
        ">" +
        esc(options[i].label) +
        "</option>";
    }
    return out;
  }

  function triStateHtml(key) {
    return (
      '<select class="dash-sel" data-p="' +
      key +
      '"><option value="">' + esc(t("dashboard.inheritServer")) + '</option><option value="true">' + esc(t("dashboard.on")) + '</option><option value="false">' + esc(t("dashboard.off")) + '</option></select>'
    );
  }

  function profileEditorHtml(meta) {
    if (!meta.capabilities.channelProfiles) return "";
    var channels = meta.options.channels || [];
    var voices = meta.options.voices || [];
    var voiceChannels = meta.options.voiceChannels || [];
    var locales = meta.options.locales || [];
    return (
      '<section class="dash-profiles" aria-labelledby="dashProfilesTitle">' +
      '<p class="dash-sec__t" id="dashProfilesTitle">' + esc(t("dashboard.sec_voice")) + "</p>" +
      '<p class="dash-row__d">' + esc(t("dashboard.d_ttsChannelId")) + "</p>" +
      '<div class="dash-profiles__grid">' +
      '<label class="dash-profile-field">' + esc(t("dashboard.readingChannel")) + '<select class="dash-sel" id="dashProfileChannel">' +
      profileOptionHtml(channels, "", t("dashboard.chooseChannelFirst")) +
      "</select></label>" +
      '<label class="dash-profile-field">' + esc(t("dashboard.f_autoread")) + triStateHtml("autoRead") + "</label>" +
      '<label class="dash-profile-field">' +
      triStateHtml("translationEnabled") +
      "</label>" +
      '<label class="dash-profile-field">' + esc(t("dashboard.f_readBots")) + triStateHtml("readBots") + "</label>" +
      '<label class="dash-profile-field">' + esc(t("dashboard.f_defaultVoice")) + '<select class="dash-sel" data-p="defaultVoice">' +
      profileOptionHtml(voices, "", t("dashboard.inheritVoice")) +
      "</select></label>" +
      '<label class="dash-profile-field">' + esc(t("dashboard.engine")) + '<select class="dash-sel" data-p="engine"><option value="">' + esc(t("dashboard.inherit")) + '</option><option value="google">' + esc(t("dashboard.default")) + '</option><option value="piper">Piper</option><option value="kokoro">Kokoro ' + esc(t("dashboard.paid")) + '</option><option value="gcloud">Google HD ' + esc(t("dashboard.paid")) + '</option></select></label>' +
      '<label class="dash-profile-field">' + esc(t("dashboard.f_locale")) + '<select class="dash-sel" data-p="locale">' +
      profileOptionHtml(locales, "", t("dashboard.inferVoice")) +
      "</select></label>" +
      '<label class="dash-profile-field">' + esc(t("dashboard.voiceEffect")) + '<select class="dash-sel" data-p="effect"><option value="">' + esc(t("dashboard.noEffect")) + '</option><option value="robot">Robot</option><option value="echo">Echo</option><option value="deep">Deep ' + esc(t("dashboard.paid")) + '</option><option value="chipmunk">Chipmunk ' + esc(t("dashboard.paid")) + '</option><option value="radio">Radio ' + esc(t("dashboard.paid")) + '</option><option value="phone">Phone ' + esc(t("dashboard.paid")) + '</option><option value="underwater">Underwater ' + esc(t("dashboard.paid")) + '</option><option value="demon">Demon ' + esc(t("dashboard.paid")) + '</option></select></label>' +
      '<label class="dash-profile-field">' + esc(t("dashboard.voiceBinding")) + '<select class="dash-sel" data-p="voiceChannelId">' +
      profileOptionHtml(voiceChannels, "", t("dashboard.anyActiveCall")) +
      "</select></label>" +
      '<label class="dash-profile-field">' + esc(t("dashboard.speed")) + ' (0.5–2.0)<input class="dash-num" data-p="speed" type="number" min="0.5" max="2" step="0.05" placeholder="' + esc(t("dashboard.inherit")) + '"></label>' +
      '<label class="dash-profile-field">' + esc(t("dashboard.f_maxChars")) + '<input class="dash-num" data-p="maxChars" type="number" min="1" max="2000" placeholder="' + esc(t("dashboard.inherit")) + '"></label>' +
      "</div>" +
      '<div class="dash-profile-actions"><button type="button" class="' +
      BTN +
      '" id="dashProfileSave">' + esc(t("dashboard.addProfile")) + '</button><button type="button" class="btn btn--ghost" id="dashProfileDelete">' + esc(t("dashboard.deleteProfile")) + '</button><span class="dash-status" id="dashProfileStatus" aria-live="polite"></span></div></section>'
    );
  }

  function wireProfileEditor(guild, guilds, meta) {
    if (!meta.capabilities.channelProfiles) return;
    var channel = document.getElementById("dashProfileChannel");
    var save = document.getElementById("dashProfileSave");
    var remove = document.getElementById("dashProfileDelete");
    var status = document.getElementById("dashProfileStatus");
    if (!channel || !save || !remove || !status) return;

    function selectedProfile() {
      var profiles = Array.isArray(meta.channelProfiles) ? meta.channelProfiles : [];
      for (var i = 0; i < profiles.length; i++) {
        if (profiles[i].channelId === channel.value) return profiles[i];
      }
      return null;
    }
    function setProfileValue(key, value) {
      var input = root.querySelector('[data-p="' + key + '"]');
      if (!input) return;
      input.value = value === null || value === undefined ? "" : String(value);
    }
    function loadSelected() {
      var profile = selectedProfile();
      ["autoRead", "translationEnabled", "readBots", "defaultVoice", "engine", "locale", "effect", "voiceChannelId", "speed", "maxChars"].forEach(function (key) {
        setProfileValue(key, profile ? profile[key] : null);
      });
      remove.disabled = !profile;
      status.textContent = "";
    }
    function profileBody() {
      var out = {};
      ["autoRead", "translationEnabled", "readBots"].forEach(function (key) {
        var value = root.querySelector('[data-p="' + key + '"]').value;
        out[key] = value === "" ? null : value === "true";
      });
      ["defaultVoice", "engine", "locale", "effect", "voiceChannelId"].forEach(function (key) {
        var value = root.querySelector('[data-p="' + key + '"]').value;
        out[key] = value === "" ? null : value;
      });
      ["speed", "maxChars"].forEach(function (key) {
        var value = root.querySelector('[data-p="' + key + '"]').value;
        out[key] = value === "" ? null : Number(value);
      });
      return out;
    }
    channel.addEventListener("change", loadSelected);
    save.addEventListener("click", function () {
      if (!channel.value) {
        status.textContent = t("dashboard.chooseChannelFirst");
        return;
      }
      status.textContent = t("dashboard.saving");
      fetchWithTimeout(API + "/api/dashboard/guild/" + guild.id + "/profile/" + channel.value, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
        body: JSON.stringify(profileBody()),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("profile-save");
          return res.json();
        })
        .then(function (data) {
          renderForm(guild, data.config, guilds, data, true);
        })
        .catch(function () {
          status.textContent = t("dashboard.saveFail");
        });
    });
    remove.addEventListener("click", function () {
      if (!channel.value || !selectedProfile()) return;
      status.textContent = t("dashboard.saving");
      fetchWithTimeout(API + "/api/dashboard/guild/" + guild.id + "/profile/" + channel.value, {
        method: "DELETE",
        headers: authHeaders(),
      })
        .then(function (res) {
          if (res.status !== 204) throw new Error("profile-delete");
          return loadForm(guild, guilds);
        })
        .catch(function () {
          status.textContent = t("dashboard.saveFail");
        });
    });
    loadSelected();
  }

  // Valor normalizado de um campo (bool/num/string) a partir de um objeto de config.
  function fieldValue(key, src) {
    var f = FIELD[key];
    if (f.type === "toggle") return !!src[key];
    if (f.type === "num") return Number(src[key]);
    if (f.type === "channel") return src[key] === null ? null : String(src[key]);
    if (f.type === "role") return src[key] === null ? null : String(src[key]);
    if (f.type === "voice") return String(src[key] || "");
    return String(src[key] || "en");
  }
  // Lê o valor atual do controlo no DOM.
  function domValue(key) {
    var el = root.querySelector('[data-k="' + key + '"]');
    if (!el) return undefined;
    var f = FIELD[key];
    if (f.type === "toggle") return el.checked;
    if (f.type === "num") return el.value.trim() === "" ? undefined : Number(el.value);
    if (f.type === "channel") return el.value === "" ? null : el.value;
    if (f.type === "role") return el.value === "" ? null : el.value;
    return el.value;
  }

  function renderForm(guild, cfg, guilds, meta, saved) {
    setTtsView(workspaceState.view === "overview" ? "quick" : workspaceState.view, false);
    var allSections = sectionsFor(meta);
    var sectionIdsByView = {
      reading: ["reading", "voice"],
      community: ["community"],
      limits: ["limits"],
    };
    var requestedSections = sectionIdsByView[workspaceState.view];
    var sections = requestedSections
      ? allSections.filter(function (section) { return requestedSections.indexOf(section.id) !== -1; })
      : allSections;
    // Channel Profiles is an intentional deep-dive view. Keep it out of the
    // guided setup so the first-run path stays focused and scannable; the
    // existing editor remains available from its dedicated sidebar item.
    var showProfiles = workspaceState.view === "profiles";
    // Baseline para dirty-tracking: o botão só fica ativo quando algo muda.
    var baseline = {};
    eachField(sections, function (key) {
      baseline[key] = fieldValue(key, cfg);
    });

    var sectionsHtml = sections.map(function (sec) {
      var rows = sec.fields
        .map(function (k) {
          return rowHtml(k, cfg, meta);
        })
        .join("");
      return (
        '<div class="dash-sec"><p class="dash-sec__t">' +
        esc(t("dashboard.sec_" + sec.id)) +
        "</p>" +
        rows +
        "</div>"
      );
    }).join("");

    var quickIntro = workspaceState.view === "quick"
      ? '<section class="workspace-quick-intro" aria-labelledby="ttsQuickTitle">' +
        '<p class="workspace-heading__eyebrow">' + esc(t("dashboard.quickSetupIntro")) + '</p>' +
        '<h1 id="ttsQuickTitle">' + esc(t("dashboard.quickSetupTitle")) + '</h1>' +
        '<p>' + esc(t("dashboard.quickSetupDescription")).replace("Review &amp; Save", "<strong>" + esc(t("dashboard.reviewSave")) + "</strong>") + '</p>' +
        '<ol class="workspace-quick-intro__steps">' +
          '<li><b>1</b><span><strong>' + esc(t("dashboard.stepReadingChannel")) + '</strong><small>' + esc(t("dashboard.stepReadingChannelHint")) + '</small></span></li>' +
          '<li><b>2</b><span><strong>' + esc(t("dashboard.stepVoiceLanguage")) + '</strong><small>' + esc(t("dashboard.stepVoiceLanguageHint")) + '</small></span></li>' +
          '<li><b>3</b><span><strong>' + esc(t("dashboard.stepReadingRules")) + '</strong><small>' + esc(t("dashboard.stepReadingRulesHint")) + '</small></span></li>' +
          '<li><b>4</b><span><strong>' + esc(t("dashboard.stepReviewSave")) + '</strong><small>' + esc(t("dashboard.stepReviewSaveHint")) + '</small></span></li>' +
        '</ol>' +
      '</section>'
      : "";

    var savebar =
      '<div class="dash-savebar" id="dashSavebar"><button type="button" class="' +
      BTN +
      ' dash-save" id="dashSave" disabled>' +
      esc(t("dashboard.save")) +
      '</button><button type="button" class="btn btn--ghost dash-discard" id="dashDiscard" disabled>' + esc(t("dashboard.discard")) + '</button><span class="dash-status" id="dashStatus" aria-live="polite"></span></div>';

    view(
      '<div class="dash-form">' +
        headHtml(guild) +
        quickIntro +
        sectionsHtml +
        (showProfiles ? profileEditorHtml(meta) : "") +
        savebar +
        "</div>",
    );
    wireIconFallback(root.querySelector(".dash-head__ic"), guild.name, "dash-head__ph");

    var formEl = root.querySelector(".dash-form");
    var saveBtn = document.getElementById("dashSave");
    var discardBtn = document.getElementById("dashDiscard");
    var savebarEl = document.getElementById("dashSavebar");
    var statusEl = document.getElementById("dashStatus");
    wireProfileEditor(guild, guilds, meta);

    function countChanges() {
      var n = 0;
      eachField(sections, function (key) {
        var value = domValue(key);
        if (FIELD[key].type === "num" && value === undefined) return;
        if (value !== baseline[key]) n++;
      });
      return n;
    }
    function setStatus(msg, cls) {
      statusEl.textContent = msg || "";
      statusEl.className = "dash-status" + (cls ? " dash-status--" + cls : "");
    }
    function refresh() {
      var n = countChanges();
      workspaceState.dirty = n > 0;
      saveBtn.disabled = n === 0;
      discardBtn.disabled = n === 0;
      if (savebarEl) savebarEl.classList.toggle("dash-savebar--visible", n > 0 || !!saved);
      saveBtn.textContent =
        n === 0
          ? (workspaceState.view === "quick" ? t("dashboard.reviewSave") : t("dashboard.save"))
          : n === 1
            ? (workspaceState.view === "quick" ? t("dashboard.reviewSaveOne") : t("dashboard.save1"))
            : (workspaceState.view === "quick" ? t("dashboard.reviewSaveMany").replace("{n}", n) : t("dashboard.saveN").replace("{n}", n));
      if (n > 0) setStatus(""); // limpa "Guardado ✓" assim que se volta a mexer
    }

    document.getElementById("dashBack").addEventListener("click", function () {
      if (!confirmTtsDiscard()) return;
      workspaceState.dirty = false;
      renderPicker(guilds);
    });
    discardBtn.addEventListener("click", function () {
      if (!workspaceState.dirty) return;
      workspaceState.dirty = false;
      renderForm(guild, cfg, guilds, meta, false);
    });
    // Listeners no próprio form (substituído a cada render -> morrem com ele; sem leaks).
    formEl.addEventListener("input", refresh);
    function syncChannelAutoread(event) {
      var target = event.target;
      if (!target || target.getAttribute("data-k") !== "ttsChannelId") return;
      var autoread = root.querySelector('[data-k="autoread"]');
      if (autoread) autoread.checked = target.value !== "";
    }
    formEl.addEventListener("change", function (event) {
      syncChannelAutoread(event);
      refresh();
    });

    saveBtn.addEventListener("click", function () {
      if (saveBtn.disabled) return;
      if (workspaceState.view === "quick" && !window.confirm(t("dashboard.reviewConfirm"))) {
        refresh();
        return;
      }
      var patch = {};
      eachField(sections, function (key) {
        var v = domValue(key);
        if (v === baseline[key]) return;
        if (FIELD[key].type === "num" && !isFinite(v)) return; // campo vazio -> não envia
        patch[key] = v;
      });
      saveBtn.disabled = true;
      saveBtn.textContent = t("dashboard.saving");
      setStatus("");
      fetchWithTimeout(API + "/api/dashboard/guild/" + guild.id, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
        body: JSON.stringify(patch),
      })
        .then(function (res) {
          if (res.status === 401) {
            clearToken();
            renderLogin("dashboard.expired");
            return;
          }
          if (res.status === 403) {
            renderMessage("dashboard.forbidden", "dashboard.noneHint");
            return;
          }
          if (!res.ok) {
            setStatus(t("dashboard.saveFail"), "err");
            refresh();
            return;
          }
          return res.json();
        })
        .then(function (data) {
          // Rebuild the controls and dirty baseline from the authoritative server response.
          if (data && data.config) {
            workspaceState.dirty = false;
            workspaceState.data = data;
            workspaceState.guild = guild;
            renderForm(guild, data.config, guilds, data, true);
          }
        })
        .catch(function () {
          setStatus(t("dashboard.saveFail"), "err");
          refresh();
        });
    });

    refresh(); // estado inicial: sem alterações -> desativado
    if (saved) setStatus(t("dashboard.saved"), "ok");

    // Re-localizador in-place: reescreve só os text-nodes traduzíveis (títulos de secção,
    // nomes/descrições dos campos, botão voltar) e deixa o refresh() recalcular o rótulo do
    // Guardar com a contagem de alterações atual. Não toca nos inputs -> preserva valores e
    // o estado "por guardar". Registado como re-localizador enquanto o form está visível.
    onLang = function relocalizeForm() {
      var secEls = root.querySelectorAll(".dash-sec");
      sections.forEach(function (sec, i) {
        var tEl = secEls[i] && secEls[i].querySelector(".dash-sec__t");
        if (tEl) tEl.textContent = t("dashboard.sec_" + sec.id);
      });
      eachField(sections, function (key) {
        var ctrl = root.querySelector('[data-k="' + key + '"]');
        var row = ctrl && ctrl.closest ? ctrl.closest(".dash-row") : null;
        if (!row) return;
        var lEl = row.querySelector(".dash-row__l");
        var dEl = row.querySelector(".dash-row__d");
        if (lEl) lEl.textContent = fieldCopy(key, false);
        if (dEl) {
          var desc = fieldCopy(key, true);
          if (FIELD[key].type === "num") desc += " (" + FIELD[key].min + "–" + FIELD[key].max + ")";
          dEl.textContent = desc;
        }
        if (
          FIELD[key].type === "select" ||
          FIELD[key].type === "channel" ||
          FIELD[key].type === "voice"
          || FIELD[key].type === "role"
        ) {
          var currentValue = domValue(key);
          ctrl.innerHTML = selectOptionsHtml(key, currentValue, meta);
          ctrl.value = currentValue === null ? "" : String(currentValue);
        }
      });
      var back = document.getElementById("dashBack");
      if (back) back.textContent = t("dashboard.back");
      refresh(); // recomputa o rótulo do Guardar (usa a baseline/contagem do closure)
    };
  }

  function loadGuilds() {
    renderSkeleton("picker");
    fetchWithTimeout(API + "/api/dashboard/guilds", { headers: authHeaders() })
      .then(function (res) {
        if (res.status === 401) {
          clearToken();
          renderLogin("dashboard.expired");
          return null;
        }
        if (!res.ok) {
          renderMessage("dashboard.error", "", { retry: true, onRetry: boot });
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        var guilds = data.guilds || [];
        if (!guilds.length) {
          renderMessage("dashboard.none", "dashboard.noneHint", { addServer: true });
          return;
        }
        renderPicker(guilds);
      })
      .catch(function () {
        renderMessage("dashboard.error", "", { retry: true, onRetry: boot });
      });
  }

  async function boot() {
    showPickerShell();
    // Authentication belongs to /account. The TTS dashboard must consume the
    // shared HttpOnly ecosystem session instead of opening a second OAuth flow.
    await waitForSharedSession();
    loadGuilds();
  }

  window.addEventListener("vozen:languagechange", function () {
    if (typeof onLang === "function") onLang();
  });

  boot();
})();
