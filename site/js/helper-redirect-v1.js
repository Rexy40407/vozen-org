(function () {
  "use strict";

  var incomingHash = window.location.hash || "";
  var safeHash = /^#\/(?:servers|config\/[A-Za-z0-9._~-]+)$/.test(incomingHash)
    ? incomingHash
    : "";
  window.location.replace("/panel/helper-tracker/" + safeHash);
})();
