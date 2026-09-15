/* Chouette ! — Fiches à imprimer.
 *
 * Paper is not a step backwards. It is the sub folder, the phones-away day,
 * the student with no device and the classroom whose wifi died — and a teacher
 * whose worksheets come out of Chouette keeps using Chouette on the days
 * nobody opens it. Everything here is built in the browser from banks the app
 * already carries: no request, no service, and it works from a file:// page.
 *
 * `build()` is deliberately pure — it takes a spec and returns HTML — so the
 * whole layout can be checked without a browser.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var CARDS_PER_PAGE = 9;          // a 3 × 3 grid, comfortable to cut up
  var CARD_COLUMNS = 3;

  var FORMATS = [
    { id: "quiz", label: "Contrôle", icon: "📝",
      blurb: "Des mots numérotés avec une ligne à remplir." },
    { id: "list", label: "Liste d'étude", icon: "📄",
      blurb: "Les mots et leur traduction, à réviser à la maison." },
    { id: "cards", label: "Cartes à découper", icon: "✂️",
      blurb: "Recto-verso : à imprimer en double face, bord long." },
    { id: "verbs", label: "Tableaux de conjugaison", icon: "🧩",
      blurb: "Des tableaux vides à compléter, avec le corrigé." }
  ];

  function esc(text) {
    return String(text === null || text === undefined ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatById(id) {
    for (var i = 0; i < FORMATS.length; i++) if (FORMATS[i].id === id) return FORMATS[i];
    return FORMATS[0];
  }

  /* ------------------------------------------------------------ sources -- */

  /** Vocabulary as { fr, en } pairs — nouns keep the article they are learnt with. */
  function pairsFromVocab(items) {
    return (items || []).map(function (item) {
      return {
        fr: App.Vocab ? App.Vocab.display(item) : item.fr,
        en: item.en,
        g: item.g || null
      };
    });
  }

  /**
   * Everything a teacher can print from, in one list: their own word lists
   * first, then the built-in bank for each year up to the class's level.
   */
  function sources(klass) {
    var out = [];
    var level = (klass && klass.level) || 1;

    if (klass && App.Lists) {
      App.Lists.all(klass.code).forEach(function (list) {
        var pairs = list.kind === "sentences"
          ? (list.items || []).map(function (it) { return { fr: it.fr, en: it.en, g: null }; })
          : pairsFromVocab(App.Lists.asVocab(list));
        if (!pairs.length) return;
        out.push({ id: "list:" + list.id, label: "📋 " + list.name, pairs: pairs, verbs: null });
      });
    }

    if (App.Vocab) {
      for (var lvl = 1; lvl <= level; lvl++) {
        var bank = App.Vocab.byLevel[lvl] || [];
        if (!bank.length) continue;
        out.push({
          id: "level:" + lvl,
          label: "📚 " + (App.LEVELS[lvl - 1] ? App.LEVELS[lvl - 1].label : "Niveau " + lvl) +
                 " — tout le vocabulaire",
          pairs: pairsFromVocab(bank),
          verbs: null
        });
      }
      out.push({
        id: "upto",
        label: "📚 Tout le vocabulaire vu jusqu'ici",
        pairs: pairsFromVocab(App.Vocab.upTo(level)),
        verbs: null
      });
    }

    if (App.Verbs) {
      out.push({
        id: "verbs",
        label: "🧩 Les verbes du niveau",
        pairs: App.Verbs.forLevel(level).map(function (v) {
          return { fr: v.inf, en: v.en || "", g: null };
        }),
        verbs: App.Verbs.forLevel(level)
      });
    }
    return out;
  }

  function sourceById(klass, id) {
    var all = sources(klass);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return all[0] || null;
  }

  /* -------------------------------------------------------------- pieces -- */

  function head(spec, suffix) {
    var lines = ['<header class="paper-head">'];
    lines.push('<h1>' + esc(spec.title || "Chouette !") + esc(suffix || "") + '</h1>');
    if (spec.subtitle) lines.push('<p class="paper-sub">' + esc(spec.subtitle) + '</p>');
    if (!suffix) {
      lines.push('<div class="paper-fields">' +
        '<span>Nom : <i></i></span><span>Classe : <i></i></span><span>Date : <i></i></span></div>');
    }
    lines.push('</header>');
    return lines.join("");
  }

  /** Numbered prompts with a ruled line, two to a row. */
  function quizBody(spec) {
    var ask = spec.direction === "en-fr" ? "en" : "fr";
    var rows = spec.pairs.map(function (pair, i) {
      return '<div class="paper-q">' +
        '<b>' + (i + 1) + '.</b>' +
        '<span class="paper-prompt">' + esc(pair[ask]) + '</span>' +
        '<span class="paper-blank"></span></div>';
    });
    var instruction = spec.direction === "en-fr"
      ? "Écris chaque mot en français. N'oublie pas l'article des noms."
      : "Écris chaque mot en anglais.";
    return '<p class="paper-instruction">' + esc(instruction) + '</p>' +
      '<div class="paper-grid">' + rows.join("") + '</div>';
  }

  function quizKey(spec) {
    var ask = spec.direction === "en-fr" ? "en" : "fr";
    var give = spec.direction === "en-fr" ? "fr" : "en";
    var rows = spec.pairs.map(function (pair, i) {
      return '<div class="paper-q">' +
        '<b>' + (i + 1) + '.</b>' +
        '<span class="paper-prompt">' + esc(pair[ask]) + '</span>' +
        '<span class="paper-answer">' + esc(pair[give]) + '</span></div>';
    });
    return '<div class="paper-grid">' + rows.join("") + '</div>';
  }

  /** A two-up reference table: four columns, two word pairs per row. */
  function listBody(spec) {
    var rows = [];
    for (var i = 0; i < spec.pairs.length; i += 2) {
      var a = spec.pairs[i];
      var b = spec.pairs[i + 1];
      rows.push('<tr>' + cellPair(a) + (b ? cellPair(b) : '<td></td><td></td>') + '</tr>');
    }
    return '<table class="paper-table">' +
      '<thead><tr><th>Français</th><th>English</th><th>Français</th><th>English</th></tr></thead>' +
      '<tbody>' + rows.join("") + '</tbody></table>';
  }

  function cellPair(pair) {
    return '<td class="fr">' + esc(pair.fr) + '</td><td>' + esc(pair.en) + '</td>';
  }

  /**
   * Cut-out cards. The back of each page reverses every row, so a double-sided
   * print flipped on the long edge puts each translation behind its own word.
   */
  function cardsBody(spec) {
    var pages = [];
    for (var start = 0; start < spec.pairs.length; start += CARDS_PER_PAGE) {
      var chunk = spec.pairs.slice(start, start + CARDS_PER_PAGE);
      pages.push(cardPage(chunk, "fr", false));
      pages.push(cardPage(chunk, "en", true));
    }
    return pages.join("");
  }

  function cardPage(chunk, side, mirror) {
    var cells = chunk.slice();
    while (cells.length < CARDS_PER_PAGE) cells.push(null);
    if (mirror) cells = mirrorRows(cells, CARD_COLUMNS);
    var cards = cells.map(function (pair) {
      if (!pair) return '<div class="paper-card is-blank"></div>';
      return '<div class="paper-card"><span>' + esc(pair[side]) + '</span></div>';
    });
    return '<section class="paper-page">' +
      '<div class="paper-side">' + (mirror ? "verso" : "recto") + '</div>' +
      '<div class="paper-cards">' + cards.join("") + '</div></section>';
  }

  /** Reverses each row of a grid laid out row by row. */
  function mirrorRows(cells, columns) {
    var out = [];
    for (var i = 0; i < cells.length; i += columns) {
      out = out.concat(cells.slice(i, i + columns).reverse());
    }
    return out;
  }

  /** "le passé composé" → "au passé composé", "l'imparfait" → "à l'imparfait".
   *  A French worksheet that asks in broken French is worse than no worksheet. */
  function atTense(name) {
    var text = String(name || "");
    if (/^les /.test(text)) return text.replace(/^les /, "aux ");
    if (/^le /.test(text)) return text.replace(/^le /, "au ");
    if (/^la /.test(text)) return text.replace(/^la /, "à la ");
    if (/^l'/.test(text)) return "à " + text;
    return "au " + text;
  }

  /** Blank conjugation tables — the one drill no worksheet generator gets right. */
  function verbsBody(spec, withAnswers) {
    var tense = spec.tense || "present";
    var meta = App.Verbs ? App.Verbs.tenseById(tense) : null;
    var tables = (spec.verbs || []).map(function (v) {
      var rows = App.Verbs.pronouns.map(function (_, i) {
        var filled = withAnswers ? esc(App.Verbs.answer(v, tense, i)) : "";
        return '<tr><th>' + esc(App.Verbs.promptSubject(v, i)) + '</th>' +
          '<td class="' + (withAnswers ? "paper-answer" : "paper-blank-cell") + '">' + filled + '</td></tr>';
      });
      return '<table class="paper-conj"><caption>' + esc(v.inf) +
        (v.en ? ' <i>(' + esc(v.en) + ')</i>' : "") + '</caption><tbody>' +
        rows.join("") + '</tbody></table>';
    });
    var instruction = "Conjugue chaque verbe " + atTense(meta ? meta.fr : tense) + ".";
    return (withAnswers ? "" : '<p class="paper-instruction">' + esc(instruction) + '</p>') +
      '<div class="paper-conjs">' + tables.join("") + '</div>';
  }

  /* --------------------------------------------------------------- build -- */

  /**
   * A whole printable document as HTML. Cards make their own pages; every
   * other format is one sheet, optionally followed by the answer key.
   */
  function build(spec) {
    spec = spec || {};
    var kind = formatById(spec.kind).id;
    var body, key = "";

    if (kind === "cards") {
      return '<article class="paper-doc paper-doc-cards">' + cardsBody(spec) + '</article>';
    }
    if (kind === "verbs") {
      body = verbsBody(spec, false);
      if (spec.answers) key = verbsBody(spec, true);
    } else if (kind === "list") {
      body = listBody(spec);
    } else {
      body = quizBody(spec);
      if (spec.answers) key = quizKey(spec);
    }

    var out = '<article class="paper-doc"><section class="paper-page">' +
      head(spec) + body + '</section></article>';
    if (key) {
      out += '<article class="paper-doc paper-key"><section class="paper-page">' +
        head(spec, " — corrigé") + key + '</section></article>';
    }
    return out;
  }

  /* ------------------------------------------------------------ preview -- */

  var layer = null;

  /** Shows the sheet full-screen with a print button. Escape closes it. */
  function open(spec) {
    var doc = global.document;
    if (!doc) return null;
    close();

    layer = doc.createElement("div");
    layer.className = "paper-layer";
    layer.innerHTML =
      '<div class="paper-bar">' +
      '  <button class="btn btn-ghost paper-close" type="button">← Fermer</button>' +
      '  <span class="paper-hint">Aperçu — imprime, ou enregistre en PDF depuis la fenêtre d\'impression.</span>' +
      '  <button class="btn btn-primary paper-print" type="button">🖨️ Imprimer</button>' +
      '</div>' +
      '<div class="paper-scroll">' + build(spec) + '</div>';
    doc.body.appendChild(layer);
    doc.documentElement.setAttribute("data-paper", "on");

    layer.querySelector(".paper-close").addEventListener("click", function () {
      if (App.Sound) App.Sound.click();
      close();
    });
    layer.querySelector(".paper-print").addEventListener("click", function () {
      if (App.Sound) App.Sound.click();
      global.print();
    });
    doc.addEventListener("keydown", onKey);
    return close;
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  function close() {
    var doc = global.document;
    if (!doc) return;
    doc.removeEventListener("keydown", onKey);
    doc.documentElement.removeAttribute("data-paper");
    if (layer) { layer.remove(); layer = null; }
  }

  App.Paper = {
    FORMATS: FORMATS,
    CARDS_PER_PAGE: CARDS_PER_PAGE,
    formatById: formatById,
    sources: sources,
    sourceById: sourceById,
    mirrorRows: mirrorRows,
    atTense: atTense,
    build: build,
    open: open,
    close: close,
    esc: esc
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Paper;
})(typeof window !== "undefined" ? window : globalThis);
