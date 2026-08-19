(function () {
  "use strict";

  // Kept for cached /panel/helper/ URLs. New install links go directly to the
  // API route because Discord must return to the registered server callback.
  var HELPER_INSTALL_URL = "https://api.vozen.org/rust/api/install/start";
  var incomingHash = window.location.hash || "";

  if (incomingHash === "#/servers?add=1") {
    window.location.replace(HELPER_INSTALL_URL);
    return;
  }

  var safeHash = /^#\/(?:servers|config\/[A-Za-z0-9._~-]+)$/.test(incomingHash)
    ? incomingHash
    : "";
  window.location.replace("/panel/helper-tracker/" + safeHash);
})();
