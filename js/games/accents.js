/* Accent Attack — four spellings, one is right. Trains the muscle memory that
 * saves points on every written exam. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U, K = App.GameKit;

  var GROUPS = {
    e: ["e", "é", "è", "ê", "ë"],
    a: ["a", "à", "â"],
    u: ["u", "ù", "û"],
    i: ["i", "î", "ï"],
    o: ["o", "ô"],
    c: ["c", "ç"]
  };

  function baseOf(ch) {
    var lower = ch.toLowerCase();
    for (var g in GROUPS) if (GROUPS[g].indexOf(lower) !== -1) return g;
    return null;
  }

  function hasAccent(word) {
    return /[éèêëàâùûîïôç]/i.test(word);
  }

  /** Plausible misspellings: swap or drop one accent at a time. */
  function variants(word, count) {
    var out = [], seen = {};
    seen[word] = 1;
    var positions = [];
    for (var i = 0; i < word.length; i++) if (baseOf(word[i])) positions.push(i);
    var tries = 0;
    while (out.length < count && tries < 120) {
      tries++;
      var pos = positions[U.rand(positions.length)];
      var base = baseOf(word[pos]);
      if (!base) continue;
      var choices = GROUPS[base];
      var repl = choices[U.rand(choices.length)];
      if (repl === word[pos].toLowerCase()) continue;
      var candidate = word.slice(0, pos) + repl + word.slice(pos + 1);
      if (seen[candidate]) continue;
      seen[candidate] = 1;
      out.push(candidate);
    }
    return out;
  }

  App.Games.register({
    id: "accents",
    name: "Accent Attack",
    icon: "🎯",
    color: "red",
    tagline: "é, è ou ê ? Choisis bien.",
    blurb: "Repère la seule orthographe correcte. 50 secondes, aucune pitié.",
    minLevel: 1,
    mode: { type: "timer", duration: 50 },
    build: function (api) {
      var pool = U.uniqueBy(App.Content.vocabAll(api.level), function (v) { return v.fr; })
        .filter(function (v) { return hasAccent(v.fr); });
      if (pool.length < 6) {
        pool = U.uniqueBy(App.Vocab.upTo(5), function (v) { return v.fr; })
          .filter(function (v) { return hasAccent(v.fr); });
      }
      var feed = K.cycler(pool);
      var live = null;

      function ask() {
        var item = feed.next();
        var wrongs = variants(item.fr, 3);
        var flat = item.fr.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (flat !== item.fr && wrongs.indexOf(flat) === -1) wrongs.unshift(flat);
        wrongs = wrongs.slice(0, 3);
        var options = U.shuffle(wrongs.map(function (w) { return { label: w, correct: false }; })
          .concat([{ label: item.fr, correct: true }]));

        live = K.mcq(api.stage, {
          tag: "Quelle orthographe est correcte ?",
          prompt: item.en,
          hint: "un seul accent change tout",
          options: options,
          columns: 2,
          onAnswer: function (ok, node) {
            if (ok) {
              api.correct({ node: node, key: item.fr, points: 110 });
              api.addTime(1);
            } else {
              api.wrong({ node: node, key: item.fr });
            }
            api.status("✔ " + App.Vocab.display(item));
            setTimeout(function () { if (api.timeLeft > 0) ask(); }, ok ? 300 : 950);
          }
        });
      }

      ask();
      return { destroy: function () { if (live) live.destroy(); } };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
