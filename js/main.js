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

    /* Registers the service worker and watches for the install prompt. Does
     * nothing at all from a file:// page, which is still a supported way to
     * open the game. */
    App.Install.boot();

    /* Restores a teacher's Firebase session, and only on a device that has
     * signed in before — so a student never downloads the SDK at all. Entirely
     * in the background: the app has already drawn by the time it answers. */
    App.Auth.resume().then(function (res) {
      var who = res && res.user;
      if (res && res.redirected) {
        /* Back from Google, signed in. This page load is the second half of
         * a sign-in that began on a screen that no longer exists, so finish
         * it here — otherwise the teacher lands on the role picker having
         * apparently done nothing. */
        if (who) { App.landTeacher(who); return; }
        /* Came back without a session: send them to the sign-in screen, where
         * App.Auth.redirectError() explains why. */
        App.Router.go("signin", { role: "teacher" });
        return;
      }
      if (!who) return;
      var account = App.Accounts.byAuthUid(who.uid);
      if (account && App.Accounts.active() && App.Accounts.active().id === account.id) {
        App.Sync.syncAccount();
      }
    });

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
