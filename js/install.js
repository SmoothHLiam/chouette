/* Chouette ! — installing the app, and keeping it working offline.
 *
 * A student who has added Chouette to their home screen has an app, not a link
 * their teacher sent once in September. And because every game, word and
 * conjugation rule is a static file, the installed copy works with no signal at
 * all — on a bus, in a cafeteria, on school wifi that half works. Only the
 * class sync needs the network, and it already copes with not having it.
 *
 * All of this is best-effort and entirely optional: opened from a file:// page,
 * or in a browser with no service workers, the app behaves exactly as before.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var deferred = null;          // the browser's own install prompt, if offered
  var waiting = null;           // a new version sitting ready to take over
  var listeners = [];

  function canRegister() {
    if (!global.navigator || !global.navigator.serviceWorker) return false;
    /* Service workers need http(s). Double-clicking index.html is a supported
     * way to use this app, and must not produce an error in the console. */
    var p = global.location && global.location.protocol;
    return p === "https:" || p === "http:";
  }

  /** True when the app is already running from the home screen. */
  function installed() {
    if (global.navigator && global.navigator.standalone) return true;   // iOS
    if (!global.matchMedia) return false;
    return global.matchMedia("(display-mode: standalone)").matches ||
           global.matchMedia("(display-mode: fullscreen)").matches ||
           global.matchMedia("(display-mode: minimal-ui)").matches;
  }

  /** iOS has no install prompt: it is a menu item the person has to find. */
  function iOS() {
    var ua = global.navigator ? global.navigator.userAgent || "" : "";
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    /* An iPad reports itself as a Mac; touch points give it away. */
    return /Macintosh/.test(ua) && global.navigator &&
      global.navigator.maxTouchPoints > 1;
  }

  function changed() {
    listeners.forEach(function (fn) {
      try { fn(); } catch (e) { /* a listener must not break the others */ }
    });
  }

  function register() {
    if (!canRegister()) return;
    global.navigator.serviceWorker.register("sw.js").then(function (reg) {
      if (reg.waiting) { waiting = reg.waiting; changed(); }
      reg.addEventListener("updatefound", function () {
        var incoming = reg.installing;
        if (!incoming) return;
        incoming.addEventListener("statechange", function () {
          /* "installed" with a controller already in place means this is an
           * update rather than the very first install. */
          if (incoming.state === "installed" && global.navigator.serviceWorker.controller) {
            waiting = incoming;
            changed();
            if (App.UI) {
              App.UI.toast("Nouvelle version prête — recharge la page.", "✨");
            }
          }
        });
      });
    }).catch(function () {
      /* Blocked by the browser or the school's policy. Nothing breaks. */
    });
  }

  App.Install = {
    /** Called once at boot. */
    boot: function () {
      register();
      global.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault();               // keep the mini-infobar out of the way
        deferred = e;
        changed();
      });
      global.addEventListener("appinstalled", function () {
        deferred = null;
        changed();
        if (App.UI) App.UI.toast("Chouette ! est installée 🦉", "📲", "good");
      });
    },

    installed: installed,
    iOS: iOS,
    offlineReady: canRegister,

    /** True when we can put up a one-tap install button. */
    canPrompt: function () { return !!deferred; },

    /** Shows the browser's install dialogue. Resolves to true if they said yes. */
    prompt: function () {
      if (!deferred) return Promise.resolve(false);
      var e = deferred;
      deferred = null;
      changed();
      e.prompt();
      return e.userChoice.then(function (choice) {
        return choice && choice.outcome === "accepted";
      }, function () { return false; });
    },

    /** True when a newer version is installed and waiting for a reload. */
    updateReady: function () { return !!waiting; },

    /** Hands over to the waiting version and reloads onto it. */
    update: function () {
      if (!waiting) { global.location.reload(); return; }
      waiting.postMessage("skip-waiting");
      waiting = null;
      /* controllerchange fires once the new worker takes over. */
      var done = false;
      global.navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (done) return;
        done = true;
        global.location.reload();
      });
      setTimeout(function () { if (!done) { done = true; global.location.reload(); } }, 1500);
    },

    /** Re-render a screen when any of this changes. Returns an unsubscribe. */
    onChange: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (other) { return other !== fn; });
      };
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Install;
})(typeof window !== "undefined" ? window : globalThis);
