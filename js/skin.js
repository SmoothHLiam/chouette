/* Chouette ! — how the app looks on this screen.
 *
 * Two complete visual identities ship side by side:
 *   colorful — the original arcade look (css/base, layout, games)
 *   minimal  — the quiet light product look (css/redesign.css, layered on top)
 *
 * Switching between them enables or disables that one extra stylesheet, so
 * neither design is ever rewritten or thrown away to make the other work.
 *
 * These are device settings rather than account settings: they describe the
 * screen you are looking at, they must apply before the first paint to avoid a
 * flash of the wrong design, and on a shared classroom computer the display
 * should not change every time a different student signs in.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var KEY = "chouette.display.v1";

  var SKINS = [
    { id: "colorful", name: "Coloré", icon: "🎨",
      blurb: "Le look arcade : couleurs vives, confettis, thèmes à débloquer." },
    { id: "minimal", name: "Minimal", icon: "📄",
      blurb: "Clair et sobre. Plus calme à lire, et discret sur un projecteur." }
  ];

  var TEXT_SIZES = [
    { id: "normal", name: "Normal" },
    { id: "large", name: "Grand" },
    { id: "xlarge", name: "Très grand" }
  ];

  var MOTIONS = [
    { id: "full", name: "Complètes", blurb: "Confettis, secousses et animations." },
    { id: "calm", name: "Calmes", blurb: "Sans confettis ni secousses." }
  ];

  var defaults = { skin: "colorful", text: "normal", motion: "full" };
  var current = null;

  function valid(list, id, fallback) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return id;
    return fallback;
  }

  function read() {
    var saved = {};
    try {
      saved = JSON.parse(global.localStorage.getItem(KEY) || "{}") || {};
    } catch (e) {
      saved = {};
    }
    return {
      skin: valid(SKINS, saved.skin, defaults.skin),
      text: valid(TEXT_SIZES, saved.text, defaults.text),
      motion: valid(MOTIONS, saved.motion, defaults.motion)
    };
  }

  function write(value) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(value));
    } catch (e) { /* storage blocked — this session only */ }
  }

  /** Puts the settings on the document. Safe to call as often as you like. */
  function apply() {
    var root = document.documentElement;
    root.setAttribute("data-skin", current.skin);
    root.setAttribute("data-text", current.text);
    root.setAttribute("data-motion", current.motion);
    var sheet = document.getElementById("skin-minimal");
    if (sheet) sheet.disabled = current.skin !== "minimal";
  }

  App.Skin = {
    SKINS: SKINS,
    TEXT_SIZES: TEXT_SIZES,
    MOTIONS: MOTIONS,

    boot: function () {
      current = read();
      apply();
      return current;
    },
    get: function (key) {
      if (!current) current = read();
      return key ? current[key] : current;
    },
    set: function (key, value) {
      if (!current) current = read();
      if (!(key in defaults)) return current;
      var list = key === "skin" ? SKINS : key === "text" ? TEXT_SIZES : MOTIONS;
      current[key] = valid(list, value, current[key]);
      write(current);
      apply();
      return current;
    },
    /** True when the player has asked for a quieter screen. */
    calm: function () {
      return App.Skin.get("motion") === "calm";
    },
    describe: function (key) {
      var list = key === "skin" ? SKINS : key === "text" ? TEXT_SIZES : MOTIONS;
      var id = App.Skin.get(key);
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return list[0];
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
