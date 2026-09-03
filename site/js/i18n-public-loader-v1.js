/* Loads only the public locale that the visitor selected, with English as a
   deterministic fallback. Locale bundles extend the same in-memory objects so
   changing language never requires downloading the private workspace copy. */
(function () {
  "use strict";

  var supported = ["en", "pt", "fr", "es", "de", "tr", "ar", "zh", "ru", "ko"];
  var script = document.currentScript;
  var baseUrl = new URL("i18n-public/", script && script.src ? script.src : document.baseURI);
  var pending = {};
  window.VOZEN_I18N = window.VOZEN_I18N || {};

  function safeLocale(value) {
    return supported.indexOf(value) >= 0 ? value : "en";
  }

  function load(locale) {
    locale = safeLocale(locale);
    if (window.VOZEN_I18N[locale]) return Promise.resolve(locale);
    if (pending[locale]) return pending[locale];
    pending[locale] = new Promise(function (resolve, reject) {
      var element = document.createElement("script");
      element.src = new URL(locale + ".js", baseUrl).href;
      element.async = true;
      element.onload = function () { resolve(locale); };
      element.onerror = function () {
        delete pending[locale];
        reject(new Error("Could not load public locale " + locale));
      };
      document.head.appendChild(element);
    });
    return pending[locale];
  }

  var localizedRoute = document.documentElement.getAttribute("data-vozen-localized-route");
  var routeLocale = document.documentElement.getAttribute("data-vozen-locale");
  var selected = routeLocale ? safeLocale(routeLocale) : "en";
  if (!routeLocale) {
    try { selected = safeLocale(localStorage.getItem("vozen.lang") || "en"); } catch (_) {}
  }
  window.vozenLocalizedUrl = localizedRoute ? function (locale) {
    locale = safeLocale(locale);
    var suffix = localizedRoute === "home" ? "" : localizedRoute + "/";
    return "/" + (locale === "en" ? "" : locale + "/") + suffix;
  } : null;
  window.vozenLoadPublicLocale = load;
  window.vozenPublicI18nReady = load("en")
    .then(function () { return selected === "en" ? "en" : load(selected); })
    .catch(function () { return load("en"); });
}());
