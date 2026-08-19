(function () {
  "use strict";

  var HELPER_CLIENT_ID = "1526211106081734666";
  var HELPER_PERMISSIONS = "1099780071606";
  var INSTALL_STATE_KEY = "vozen.helper.install.state";
  var incomingSearch = new URLSearchParams(window.location.search || "");
  var incomingHash = window.location.hash || "";

  function randomState() {
    var bytes = new Uint8Array(24);
    var crypto = window.crypto || window.msCrypto;
    if (!crypto || typeof crypto.getRandomValues !== "function") return null;
    crypto.getRandomValues(bytes);
    return Array.prototype.map
      .call(bytes, function (value) {
        return value.toString(16).padStart(2, "0");
      })
      .join("");
  }

  function clearInstallState() {
    try {
      sessionStorage.removeItem(INSTALL_STATE_KEY);
    } catch (error) {}
  }

  function finishInstallCallback() {
    var code = incomingSearch.get("code");
    var state = incomingSearch.get("state");
    var error = incomingSearch.get("error");
    if (!code && !state && !error) return false;

    var expected = null;
    try {
      expected = sessionStorage.getItem(INSTALL_STATE_KEY);
    } catch (storageError) {}
    clearInstallState();

    // The Discord callback proves that the bot-install flow reached its end. The
    // returned authorization code is deliberately not used by this static page;
    // it is removed before entering the panel and never becomes an API credential.
    if (!error && code && expected && state === expected) {
      window.location.replace("/panel/helper-tracker/#/servers");
    } else {
      window.location.replace("/panel/helper-tracker/#/servers?install=cancelled");
    }
    return true;
  }

  function beginInstall() {
    var state = randomState();
    if (!state) {
      window.location.replace("/panel/helper-tracker/#/servers?install=unavailable");
      return;
    }
    try {
      sessionStorage.setItem(INSTALL_STATE_KEY, state);
    } catch (storageError) {
      window.location.replace("/panel/helper-tracker/#/servers?install=unavailable");
      return;
    }
    var callback = new URL("/panel/helper/", window.location.href).href;
    var authorization = new URL("https://discord.com/oauth2/authorize");
    authorization.searchParams.set("client_id", HELPER_CLIENT_ID);
    authorization.searchParams.set("permissions", HELPER_PERMISSIONS);
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("redirect_uri", callback);
    // `identify` turns this into Discord's Advanced Bot Authorization flow so
    // Discord returns to our registered callback instead of its generic Success page.
    authorization.searchParams.set("scope", "bot applications.commands identify");
    authorization.searchParams.set("integration_type", "0");
    authorization.searchParams.set("state", state);
    window.location.replace(authorization.toString());
  }

  if (finishInstallCallback()) return;
  if (incomingHash === "#/servers?add=1") {
    beginInstall();
    return;
  }

  var safeHash = /^#\/(?:servers|config\/[A-Za-z0-9._~-]+)$/.test(incomingHash)
    ? incomingHash
    : "";
  window.location.replace("/panel/helper-tracker/" + safeHash);
})();
