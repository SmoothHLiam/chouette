/* Chouette ! — boot. */
(function (global) {
  "use strict";
  var App = global.App;

  App.Router.register("play", function (host, params) {
    App.Shell.play(host, params.id, params);
  });

  function boot() {
    var root = document.getElementById("app");
    App.Router.mount(root);

    // Who is signed in decides which profile the whole app reads from.
    App.Accounts.boot();
    var account = App.Accounts.active();
    if (account) App.State.use(account);

    // The inline script in index.html already applied these before the first
    // paint; this hands them to the rest of the app.
    App.Skin.boot();
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

    // Sync is best-effort: probe it, resend anything the network ate, and
    // never let either step hold up the first screen.
    App.Sync.probe().then(function (online) {
      if (online) App.Sync.flush();
    });

    // Role first, then the level question, then the game.
    App.Router.go(account ? App.afterSignIn() : "role");

    var splash = document.getElementById("splash");
    if (splash) splash.classList.add("gone");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
