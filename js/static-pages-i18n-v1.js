/* Small i18n bridge for public pages that do not use the main application shell. */
(function () {
  "use strict";

  const supported = new Set(["en", "pt", "fr", "es", "de", "tr", "ar", "zh", "ru", "ko"]);
  const locale = () => {
    try {
      const value = localStorage.getItem("vozen.lang") || "en";
      return supported.has(value) ? value : "en";
    } catch (_) {
      return "en";
    }
  };
  const text = (key, fallback, variables) => {
    const dictionaries = window.VOZEN_I18N || {};
    let value = dictionaries[locale]?.[key] || dictionaries.en?.[key] || fallback || key;
    Object.keys(variables || {}).forEach((name) => {
      value = value.replace(new RegExp("\\{" + name + "\\}", "g"), String(variables[name]));
    });
    return value;
  };
  const apply = () => {
    const current = locale();
    document.documentElement.lang = current;
    document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key) node.textContent = text(key, node.textContent);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      const key = node.getAttribute("data-i18n-aria-label");
      if (key) node.setAttribute("aria-label", text(key, node.getAttribute("aria-label")));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      const key = node.getAttribute("data-i18n-title");
      if (key) node.setAttribute("title", text(key, node.getAttribute("title")));
    });
    const page = document.body.dataset.vozenStaticPage || "";
    const titleKey = page === "not-found" ? "notFound.documentTitle" : page === "privacy" ? "legal.privacyTitle" : page === "terms" ? "legal.termsTitle" : "status.documentTitle";
    document.title = text(titleKey, document.title);
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      const descriptionKey = page === "not-found" ? "notFound.copy" : page === "privacy" ? "legal.privacyDescription" : page === "terms" ? "legal.termsDescription" : "status.metaDescription";
      description.setAttribute("content", text(descriptionKey, description.getAttribute("content")));
    }
  };

  window.VOZEN_PAGE_T = text;
  window.VOZEN_PAGE_I18N_APPLY = apply;
  window.addEventListener("vozen:i18nready", apply);
  window.addEventListener("vozen:languagechange", apply);
  apply();
})();
