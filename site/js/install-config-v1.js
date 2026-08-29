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
    // The API owns the Discord client secret, signed state and HttpOnly
    // session. `tts-install-v1.js` only adds an allow-listed source to this
    // public endpoint; it never receives credentials.
    ttsStartEndpoint: "https://api.vozen.org/api/install/tts/start"
  });
}());
