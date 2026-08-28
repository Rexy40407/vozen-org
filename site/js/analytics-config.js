/*
 * Public, cookie-free Cloudflare Web Analytics configuration.
 *
 * The beacon token is intentionally public: Cloudflare requires it in the
 * page that sends the aggregate page-view beacon. Leave it empty until the
 * Cloudflare property is ready. Read-only API tokens, account IDs and zone
 * IDs never belong here; they stay on the server that powers the private
 * operator panel.
 */
window.VOZEN_PUBLIC_ANALYTICS = Object.freeze({
  cloudflareBeaconToken: ""
});
