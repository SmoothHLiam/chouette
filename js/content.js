/* Chouette ! — where a game gets its content.
 *
 * By default this is the bank that ships with the game, exactly as before. A
 * teacher's list can take over for the duration of one session; when it does,
 * anything the list cannot supply still falls back to the built-in content, so
 * a game is never left with too little to play.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var active = null;   // the list driving the current session, if any

  function usable(kind) {
    if (!active) return false;
    return active.kind === kind && (active.items || []).length >= 3;
  }

  App.Content = {
    /** Points the next game at a teacher's list. */
    use: function (list) {
      active = list && list.items && list.items.length ? list : null;
      return active;
    },
    clear: function () { active = null; },
    active: function () { return active; },
    label: function () { return active ? active.name : null; },

    /** Weighted vocabulary, or the list's words when one is in play. */
    vocabDeck: function (level, opts) {
      if (usable("vocab")) {
        var items = App.Lists.asVocab(active);
        if (opts && opts.nounsOnly) {
          var nouns = items.filter(function (i) { return i.t === "n"; });
          if (nouns.length >= 4) return nouns;
          return App.Vocab.deck(level, opts);     // not enough nouns — use the bank
        }
        return items;
      }
      return App.Vocab.deck(level, opts);
    },

    /** The flat list, used where a game wants every word once. */
    vocabAll: function (level) {
      if (usable("vocab")) return App.Lists.asVocab(active);
      return App.Vocab.upTo(level);
    },

    sentenceDeck: function (level) {
      if (usable("sentences")) return App.Lists.asSentences(active);
      return App.Sentences.deck(level);
    },

    /** Decoy tiles for the phrase builder come from the same source. */
    sentenceWordPool: function (level) {
      if (!usable("sentences")) return App.Sentences.wordPool(level);
      var seen = {};
      var pool = [];
      App.Lists.asSentences(active).forEach(function (s) {
        App.Sentences.tokens(s.fr).forEach(function (w) {
          var key = w.toLowerCase();
          if (!seen[key] && w.length > 1) { seen[key] = 1; pool.push(key); }
        });
      });
      // A short list makes thin decoys; top up from the bank.
      if (pool.length < 12) {
        App.Sentences.wordPool(level).forEach(function (w) {
          if (!seen[w]) { seen[w] = 1; pool.push(w); }
        });
      }
      return pool;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
