(function () {
  "use strict";

  var page = document.body;
  var config = window.VOZEN_PUBLIC_ANALYTICS || {};
  var token = String(config.cloudflareBeaconToken || "").trim();

  // Private routes never opt in. A strict shape check also prevents an
  // accidental string from becoming a script attribute.
  if (!page || page.dataset.vozenPublicAnalytics !== "true") return;
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(token)) return;
  if (document.querySelector("script[data-vozen-cloudflare-analytics]")) return;

  var beacon = document.createElement("script");
  beacon.defer = true;
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.dataset.cfBeacon = JSON.stringify({ token: token });
  beacon.dataset.vozenCloudflareAnalytics = "true";
  document.head.appendChild(beacon);
})();
