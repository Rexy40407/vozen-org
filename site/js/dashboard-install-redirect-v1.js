(function () {
  "use strict";

  var TTS_INSTALL_START = "https://api.vozen.org/api/install/tts/start?source=home";
  var query = new URLSearchParams(window.location.search || "");
  if (query.get("add") === "1") {
    window.location.replace(TTS_INSTALL_START);
  }
})();
