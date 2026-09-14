/* Éclair Rapide — timed four-choice translation sprint, both directions.
 * Every right answer buys a little more time, so a hot streak keeps going. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U, K = App.GameKit;

  function buildRunner(api, deck, label) {
    var pool = U.uniqueBy(deck, function (v) { return v.fr; });
    if (pool.length < 4) pool = U.uniqueBy(App.Content.vocabAll(api.level), function (v) { return v.fr; });
    var feed = K.cycler(pool);
    var current = null, live = null;
    var toFrench = true;

    function ask() {
      current = feed.next();
      toFrench = Math.random() < 0.55;
      var wrongs = K.distractors(pool, current, 3, function (v) { return v.fr; });
      var options = U.shuffle(wrongs.concat([current])).map(function (v) {
        return { label: toFrench ? App.Vocab.display(v) : v.en, correct: v === current, item: v };
      });

      live = K.mcq(api.stage, {
        tag: label + (toFrench ? " · anglais → français" : " · français → anglais"),
        prompt: toFrench ? current.en : App.Vocab.display(current),
        hint: toFrench ? null : "que veut dire ce mot ?",
        options: options,
        columns: 2,
        onAnswer: function (ok, node) {
          if (ok) {
            api.correct({ node: node, key: current.fr });
            api.addTime(1.2);
          } else {
            api.wrong({ node: node, key: current.fr });
          }
          api.status(App.Vocab.display(current) + " = " + current.en);
          setTimeout(function () { if (api.timeLeft > 0) ask(); }, ok ? 320 : 900);
        }
      });
    }

    ask();
    return { destroy: function () { if (live) live.destroy(); } };
  }

  App.Games.register({
    id: "eclair",
    name: "Éclair Rapide",
    icon: "⚡",
    color: "yellow",
    tagline: "Traduis vite, très vite.",
    blurb: "Quatre choix, 70 secondes. Chaque bonne réponse rallonge le chrono.",
    minLevel: 1,
    mode: { type: "timer", duration: 70 },
    build: function (api) {
      return buildRunner(api, App.Content.vocabDeck(api.level),
        App.Content.label() || "Éclair");
    }
  });

  /* Same engine, but the deck is built from the words you keep missing. */
  App.Games.register({
    id: "revision",
    name: "Révision Ciblée",
    icon: "🔁",
    color: "green",
    tagline: "Tes mots faibles, rien qu'eux.",
    blurb: "Le jeu rejoue uniquement les mots que tu as ratés.",
    hidden: true,
    xpBonus: 1.25,
    mode: { type: "timer", duration: 60 },
    build: function (api) {
      var weak = App.State.weakKeys(40);
      var all = App.Vocab.upTo(api.level);
      var deck = all.filter(function (v) { return weak.indexOf(v.fr) !== -1; });
      if (deck.length < 4) deck = all;
      return buildRunner(api, deck, "Révision");
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
