/* Chouette ! — the Firebase project teacher sign-in uses.
 *
 * None of this is secret. A Firebase web apiKey identifies a project; it does
 * not authorise anything, and every visitor's browser downloads it by design.
 * What protects the project is the authorised-domain list in the Firebase
 * console and the checks the Worker runs on every token. So this file belongs
 * in the repository exactly as js/config.js does.
 *
 * Empty the projectId and the whole feature switches off cleanly: no sign-in
 * button, no SDK download, and classes carry on working the way they always
 * have, on the device token.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  App.FIREBASE = {
    apiKey: "AIzaSyDIS52NpWXH2ObKHPirE35FxW4m0mW8hSQ",
    authDomain: "chouette-d1106.firebaseapp.com",
    projectId: "chouette-d1106",
    storageBucket: "chouette-d1106.firebasestorage.app",
    messagingSenderId: "701381618240",
    appId: "1:701381618240:web:b8254455f1ad7544f58da5",

    /* The SDK is fetched from Google's CDN the first time somebody signs in.
     * Bump this to move versions; "compat" is the build that works as a plain
     * script tag, which is what keeps index.html free of ES modules. */
    sdkVersion: "12.18.0",

    /*
     * Hosts that serve Firebase's sign-in handler from their OWN origin, via
     * the /__/auth/ rewrite in vercel.json.
     *
     * This matters more than it looks. Google sends a teacher back through
     * that handler, and the handler has to read state written before they
     * left. Left on chouette-d1106.firebaseapp.com it is a different origin
     * from the app, and every current browser partitions storage between the
     * two — so the state is simply not there on the way back and sign-in dies
     * with "missing initial state". Proxying the handler onto our own domain
     * makes app and handler same-origin, which is the fix Firebase documents.
     *
     * Anywhere not listed here falls back to the firebaseapp.com domain: it is
     * right for localhost, where popups work and there is nothing to proxy.
     */
    proxiedAuthHosts: ["chouettelearning.com", "www.chouettelearning.com"]
  };
})(typeof window !== "undefined" ? window : globalThis);
