/* Public install routing configuration.
 *
 * This is a public, allow-listed API route, not a credential. The server owns
 * the OAuth client secret, signed state and session cookie. Keeping the
 * production route here makes every marketing CTA start the measured install
 * flow immediately; the static fallback remains available in the CTA code if
 * a deployment ever removes this configuration.
 */
(function () {
  "use strict";
  window.VOZEN_INSTALL = Object.freeze({
    // This opt-in stays empty until the production Discord client secret and
    // signed-state secret are provisioned on the API. `tts-install-v1.js`
    // then preserves each page's tested dashboard fallback instead of sending
    // visitors to a 404 during a partial rollout.
    ttsStartEndpoint: ""
  });
}());
