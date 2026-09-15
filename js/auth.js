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

  function config() {
    return App.FIREBASE || {};
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
        return { ok: false, error: message, cancelled: message === "" };
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
     * Restores a previous session, if the SDK is already worth loading.
     * Called at boot ONLY when this device has signed in before, so a student
     * who never has does not fetch the SDK.
     */
    resume: function () {
      if (!supported() || !remembered()) return Promise.resolve(null);
      return ready().then(function () {
        /* onAuthStateChanged fires once the SDK has checked its stored
         * session; wait for that first answer rather than reporting "nobody". */
        return new Promise(function (resolve) {
          var stop = auth.onAuthStateChanged(function () {
            stop();
            resolve(App.Auth.user());
          });
        });
      }).catch(function () { return null; });
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

    signInWithGoogle: function () {
      return attempt(function () {
        var provider = new global.firebase.auth.GoogleAuthProvider();
        /* Always ask which account, rather than silently reusing whichever
         * Google session the browser happens to hold — classroom computers
         * are shared. */
        provider.setCustomParameters({ prompt: "select_account" });
        return auth.signInWithPopup(provider).then(function (result) {
          remember(true);
          return result;
        });
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
