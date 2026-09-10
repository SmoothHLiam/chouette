/* Chouette ! — small helpers shared by every screen and game. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function html(tag, className, markup) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (markup != null) node.innerHTML = markup;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function rand(n) {
    return Math.floor(Math.random() * n);
  }

  function pick(arr) {
    return arr[rand(arr.length)];
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** n distinct members of arr (fewer if arr is short). */
  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  /** Removes duplicates, comparing with `keyFn`. */
  function uniqueBy(arr, keyFn) {
    var seen = {};
    return arr.filter(function (item) {
      var k = keyFn(item);
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /** Loose comparison for typed French: accents and case still count as right
   *  only when the learner got them right, so we keep two levels of checking. */
  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripAccents(s) {
    return normalize(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function daysBetween(a, b) {
    if (!a || !b) return Infinity;
    var da = new Date(a + "T00:00:00");
    var db = new Date(b + "T00:00:00");
    return Math.round((db - da) / 86400000);
  }

  function on(node, type, fn, opts) {
    node.addEventListener(type, fn, opts || false);
    return function () { node.removeEventListener(type, fn, opts || false); };
  }

  App.U = {
    el: el, html: html, clear: clear, rand: rand, pick: pick, shuffle: shuffle,
    sample: sample, uniqueBy: uniqueBy, clamp: clamp, normalize: normalize,
    stripAccents: stripAccents, today: today, daysBetween: daysBetween, on: on
  };

  /* ------------------------------------------------------------- content -- */

  App.LEVELS = [
    { id: 1, label: "French 1", blurb: "Les bases : saluer, décrire, le présent." },
    { id: 2, label: "French 2", blurb: "Le passé composé, la ville, les voyages." },
    { id: 3, label: "French 3", blurb: "Imparfait, futur, opinions et société." },
    { id: 4, label: "French 4", blurb: "Subjonctif, conditionnel, débats et arts." },
    { id: 5, label: "French 5 (AP French)", blurb: "Thèmes AP, nuance et argumentation." }
  ];

  /* Ranks are the fun ladder on top of the class level. */
  App.RANKS = [
    { xp: 0, name: "Petit Escargot", icon: "🐌" },
    { xp: 150, name: "Croissant Chaud", icon: "🥐" },
    { xp: 400, name: "Chat de Café", icon: "☕" },
    { xp: 800, name: "Renard Rusé", icon: "🦊" },
    { xp: 1400, name: "Baguette Magique", icon: "🥖" },
    { xp: 2200, name: "Coq Sportif", icon: "🐓" },
    { xp: 3200, name: "Chouette Savante", icon: "🦉" },
    { xp: 4500, name: "Étoile de Paris", icon: "🌟" },
    { xp: 6200, name: "Maître des Mots", icon: "📚" },
    { xp: 8500, name: "Légende Francophone", icon: "👑" }
  ];

  App.THEMES = [
    { id: "nuit", name: "Nuit à Paris", cost: 0, swatch: ["#151a3a", "#4f7bff", "#ffc857"] },
    { id: "azur", name: "Côte d'Azur", cost: 250, swatch: ["#06334a", "#1fd1c3", "#ffe08a"] },
    { id: "lavande", name: "Champ de Lavande", cost: 350, swatch: ["#2a1f4d", "#b58bff", "#ffd6f2"] },
    { id: "metro", name: "Métro Minuit", cost: 450, swatch: ["#141414", "#2ecc71", "#f4f4f4"] },
    { id: "automne", name: "Automne Doré", cost: 600, swatch: ["#331c12", "#ff8c42", "#ffe3b3"] },
    { id: "neon", name: "Néon Bastille", cost: 900, swatch: ["#12002e", "#ff2e88", "#00e5ff"] }
  ];

  App.AVATARS = [
    { id: "🦉", cost: 0 }, { id: "🐌", cost: 120 }, { id: "🥐", cost: 150 },
    { id: "🧀", cost: 180 }, { id: "🐓", cost: 220 }, { id: "🦊", cost: 260 },
    { id: "🐸", cost: 300 }, { id: "🗼", cost: 400 }, { id: "🎨", cost: 450 },
    { id: "👑", cost: 700 }
  ];

  App.rankFor = function (xp) {
    var r = App.RANKS[0], i;
    for (i = 0; i < App.RANKS.length; i++) if (xp >= App.RANKS[i].xp) r = App.RANKS[i];
    return r;
  };

  App.rankIndex = function (xp) {
    var idx = 0, i;
    for (i = 0; i < App.RANKS.length; i++) if (xp >= App.RANKS[i].xp) idx = i;
    return idx;
  };

  App.nextRank = function (xp) {
    var i = App.rankIndex(xp);
    return App.RANKS[i + 1] || null;
  };

  /** 0..1 progress towards the next rank. */
  App.rankProgress = function (xp) {
    var i = App.rankIndex(xp);
    var cur = App.RANKS[i];
    var next = App.RANKS[i + 1];
    if (!next) return 1;
    return (xp - cur.xp) / (next.xp - cur.xp);
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App;
})(typeof window !== "undefined" ? window : globalThis);
