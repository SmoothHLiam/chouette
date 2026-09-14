/* Marché Mémoire — pair the French card with its English twin before the
 * market closes. Clearing a whole board refills it and pays a bonus. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var PAIRS = 8;

  App.Games.register({
    id: "memoire",
    name: "Marché Mémoire",
    icon: "🃏",
    color: "orange",
    tagline: "Retrouve les paires français / anglais.",
    blurb: "Huit paires par étal. Vide le plateau pour un bonus.",
    minLevel: 1,
    mode: { type: "timer", duration: 90 },
    build: function (api) {
      var pool = U.uniqueBy(App.Content.vocabDeck(api.level), function (v) { return v.fr; });
      var board = U.el("div", "memory-board");
      var banner = U.el("div", "memory-banner");
      api.stage.appendChild(banner);
      api.stage.appendChild(board);

      var first = null, busy = false, remaining = 0, cleared = 0;

      function deal() {
        U.clear(board);
        first = null;
        var items = U.sample(pool, PAIRS);
        remaining = items.length;
        var cards = [];
        items.forEach(function (item, i) {
          cards.push({ item: item, side: "fr", label: App.Vocab.display(item), pair: i });
          cards.push({ item: item, side: "en", label: item.en, pair: i });
        });
        U.shuffle(cards).forEach(function (card) {
          var node = U.el("button", "memory-card side-" + card.side);
          var inner = U.el("span", "memory-inner");
          inner.appendChild(U.el("span", "memory-face memory-back", card.side === "fr" ? "🇫🇷" : "🔤"));
          inner.appendChild(U.el("span", "memory-face memory-front", card.label));
          node.appendChild(inner);
          card.node = node;
          node.addEventListener("click", function () { flip(card); });
          board.appendChild(node);
        });
        banner.textContent = "Étal n°" + (cleared + 1) + " · " + PAIRS + " paires";
      }

      function flip(card) {
        if (busy || card.done || card === first) return;
        if (card.node.classList.contains("open")) return;
        card.node.classList.add("open");
        App.Sound.click();
        if (!first) { first = card; return; }

        if (first.pair === card.pair) {
          var a = first, b = card;
          first = null;
          remaining -= 1;
          api.correct({ node: b.node, key: a.item.fr, points: 90 });
          a.done = b.done = true;
          setTimeout(function () {
            a.node.classList.add("matched");
            b.node.classList.add("matched");
          }, 120);
          if (remaining === 0) {
            cleared += 1;
            api.addTime(8);
            App.FX.burstAt(board, 40);
            App.UI.toast("Étal vidé ! +8 secondes", "🥐", "good");
            setTimeout(function () { if (api.timeLeft > 0) deal(); }, 900);
          }
          return;
        }

        busy = true;
        var wrongA = first, wrongB = card;
        first = null;
        api.wrong({ node: wrongB.node, key: wrongA.item.fr, label: "✕" });
        setTimeout(function () {
          wrongA.node.classList.remove("open");
          wrongB.node.classList.remove("open");
          busy = false;
        }, 750);
      }

      deal();
      return { destroy: function () {} };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
