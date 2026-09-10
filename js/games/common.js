/* Chouette ! — bits and pieces shared by several mini-games. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  /** Endless shuffled feed over `items`, never repeating back-to-back. */
  function cycler(items) {
    var pool = [], last = null;
    return {
      next: function () {
        if (!items.length) return null;
        if (!pool.length) pool = U.shuffle(items);
        var item = pool.pop();
        if (items.length > 2 && item === last && pool.length) {
          var alt = pool.pop();
          pool.unshift(item);
          item = alt;
        }
        last = item;
        return item;
      },
      size: items.length
    };
  }

  /** `n` wrong answers pulled from `deck`, compared with `keyFn`. */
  function distractors(deck, answer, n, keyFn) {
    keyFn = keyFn || function (x) { return x; };
    var key = keyFn(answer);
    var seen = {};
    seen[key] = 1;
    var out = [];
    var shuffled = U.shuffle(deck);
    for (var i = 0; i < shuffled.length && out.length < n; i++) {
      var k = keyFn(shuffled[i]);
      if (seen[k]) continue;
      seen[k] = 1;
      out.push(shuffled[i]);
    }
    return out;
  }

  /** A prompt card plus 2–4 answer buttons, with 1–4 keyboard shortcuts. */
  function mcq(container, opts) {
    U.clear(container);
    var card = U.el("div", "qcard");
    if (opts.tag) card.appendChild(U.el("div", "qtag", opts.tag));
    var promptNode = U.el("div", "qprompt", opts.prompt);
    if (opts.prompt && opts.prompt.length > 34) promptNode.classList.add("long");
    card.appendChild(promptNode);
    if (opts.hint) card.appendChild(U.el("div", "qhint", opts.hint));
    if (opts.extra) card.appendChild(opts.extra);
    container.appendChild(card);

    var grid = U.el("div", "opt-grid cols-" + (opts.columns || 2));
    var locked = false;
    var buttons = [];

    opts.options.forEach(function (opt, i) {
      var b = U.el("button", "opt");
      b.appendChild(U.el("span", "opt-key", String(i + 1)));
      b.appendChild(U.el("span", "opt-label", opt.label));
      b.addEventListener("click", function () { choose(i); });
      grid.appendChild(b);
      buttons.push(b);
    });
    container.appendChild(grid);

    function choose(i) {
      if (locked) return;
      locked = true;
      offKey();
      var opt = opts.options[i];
      var node = buttons[i];
      buttons.forEach(function (b, j) {
        b.classList.add("resolved");
        if (opts.options[j].correct) b.classList.add("is-correct");
      });
      if (!opt.correct) node.classList.add("is-wrong");
      opts.onAnswer(!!opt.correct, node, opt);
    }

    var offKey = U.on(document, "keydown", function (e) {  // eslint-disable-line no-use-before-define
      if (locked) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= opts.options.length) { e.preventDefault(); choose(n - 1); }
    });

    return {
      card: card,
      buttons: buttons,
      destroy: function () { offKey(); }
    };
  }

  /* Buttons for the accented characters that are painful on a US keyboard. */
  var ACCENTS = ["é", "è", "ê", "à", "ù", "ç", "î", "ô", "û", "ë", "œ"];

  function accentBar(input) {
    var bar = U.el("div", "accent-bar");
    ACCENTS.forEach(function (ch) {
      var b = U.el("button", "accent-key", ch);
      b.type = "button";
      b.addEventListener("click", function () {
        var start = input.selectionStart || input.value.length;
        var end = input.selectionEnd || start;
        input.value = input.value.slice(0, start) + ch + input.value.slice(end);
        input.focus();
        input.selectionStart = input.selectionEnd = start + ch.length;
        App.Sound.click();
      });
      bar.appendChild(b);
    });
    return bar;
  }

  /** A little "🔊" that reads French aloud when voices are available. */
  function speakButton(text, opts) {
    var b = U.el("button", "speak-btn", "🔊");
    b.type = "button";
    b.title = "Écouter";
    b.setAttribute("aria-label", "Écouter en français");
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!App.Speech.say(text, opts)) App.UI.toast("Pas de voix française sur cet appareil.", "🔇");
    });
    return b;
  }

  App.GameKit = {
    cycler: cycler,
    distractors: distractors,
    mcq: mcq,
    accentBar: accentBar,
    speakButton: speakButton,
    ACCENTS: ACCENTS
  };
})(typeof window !== "undefined" ? window : globalThis);
