(function () {
  "use strict";

  var allowedOutcomes = new Set(["installed", "cancelled", "oauth_failed", "guild_missing"]);
  var titles = {
    installed: "Vozen TTS is in your server",
    cancelled: "Installation cancelled",
    oauth_failed: "Discord authorization failed",
    guild_missing: "Choose a server to finish",
  };
  var expectedFlags = {
    installed: "1",
    cancelled: "0",
    oauth_failed: "0",
    guild_missing: "0",
  };
  var query = new URLSearchParams(window.location.search || "");
  var outcome = query.get("install");
  var installed = query.get("installed");

  if (!allowedOutcomes.has(outcome) || installed !== expectedFlags[outcome]) {
    window.location.replace("/dashboard.html");
    return;
  }

  var title = document.getElementById("install-title");
  if (title) title.textContent = titles[outcome];
  document.title = titles[outcome] + " — Vozen";

  document.querySelectorAll("[data-install-outcome]").forEach(function (section) {
    section.hidden = section.getAttribute("data-install-outcome") !== outcome;
  });
})();
