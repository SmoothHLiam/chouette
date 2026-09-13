/* Chouette ! — deployment settings.
 *
 * syncUrl: where the class-sync API lives.
 *   ""  (default)  use the same origin the app was served from. This is right
 *                  for `npm start` and for the Cloudflare Worker, which serves
 *                  the game and the API together.
 *   "https://chouette.chouette.workers.dev"
 *                  set this only if the game's files are hosted somewhere
 *                  other than the Worker (GitHub Pages, a school server…).
 *
 * Opened straight off disk (file://) there is no origin to talk to, so the app
 * runs fully offline and falls back to invite and progress codes.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  App.CONFIG = { syncUrl: "" };
})(typeof window !== "undefined" ? window : globalThis);
