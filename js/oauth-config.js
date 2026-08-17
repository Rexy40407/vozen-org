(function () {
  "use strict";

  // The Ecosystem application is the only Discord application used for signing in to
  // vozen.org. This is deliberately a public client id; never put a Discord client
  // secret, access token, or refresh token in this static asset.
  var configured = typeof window.VOZEN_ECOSYSTEM_CLIENT_ID === "string"
    ? window.VOZEN_ECOSYSTEM_CLIENT_ID.trim()
    : "";
  var existing = window.VOZEN_ECOSYSTEM_OAUTH && typeof window.VOZEN_ECOSYSTEM_OAUTH === "object"
    ? window.VOZEN_ECOSYSTEM_OAUTH
    : {};
  // Application IDs are public OAuth metadata. Keep the secret server-side only.
  // A window override is retained for preview environments, while production uses
  // the registered Vozen Ecosystem application by default.
  var clientId = typeof existing.clientId === "string" && existing.clientId.trim()
    ? existing.clientId.trim()
    : (configured || "1537738930722443364");

  window.VOZEN_ECOSYSTEM_OAUTH = Object.freeze({
    clientId: clientId,
    // Keep the registered callback on the canonical directory URL. Discord compares
    // redirect URIs exactly, so the Developer Portal must contain this value verbatim.
    redirectUri: new URL("/account/", window.location.href).href,
    // Product dashboards keep their own callback so adding a server with a product
    // bot never sends a product token through the account login flow.
    ttsRedirectUri: new URL("/dashboard/", window.location.href).href,
    helperRedirectUri: new URL("/panel/helper/", window.location.href).href,
    billingRedirectUri: new URL("/", window.location.href).href,
    scopes: "identify email guilds",
  });
}());
