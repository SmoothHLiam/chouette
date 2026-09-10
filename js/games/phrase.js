/* Construis la Phrase — tap the word tiles into the right order. Decoy tiles
 * come from other sentences at your level, so word order really is the test. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U, K = App.GameKit;

  App.Games.register({
    id: "phrase",
    name: "Construis la Phrase",
    icon: "🧩",
    color: "blue",
    tagline: "Remets les mots dans l'ordre.",
    blurb: "Huit phrases à reconstruire, avec des mots pièges en prime.",
    minLevel: 1,
    mode: { type: "rounds", rounds: 8 },
    build: function (api) {
      var deck = App.Sentences.deck(api.level);
      var pool = App.Sentences.wordPool(api.level);
      var feed = K.cycler(deck);
      var current = null, chosen = [], locked = false;

      var wrap = U.el("div", "phrase");
      var tag = U.el("div", "qtag", "Traduis en français");
      var prompt = U.el("div", "phrase-en");
      var answer = U.el("div", "phrase-answer");
      var tray = U.el("div", "phrase-tray");
      var feedback = U.el("div", "phrase-feedback");
      var actions = U.el("div", "phrase-actions");
      var undo = U.el("button", "btn btn-ghost", "↶ Retirer");
      var check = U.el("button", "btn btn-primary", "Vérifier");
      actions.appendChild(undo);
      actions.appendChild(check);

      wrap.appendChild(tag);
      wrap.appendChild(prompt);
      wrap.appendChild(answer);
      wrap.appendChild(tray);
      wrap.appendChild(actions);
      wrap.appendChild(feedback);
      api.stage.appendChild(wrap);

      function renderAnswer() {
        U.clear(answer);
        if (!chosen.length) {
          answer.appendChild(U.el("span", "phrase-placeholder", "Touche les mots ci-dessous…"));
          return;
        }
        chosen.forEach(function (tile, i) {
          var t = U.el("button", "tile tile-in", tile.word);
          t.addEventListener("click", function () {
            if (locked) return;
            App.Sound.click();
            chosen.splice(i, 1);
            tile.node.classList.remove("used");
            renderAnswer();
          });
          answer.appendChild(t);
        });
      }

      function ask() {
        locked = false;
        chosen = [];
        current = feed.next();
        prompt.textContent = current.en;
        feedback.textContent = "";
        feedback.className = "phrase-feedback";
        U.clear(tray);

        var words = App.Sentences.tokens(current.fr);
        var decoys = U.shuffle(pool.filter(function (w) {
          return words.map(function (x) { return x.toLowerCase(); }).indexOf(w) === -1;
        })).slice(0, Math.min(3, Math.max(2, Math.round(words.length / 3))));

        U.shuffle(words.concat(decoys)).forEach(function (word) {
          var tile = U.el("button", "tile", word);
          var record = { word: word, node: tile };
          tile.addEventListener("click", function () {
            if (locked || tile.classList.contains("used")) return;
            App.Sound.click();
            tile.classList.add("used");
            chosen.push(record);
            renderAnswer();
          });
          tray.appendChild(tile);
        });
        renderAnswer();
      }

      function verify() {
        if (locked || !current) return;
        if (!chosen.length) return;
        locked = true;
        var attempt = chosen.map(function (t) { return t.word; }).join(" ");
        var target = App.Sentences.tokens(current.fr).join(" ");
        var ok = U.normalize(attempt) === U.normalize(target);
        var full = current.fr;

        if (ok) {
          api.correct({ node: answer, key: "phrase:" + current.fr, points: 200 });
          feedback.className = "phrase-feedback good";
          feedback.textContent = "✔ " + full;
          App.FX.burstAt(answer, 26);
        } else {
          api.wrong({ node: answer, key: "phrase:" + current.fr });
          feedback.className = "phrase-feedback bad";
          feedback.textContent = "La bonne phrase : " + full;
        }
        feedback.appendChild(K.speakButton(full));
        setTimeout(function () {
          if (api.tick()) return;
          ask();
        }, ok ? 1100 : 2100);
      }

      check.addEventListener("click", verify);
      undo.addEventListener("click", function () {
        if (locked || !chosen.length) return;
        App.Sound.click();
        var last = chosen.pop();
        last.node.classList.remove("used");
        renderAnswer();
      });
      var offKey = U.on(document, "keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); verify(); }
        if (e.key === "Backspace" && document.activeElement === document.body) {
          e.preventDefault();
          undo.click();
        }
      });

      ask();
      return { destroy: offKey };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
