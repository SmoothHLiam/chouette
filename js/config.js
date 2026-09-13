/* Chouette ! — deployment settings.
 *
 * There is exactly ONE thing to change in this file: the address on the line
 * marked EDIT HERE below. Nothing inside this comment block does anything —
 * it is explanation only, so changing an address up here has no effect.
 *
 * Leave it empty ("") when the game and the sync API are served from the same
 * address. That is the case for `npm start`, and for a Cloudflare Worker that
 * serves the game and the API together.
 *
 * Set it to your Worker's address when the game is hosted somewhere else —
 * Vercel, Netlify, GitHub Pages, a school server. Use the address that shows
 * {"ok":true} when you open /api/health on it, with no trailing slash and no
 * /api on the end.
 *
 * Opened straight off disk (file://) there is no address to talk to, so the
 * app runs fully offline and falls back to invite and progress codes.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  /* ========================= EDIT HERE ========================= */
  var SYNC_URL = "";
  /* ============================================================= */

  App.CONFIG = { syncUrl: SYNC_URL };
})(typeof window !== "undefined" ? window : globalThis);
