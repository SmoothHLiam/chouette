/* Chouette ! — real sign-in, for teachers only.
 *
 * Why this exists: a class used to live on whichever laptop created it. Lose
 * the laptop, lose the class. An account fixes that and nothing else.
 *
 * Why it is only teachers: students join with a class code and a display name,
 * and that stays true. Collecting an email from a minor is a legal obligation,
 * not a feature, and nothing here needs one.
 *
 * Three rules this module keeps:
 *
 *   1. The SDK is downloaded the first time somebody actually tries to sign
 *      in — never at boot. Students never fetch it, the game still opens from
 *      a file:// page, and an offline app is not waiting on Google's CDN.
 *   2. Signing in is optional, always. Every failure path here ends with the
 *      app working the way it did before, on the device token.
 *   3. We never see a password. Firebase takes it; we get a signed token that
 *      says who somebody is, and the Worker checks the signature itself.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var CDN = "https://www.gstatic.com/firebasejs/";
  var loading = null;                 // the in-flight SDK load, if any
  var auth = null;                    // firebase.auth(), once ready
  var user = null;                    // the signed-in Firebase user, or null
  var listeners = [];

  /**
   * The config, with authDomain pointed at this host when this host proxies
   * Firebase's sign-in handler. See proxiedAuthHosts in js/firebase-config.js
   * for why that is not cosmetic: cross-origin, the handler cannot read the
   * state it wrote before the redirect, and Google sign-in dies on the way
   * back with "missing initial state".
   */
  function config() {
    var base = App.FIREBASE || {};
    var host = global.location && global.location.hostname;
    var proxied = base.proxiedAuthHosts || [];
    if (!host || proxied.indexOf(host) === -1) return base;
    var copy = {};
    Object.keys(base).forEach(function (key) { copy[key] = base[key]; });
    copy.authDomain = host;
    return copy;
  }

  /** Configured at all? An empty projectId switches the feature off. */
  function configured() {
    var c = config();
    return !!(c.projectId && c.apiKey && c.appId);
  }

  /* Firebase needs a real origin: its popups, its redirects and its token
   * endpoint all do. From a file:// page there is nothing to offer. */
  function supported() {
    if (!configured()) return false;
    var p = global.location && global.location.protocol;
    return p === "https:" || p === "http:";
  }

  function changed() {
    listeners.forEach(function (fn) {
      try { fn(App.Auth.user()); } catch (e) { /* one listener must not break the rest */ }
    });
  }

  function script(src) {
    return new Promise(function (resolve, reject) {
      var tag = document.createElement("script");
      tag.src = src;
      tag.async = true;
      tag.onload = resolve;
      tag.onerror = function () { reject(new Error("script-failed")); };
      document.head.appendChild(tag);
    });
  }

  /**
   * Fetches the SDK and initialises it. Repeated calls share one load.
   * Rejects — rather than hanging — when the CDN is unreachable, which is
   * what happens offline and on a school network that blocks gstatic.
   */
  function ready() {
    if (auth) return Promise.resolve(auth);
    if (loading) return loading;
    if (!supported()) return Promise.reject(new Error("unsupported"));

    var base = CDN + config().sdkVersion + "/";
    loading = script(base + "firebase-app-compat.js")
      .then(function () { return script(base + "firebase-auth-compat.js"); })
      .then(function () {
        if (!global.firebase || !global.firebase.initializeApp) {
          throw new Error("script-failed");
        }
        if (!global.firebase.apps.length) global.firebase.initializeApp(config());
        auth = global.firebase.auth();
        /* Survives a reload without another round trip to Google. */
        auth.onAuthStateChanged(function (who) {
          user = who || null;
          changed();
        });
        return auth;
      })
      .catch(function (e) {
        loading = null;               // let a later attempt try again
        throw e;
      });
    return loading;
  }

  function googleProvider() {
    var provider = new global.firebase.auth.GoogleAuthProvider();
    /* Always ask which account, rather than silently reusing whichever Google
     * session the browser happens to hold — classroom computers are shared. */
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  /* Where a popup cannot open, or opens somewhere the person will never find
   * it. An installed app has no browser chrome to host one; a phone turns it
   * into a tab that looks like the app simply stopped responding. */
  function prefersRedirect() {
    if (global.navigator && global.navigator.standalone) return true;      // iOS home screen
    if (global.matchMedia &&
        (global.matchMedia("(display-mode: standalone)").matches ||
         global.matchMedia("(display-mode: fullscreen)").matches ||
         global.matchMedia("(display-mode: minimal-ui)").matches)) return true;
    var ua = (global.navigator && global.navigator.userAgent) || "";
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  }

  /* Popup failures that are worth retrying as a redirect. A closed popup is
   * not one of them: that was the person changing their mind. */
  var POPUP_FAILURES = {
    "auth/popup-blocked": true,
    "auth/operation-not-supported-in-this-environment": true,
    "auth/web-storage-unsupported": true,
    "auth/internal-error": true
  };

  /* Firebase's error codes, in words a teacher can act on. */
  var MESSAGES = {
    "auth/invalid-email": "Cette adresse e-mail n'est pas valide.",
    "auth/user-disabled": "Ce compte a été désactivé.",
    "auth/user-not-found": "Aucun compte avec cette adresse. Crée-en un ci-dessous.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/invalid-credential": "Adresse ou mot de passe incorrect.",
    "auth/email-already-in-use": "Un compte existe déjà avec cette adresse. Connecte-toi.",
    "auth/weak-password": "Choisis un mot de passe d'au moins six caractères.",
    "auth/popup-closed-by-user": "",
    "auth/cancelled-popup-request": "",
    "auth/popup-blocked": "Ton navigateur a bloqué la fenêtre Google. Autorise les pop-ups et réessaie.",
    "auth/unauthorized-domain": "Ce domaine n'est pas autorisé dans la console Firebase.",
    "auth/network-request-failed": "Pas de connexion. Tu peux continuer sans compte.",
    "auth/too-many-requests": "Trop de tentatives. Attends une minute et réessaie."
  };

  function explain(error) {
    if (!error) return "La connexion a échoué.";
    if (error.message === "unsupported") {
      return "La connexion a besoin d'une adresse web. Ouvre le site plutôt que le fichier.";
    }
    if (error.message === "script-failed") {
      return "Impossible de charger la connexion. Vérifie ta connexion internet.";
    }
    var code = error.code || "";
    if (MESSAGES.hasOwnProperty(code)) return MESSAGES[code];
    return "La connexion a échoué. Réessaie.";
  }

  /* Wraps a Firebase call so callers get { ok } or { ok:false, error } rather
   * than a thrown object with a code on it. A blank message means the person
   * cancelled, which is not an error to show them.
   *
   * The user is taken from the credential Firebase hands back, NOT from the
   * onAuthStateChanged listener: both happen, but nothing promises the
   * listener runs first, and when it does not the caller gets a resolved
   * "signed in" with nobody attached. */
  function attempt(run) {
    return ready()
      .then(run)
      .then(function (result) {
        var who = (result && result.user) || (auth && auth.currentUser) || null;
        if (who && who !== user) { user = who; changed(); }
        return { ok: true, user: App.Auth.user() };
      })
      .catch(function (e) {
        var message = explain(e);
        return { ok: false, error: message, cancelled: message === "",
                 code: (e && e.code) || e.message || "" };
      });
  }

  App.Auth = {
    configured: configured,
    supported: supported,

    /** Who is signed in, in our own shape. Null when nobody is. */
    user: function () {
      if (!user) return null;
      return {
        uid: user.uid,
        email: user.email || "",
        name: user.displayName || "",
        emailVerified: !!user.emailVerified
      };
    },

    signedIn: function () { return !!user; },

    /**
     * Restores a previous session, and catches a teacher coming back from
     * Google. Resolves to { user, redirected }.
     *
     * Loads the SDK ONLY when this device has signed in before or is mid
     * sign-in, so a student who has never done either never fetches it.
     */
    resume: function () {
      var wasRedirected = pending();
      if (!supported() || (!remembered() && !wasRedirected)) {
        return Promise.resolve({ user: null, redirected: false });
      }
      return ready().then(function () {
        /* Ask for the redirect result FIRST. It is what completes a sign-in
         * that started on a different page load, and it only answers once. */
        if (!wasRedirected) return null;
        return auth.getRedirectResult().then(function (result) {
          pending(false);
          if (result && result.user) {
            user = result.user;
            remember(true);
            changed();
            return result.user;
          }
          return null;
        }, function (e) {
          /* Came back from Google and it still would not complete. Say so —
           * silence here looks exactly like the app ignoring the teacher. */
          pending(false);
          lastRedirectError = explain(e) || "La connexion Google n'a pas abouti.";
          return null;
        });
      }).then(function (fromRedirect) {
        if (fromRedirect) return { user: App.Auth.user(), redirected: true };
        /* onAuthStateChanged fires once the SDK has checked its stored
         * session; wait for that first answer rather than reporting "nobody". */
        return new Promise(function (resolve) {
          var stop = auth.onAuthStateChanged(function () {
            stop();
            /* `redirected` says where this page load came from, not whether it
             * worked. A trip to Google that came back empty still has to be
             * recognisable, or the teacher lands on the role picker with no
             * idea what happened to their sign-in. */
            resolve({ user: App.Auth.user(), redirected: wasRedirected });
          });
        });
      }).catch(function () { return { user: null, redirected: wasRedirected }; });
    },

    /** Whether this page load is the tail of a Google redirect. */
    returning: function () { return pending(); },

    /** Why the trip to Google failed, if it did. Read once, after resume(). */
    redirectError: function () {
      var message = lastRedirectError;
      lastRedirectError = "";
      return message;
    },

    createAccount: function (email, password, name) {
      return attempt(function () {
        return auth.createUserWithEmailAndPassword(email, password).then(function (result) {
          remember(true);
          if (!name || !result.user) return result;
          /* A failed name is not a failed sign-up: keep the credential. */
          return result.user.updateProfile({ displayName: name })
            .then(function () { return result; }, function () { return result; });
        });
      });
    },

    signIn: function (email, password) {
      return attempt(function () {
        return auth.signInWithEmailAndPassword(email, password).then(function (result) {
          remember(true);
          return result;
        });
      });
    },

    /**
     * Google sign-in, by whichever route this browser can actually manage.
     *
     * A popup is nicer — you stay on the page — but there are places it simply
     * cannot open: an installed PWA has no browser chrome to put one in, and
     * mobile browsers treat it as an unwanted tab. There the only route is to
     * leave, sign in, and come back, which `resume()` picks up at boot.
     *
     * A popup that fails for any reason falls through to the same redirect
     * rather than dead-ending on an error the teacher cannot act on.
     */
    signInWithGoogle: function () {
      if (prefersRedirect()) return App.Auth.signInWithGoogleRedirect();
      return attempt(function () {
        return auth.signInWithPopup(googleProvider()).then(function (result) {
          remember(true);
          return result;
        });
      }).then(function (res) {
        if (res.ok || res.cancelled) return res;
        if (!POPUP_FAILURES[res.code]) return res;
        /* The popup could not open. Leaving the page is the only way left. */
        return App.Auth.signInWithGoogleRedirect();
      });
    },

    /** True when Google sign-in will leave the page rather than open a popup. */
    willRedirect: function () { return supported() && prefersRedirect(); },

    /** Leaves the page for Google. Nothing after this runs; the browser goes. */
    signInWithGoogleRedirect: function () {
      return ready().then(function () {
        pending(true);
        /* This promise usually never settles — the browser navigates away
         * first. Anything the person should see has to be on screen already,
         * which is what willRedirect() is for. */
        auth.signInWithRedirect(googleProvider());
        return { ok: false, leaving: true, cancelled: true };
      }).catch(function (e) {
        pending(false);
        var message = explain(e);
        return { ok: false, error: message, cancelled: message === "" };
      });
    },

    sendReset: function (email) {
      return attempt(function () { return auth.sendPasswordResetEmail(email); });
    },

    signOut: function () {
      remember(false);
      if (!auth) { user = null; changed(); return Promise.resolve({ ok: true }); }
      return auth.signOut().then(function () { return { ok: true }; },
        function () { return { ok: false }; });
    },

    /**
     * A fresh ID token for the Worker, or "" when nobody is signed in.
     * Firebase refreshes it behind this call, so it is safe to ask every time
     * and wrong to cache.
     */
    token: function () {
      if (!user) return Promise.resolve("");
      return user.getIdToken().then(function (t) { return t || ""; },
        function () { return ""; });
    },

    /** Re-render when somebody signs in or out. Returns an unsubscribe. */
    onChange: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (other) { return other !== fn; });
      };
    },

    /* Exposed for the tests, which stand in their own fake SDK. */
    _reset: function () { loading = null; auth = null; user = null; listeners = []; }
  };

  /* A one-bit note that this device has signed in before, so boot knows
   * whether fetching the SDK is worth it. Firebase keeps the real session. */
  var FLAG = "chouette.auth.v1";
  /* And a second one, set just before leaving for Google. Without it, the page
   * that comes back has no idea it is the second half of a sign-in. */
  var PENDING_FLAG = "chouette.auth.pending.v1";
  var lastRedirectError = "";

  function pending(on) {
    try {
      if (on === undefined) return global.sessionStorage.getItem(PENDING_FLAG) === "1";
      if (on) global.sessionStorage.setItem(PENDING_FLAG, "1");
      else global.sessionStorage.removeItem(PENDING_FLAG);
    } catch (e) { /* storage blocked — the redirect still works, silently */ }
    return false;
  }

  function remembered() {
    try { return global.localStorage.getItem(FLAG) === "1"; } catch (e) { return false; }
  }

  function remember(on) {
    try {
      if (on) global.localStorage.setItem(FLAG, "1");
      else global.localStorage.removeItem(FLAG);
    } catch (e) { /* storage blocked — this session only */ }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = App.Auth;
})(typeof window !== "undefined" ? window : globalThis);
