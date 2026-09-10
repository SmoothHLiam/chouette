/* Chouette ! — boot. */
(function (global) {
  "use strict";
  var App = global.App;

  App.Router.register("play", function (host, params) {
    App.Shell.play(host, params.id);
  });

  function boot() {
    var root = document.getElementById("app");
    App.Router.mount(root);
    App.UI.applyTheme(App.State.profile.theme);
    App.Speech.warm();

    // The audio context can only start from a real gesture.
    var unlock = function () {
      App.Sound.unlock();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);

    App.Quests.ensureToday();

    // The level question is always the first thing a new player sees.
    App.Router.go(App.State.profile.level ? "home" : "level");

    var splash = document.getElementById("splash");
    if (splash) splash.classList.add("gone");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
