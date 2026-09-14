/* Duel Le / La — the fastest way to drill noun gender. Two buttons, arrow keys,
 * and the article is hidden so elided words ("l'eau") are fair game. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U, K = App.GameKit;

  App.Games.register({
    id: "genre",
    name: "Duel Le / La",
    icon: "⚔️",
    color: "pink",
    tagline: "Masculin ou féminin ? Décide en une seconde.",
    blurb: "45 secondes de duel. ← pour LE, → pour LA.",
    minLevel: 1,
    mode: { type: "timer", duration: 45 },
    build: function (api) {
      var nouns = U.uniqueBy(App.Content.vocabDeck(api.level, { nounsOnly: true }), function (v) { return v.fr; });
      var feed = K.cycler(nouns);
      var current = null, locked = false;

      var wrap = U.el("div", "duel");
      var word = U.el("div", "duel-word");
      var meaning = U.el("div", "duel-meaning");
      var row = U.el("div", "duel-row");
      var leBtn = U.el("button", "duel-btn duel-le");
      leBtn.innerHTML = "<b>LE</b><small>masculin ←</small>";
      var laBtn = U.el("button", "duel-btn duel-la");
      laBtn.innerHTML = "<b>LA</b><small>féminin →</small>";
      row.appendChild(leBtn);
      row.appendChild(laBtn);
      wrap.appendChild(word);
      wrap.appendChild(meaning);
      wrap.appendChild(row);
      api.stage.appendChild(wrap);

      function ask() {
        locked = false;
        current = feed.next();
        word.textContent = current.fr;
        word.classList.remove("pop");
        void word.offsetWidth;
        word.classList.add("pop");
        meaning.textContent = current.en;
        leBtn.className = "duel-btn duel-le";
        laBtn.className = "duel-btn duel-la";
        api.status(App.Vocab.elides(current) ? "attention : ici l'article s'élide en « l' »" : "");
      }

      function answer(guess) {
        if (locked || !current) return;
        locked = true;
        var node = guess === "m" ? leBtn : laBtn;
        var right = guess === current.g;
        (current.g === "m" ? leBtn : laBtn).classList.add("is-correct");
        if (right) {
          api.correct({ node: node, key: current.fr, points: 120 });
        } else {
          node.classList.add("is-wrong");
          api.wrong({ node: node, key: current.fr });
          api.status("C'était " + App.Vocab.withArticle(current) + " — " + current.en);
        }
        setTimeout(function () { if (api.timeLeft > 0) ask(); }, right ? 260 : 850);
      }

      leBtn.addEventListener("click", function () { answer("m"); });
      laBtn.addEventListener("click", function () { answer("f"); });
      var offKey = U.on(document, "keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); answer("m"); }
        if (e.key === "ArrowRight") { e.preventDefault(); answer("f"); }
      });

      ask();
      return { destroy: offKey };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
