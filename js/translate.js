/* Chouette ! — looking up an English translation without leaving the app.
 *
 * This deliberately does NOT call a translation service. The app already knows
 * 334 curriculum words, every verb in its engine, and whatever lists the
 * teacher has written — which is exactly the vocabulary a French teacher picks
 * a word of the day from. Looking it up locally is instant, works offline,
 * costs nothing, needs no API key, and sends nothing about a class to a third
 * party. When a word genuinely is not known, the teacher types the translation
 * themselves, which is one field and always correct.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  /** "le chien" -> "chien" · "l'eau" -> "eau" · "les gens" -> "gens" */
  function bare(text) {
    return U.normalize(text).replace(/^(l'|les|la|le|une|un|des|du|de la)\s*/i, "").trim();
  }

  function flatten(text) {
    return U.stripAccents(bare(text));
  }

  /** Every place the app already knows French, nearest first. */
  function sources(classCode) {
    var out = [];

    if (classCode && App.Lists) {
      App.Lists.all(classCode).forEach(function (list) {
        if (list.kind !== "vocab") return;
        (list.items || []).forEach(function (item) {
          out.push({ fr: item.fr, en: item.en, from: "ta liste « " + list.name + " »" });
        });
      });
    }

    App.Vocab.upTo(5).forEach(function (item) {
      out.push({ fr: item.fr, en: item.en, from: "le vocabulaire du jeu" });
    });

    App.Verbs.all.forEach(function (verb) {
      out.push({ fr: verb.inf, en: verb.en, from: "les verbes du jeu" });
    });

    return out;
  }

  /** Returns { en, from } or null. Exact match first, then accent-insensitive. */
  function lookup(french, classCode) {
    var wanted = bare(french);
    if (!wanted) return null;
    var pool = sources(classCode);
    var i;

    for (i = 0; i < pool.length; i++) {
      if (bare(pool[i].fr) === wanted) return { en: pool[i].en, from: pool[i].from };
    }
    // A teacher typing quickly may skip the accents.
    var loose = flatten(french);
    for (i = 0; i < pool.length; i++) {
      if (flatten(pool[i].fr) === loose) return { en: pool[i].en, from: pool[i].from, loose: true };
    }
    return null;
  }

  App.Translate = { lookup: lookup, bare: bare };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Translate;
})(typeof window !== "undefined" ? window : globalThis);
