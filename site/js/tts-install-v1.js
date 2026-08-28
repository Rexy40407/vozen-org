(function () {
  "use strict";
  var allowedSources = new Set(["home", "tts-hero", "tts-pricing", "commands", "topgg"]);
  var endpoint = String((window.VOZEN_INSTALL || {}).ttsStartEndpoint || "").trim();
  var trustedEndpoint = /^https:\/\/api\.vozen\.org\/api\/install\/tts\/start$/.test(endpoint);

  window.vozenTtsInstallHref = function (source) {
    if (!trustedEndpoint || !allowedSources.has(source)) return null;
    return endpoint + "?source=" + encodeURIComponent(source);
  };

  if (!trustedEndpoint) return;
  document.querySelectorAll("a[data-tts-install-source]").forEach(function (anchor) {
    var href = window.vozenTtsInstallHref(anchor.dataset.ttsInstallSource);
    if (!href) return;
    anchor.href = href;
    // The OAuth callback should stay in the same browsing context, so users
    // return directly to the post-install success guide.
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  });
}());
