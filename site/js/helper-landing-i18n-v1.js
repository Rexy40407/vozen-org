/* Localizes the static Helper product story with the same catalogue as the
   account and authenticated Helper workspace. */
(function () {
  "use strict";

  if (!document.body.classList.contains("helper-page")) return;

  const supported = ["en", "pt", "fr", "es", "de", "tr", "ar", "zh", "ru", "ko"];
  const htmlLocale = (locale) => ({ pt: "pt-PT", zh: "zh-Hant" })[locale] || locale;
  const currentLocale = () => {
    try {
      const routeLocale = document.documentElement.dataset.vozenLocale;
      if (supported.includes(routeLocale)) return routeLocale;
      const value = localStorage.getItem("vozen.lang") || "en";
      return supported.includes(value) && window.VOZEN_I18N?.[value] ? value : "en";
    } catch (_) { return "en"; }
  };
  const text = (key, fallback) => window.VOZEN_I18N?.[currentLocale()]?.[key]
    || window.VOZEN_I18N?.en?.[key]
    || fallback
    || key;
  const setText = (selector, key, fallback, root) => {
    const element = (root || document).querySelector(selector);
    if (!element) return;
    const value = text(key, fallback || element.textContent);
    if (element.textContent !== value) element.textContent = value;
  };
  const setTextPreservingChildren = (selector, key, fallback, root) => {
    const element = (root || document).querySelector(selector);
    if (!element) return;
    const value = text(key, fallback || element.textContent);
    const nodes = [...element.childNodes].filter((node) => node.nodeType === 3);
    if (!nodes.length) {
      element.textContent = value;
      return;
    }
    const target = nodes[nodes.length - 1];
    const leading = String(target.nodeValue || '').match(/^\s*/)?.[0] || '';
    const trailing = String(target.nodeValue || '').match(/\s*$/)?.[0] || '';
    const nextValue = `${leading}${value}${trailing}`;
    if (target.nodeValue !== nextValue) target.nodeValue = nextValue;
  };
  const setAll = (selector, fn) => document.querySelectorAll(selector).forEach(fn);
  const setAttribute = (selector, attribute, key, fallback) => {
    const element = document.querySelector(selector);
    if (element) element.setAttribute(attribute, text(key, fallback || element.getAttribute(attribute)));
  };

  const moduleLabels = {
    core: "helper.moduleCore",
    security: "helper.moduleProtection",
    support: "helper.moduleSupport",
    events: "helper.moduleEvents",
    community: "helper.moduleCommunity",
    automate: "helper.moduleAutomation",
    insights: "helper.moduleInsights",
    studio: "helper.moduleStudio",
  };
  const moduleCopy = {
    core: ["helper.landing.moduleCoreTitle", "helper.landing.moduleCoreBody"],
    security: ["helper.landing.moduleSecurityTitle", "helper.landing.moduleSecurityBody"],
    support: ["helper.landing.moduleSupportTitle", "helper.landing.moduleSupportBody"],
    events: ["helper.landing.moduleEventsTitle", "helper.landing.moduleEventsBody"],
    community: ["helper.landing.moduleCommunityTitle", "helper.landing.moduleCommunityBody"],
    automate: ["helper.landing.moduleAutomateTitle", "helper.landing.moduleAutomateBody"],
    insights: ["helper.landing.moduleInsightsTitle", "helper.landing.moduleInsightsBody"],
    studio: ["helper.landing.moduleStudioTitle", "helper.landing.moduleStudioBody"],
  };
  const outcomeCopy = [
    ["helper.landing.protect", "helper.landing.protectText", "Explore Security"],
    ["helper.moduleSupport", "helper.landing.supportText", "Explore Support"],
    ["helper.landing.run", "helper.landing.runText", "Explore Insights"],
  ];
  const setupCopy = [
    ["helper.landing.chooseModules", "helper.landing.chooseModulesText"],
    ["helper.landing.confirmPermissions", "helper.landing.confirmPermissionsText"],
    ["helper.landing.configureMonitor", "helper.landing.configureMonitorText"],
  ];

  function apply() {
    document.documentElement.lang = htmlLocale(currentLocale());
    document.documentElement.dir = currentLocale() === "ar" ? "rtl" : "ltr";
    document.title = text("helper.landing.documentTitle", "Vozen Helper — Available now");

    setTextPreservingChildren(".helper-available", "helper.landing.available");
    setText("#helper-title span:nth-child(1)", "helper.landing.heroTitle1");
    setText("#helper-title span:nth-child(2)", "helper.landing.heroTitle2");
    setText(".helper-hero__lede", "helper.landing.heroLede");
    setTextPreservingChildren(".helper-private-action", "helper.landing.getStarted");
    setTextPreservingChildren(".helper-explore-action", "helper.landing.exploreModules");
    setText(".helper-hero__proof", "helper.landing.proof");

    const tasks = [
      ["security", "helper.landing.securityCheck", "helper.landing.protected"],
      ["ticket", "helper.landing.ticketRouted", "helper.landing.support"],
      ["event", "helper.landing.eventReady", "helper.landing.members"],
      ["workflow", "helper.landing.workflowRan", "helper.landing.replied"],
      ["insight", "helper.landing.weeklyPulse", "helper.landing.healthy"],
    ];
    tasks.forEach(([name, titleKey, detailKey]) => {
      setText(`.helper-task--${name} b`, titleKey);
      setText(`.helper-task--${name} small`, detailKey);
    });
    setText(".helper-console__channel", "helper.landing.operations");
    setText(".helper-console__preview", "helper.landing.preview");
    setText(".helper-console__heading span", "helper.landing.serverPulse");
    setText(".helper-console__heading strong", "helper.landing.everythingView");
    setTextPreservingChildren(".helper-console__live", "helper.landing.live");
    const consoleEvents = [
      ["security", "helper.landing.securityCheck", "helper.landing.protected", "helper.landing.active"],
      ["support", "helper.landing.ticketRouted", "helper.landing.support", "helper.landing.now"],
      ["event", "helper.landing.eventReady", "helper.landing.members", "helper.landing.now"],
    ];
    consoleEvents.forEach(([name, titleKey, detailKey, stateKey]) => {
      const event = document.querySelector(`.helper-console-event--${name}`);
      if (!event) return;
      setText(`.helper-console-event--${name} strong`, titleKey);
      setText(`.helper-console-event--${name} small`, detailKey);
      setText(`.helper-console-event--${name} .helper-console-event__state`, stateKey);
      setText(`.helper-console-event--${name} .helper-console-event__time`, stateKey);
    });

    setText("[data-console-module=security]", "helper.moduleProtection");
    setText("[data-console-module=support]", "helper.moduleSupport");
    setText("[data-console-module=events]", "helper.moduleEvents");
    setText("[data-console-module=insights]", "helper.moduleInsights");

    setText("#outcomes-title", "helper.landing.outcomesTitle");
    setText(".helper-outcomes .helper-kicker", "helper.landing.whatFor");
    document.querySelectorAll(".helper-outcome").forEach((outcome, index) => {
      const copy = outcomeCopy[index];
      if (!copy) return;
      const title = outcome.querySelector("h3");
      const body = outcome.querySelector("p");
      const link = outcome.querySelector("a");
      if (title) title.textContent = text(copy[0], title.textContent);
      if (body) body.textContent = text(copy[1], body.textContent);
      if (link) {
        const linkKey = index === 0 ? "helper.landing.exploreProtection" : index === 1 ? "helper.landing.exploreSupport" : "helper.landing.exploreInsights";
        link.textContent = `${text(linkKey, text("helper.landing.exploreModules", "Explore the modules"))} ↗`;
      }
    });

    setText("#modules-title", "helper.landing.explorerTitle");
    setText(".helper-explorer .helper-kicker", "helper.landing.moduleMap");
    setText(".helper-section-heading--split > p", "helper.landing.explorerText");
    setAttribute(".helper-module-nav", "aria-label", "helper.landing.moduleMap");
    document.querySelectorAll(".helper-module-tab").forEach((tab) => {
      const id = tab.dataset.module;
      if (!id) return;
      setText(`#${tab.id} b`, moduleLabels[id]);
      setText(`#${tab.id} small`, "helper.landing.commandSurface");
    });
    Object.keys(moduleCopy).forEach((id) => {
      const panel = document.querySelector(`[data-panel="${id}"]`);
      if (!panel) return;
      const [titleKey, bodyKey] = moduleCopy[id];
      const title = panel.querySelector("h3");
      const body = panel.querySelector("p:not(.helper-command)");
      if (title) title.textContent = text(titleKey, title.textContent);
      if (body) body.textContent = text(bodyKey, body.textContent);
      setText(`[data-panel="${id}"] .helper-module-panel__top .helper-kicker`, moduleLabels[id]);
      setText(`[data-panel="${id}"] .helper-module-state`, "helper.landing.moduleState");
      setText(`[data-panel="${id}"] .helper-command span`, "helper.landing.commandSurface");
      panel.querySelectorAll(".helper-feature-list li").forEach((item, index) => {
        item.textContent = text(`helper.landing.bullet${Math.min(index + 1, 4)}`, item.textContent);
      });
    });

    setText("#setup-title", "helper.landing.setupTitle");
    setText(".helper-setup .helper-kicker", "helper.landing.ready");
    document.querySelectorAll(".helper-setup__steps li").forEach((step, index) => {
      const copy = setupCopy[index];
      if (!copy) return;
      setText("h3", copy[0], undefined, step);
      setText("p", copy[1], undefined, step);
    });
    setText("#access-title", "helper.landing.accessTitle");
    setText(".helper-access .helper-kicker", "helper.landing.access");
    setText(".helper-access > div p", "helper.landing.accessText");
    setTextPreservingChildren(".helper-access__badge", "helper.landing.available");

    setText("#helper-plans-title", "premium.title");
    setText(".helper-pricing__heading .eyebrow", "premium.pricing");
    setText(".helper-pricing__heading p", "premium.subtitle");
    setTextPreservingChildren(".helper-pricing .payments-paused", "helper.landing.paymentsPaused");
    setText(".helper-pricing .price-card--free h3", "price.free.name");
    setText(".helper-pricing .price-card--free .price-card__pitch", "helper.landing.freePitch");
    setText(".helper-pricing .price-card--free .price-card__note", "helper.landing.freeNote");
    setText(".helper-pricing .price-card--free .price-card__idnote", "helper.landing.startNote");
    setText(".helper-pricing .price-card--pro h3", "price.pro.name");
    setText(".helper-pricing .price-card--pro .price-card__pitch", "premium.premiumPitch");
    setText(".helper-pricing .price-card--pro .price-card__scope-note", "helper.landing.scopeNote");
    setText(".helper-pricing .price-card--pro .price-card__note", "price.digital");
    setAll(".helper-pricing .price-card__buy--disabled", (button) => { button.textContent = text("price.checkout", "Payments temporarily disabled"); });
    setAll(".helper-pricing .price-card__highlights", (list) => list.setAttribute("aria-label", text("helper.landing.freeHighlights", "Free plan highlights")));
    setText(".helper-plan-comparison__header .helper-kicker", "helper.landing.planComparison");
    setText("#helper-plan-comparison-title", "helper.landing.comparisonTitle");
    setText(".helper-plan-comparison__header > div p", "helper.landing.comparisonText");
    setTextPreservingChildren(".helper-plan-comparison__status", "helper.landing.paymentsPaused");
    setAttribute(".helper-plan-comparison__caption", "aria-label", "helper.landing.comparisonTitle");
    setAll(".helper-plan-comparison__mark--yes", (mark) => mark.setAttribute("aria-label", text("helper.landing.included", "Included")));
    setAll(".helper-plan-comparison__mark--no", (mark) => mark.setAttribute("aria-label", text("helper.landing.notIncluded", "Not included")));

    setAll(".eco-footer__links a", (link) => {
      const href = link.getAttribute("href") || "";
      const key = href.includes("privacy") ? "foot.privacy" : "foot.terms";
      link.textContent = text(key, link.textContent);
    });
  }

  window.addEventListener("vozen:i18nready", apply);
  window.addEventListener("vozen:languagechange", apply);
  Promise.resolve(window.vozenPublicI18nReady).then(apply).catch(apply);
})();
