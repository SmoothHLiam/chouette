/* The payoff screen: score, XP, croissants, new badges, promotions. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var PRAISE = [
    { min: 95, text: "Impeccable !", icon: "🏆" },
    { min: 80, text: "Excellent travail !", icon: "🌟" },
    { min: 60, text: "Bien joué !", icon: "👏" },
    { min: 40, text: "Ça progresse !", icon: "💪" },
    { min: 0, text: "On retente ?", icon: "🙂" }
  ];

  App.Router.register("results", function (host, s) {
    var praise = PRAISE.find(function (p) { return s.accuracy >= p.min; });
    var wrap = U.el("div", "results");

    var head = U.el("div", "results-head");
    head.appendChild(U.el("div", "results-icon", praise.icon));
    head.appendChild(U.el("h2", null, praise.text));
    head.appendChild(U.el("p", "results-sub", s.gameIcon + " " + s.gameName));
    wrap.appendChild(head);

    var score = U.el("div", "results-score");
    score.appendChild(U.el("span", "results-score-value", String(s.score)));
    score.appendChild(U.el("span", "results-score-label", "points"));
    wrap.appendChild(score);

    var stats = U.el("div", "results-stats");
    [
      { icon: "✅", value: s.correct + " / " + s.total, label: "bonnes réponses" },
      { icon: "🎯", value: s.accuracy + " %", label: "précision" },
      { icon: "🔥", value: "×" + s.bestCombo, label: "meilleur combo" },
      { icon: "⏱️", value: s.seconds + " s", label: "durée" }
    ].forEach(function (item) {
      var box = U.el("div", "rstat");
      box.appendChild(U.el("span", "rstat-icon", item.icon));
      box.appendChild(U.el("strong", null, item.value));
      box.appendChild(U.el("small", null, item.label));
      stats.appendChild(box);
    });
    wrap.appendChild(stats);

    var rewards = U.el("div", "results-rewards");
    rewards.appendChild(reward("⭐", "+" + s.xp + " XP"));
    rewards.appendChild(reward("🥐", "+" + s.coins));
    if (s.perfect && s.total >= 6) rewards.appendChild(reward("💎", "Sans faute !"));
    if (s.bossBeaten) rewards.appendChild(reward("🐲", "Boss vaincu !"));
    wrap.appendChild(rewards);

    function reward(icon, text) {
      var r = U.el("div", "reward");
      r.appendChild(U.el("span", "reward-icon", icon));
      r.appendChild(U.el("span", "reward-text", text));
      return r;
    }

    if (s.promoted) {
      var promo = U.el("div", "promo");
      promo.innerHTML = "<span>" + s.promoted.icon + "</span><div><strong>Nouveau rang !</strong><small>" +
        s.promoted.name + "</small></div>";
      wrap.appendChild(promo);
    }

    if (s.streak && s.streak.changed) {
      var st = U.el("div", "streak-note");
      st.textContent = "🔥 Série portée à " + s.streak.streak + " jour" + (s.streak.streak > 1 ? "s" : "") + " !";
      wrap.appendChild(st);
    }

    if (s.quests && s.quests.length) {
      var qb = U.el("div", "results-quests");
      qb.appendChild(U.el("h3", null, "Mission" + (s.quests.length > 1 ? "s" : "") + " accomplie" + (s.quests.length > 1 ? "s" : "") + " !"));
      s.quests.forEach(function (q) {
        var row = U.el("div", "quest done");
        row.appendChild(U.el("span", "quest-icon", "✅"));
        row.appendChild(U.el("div", "quest-mid", q.text));
        row.appendChild(U.el("span", "quest-prize", "🥐 " + q.coins));
        qb.appendChild(row);
      });
      wrap.appendChild(qb);
    }

    if (s.badges && s.badges.length) {
      var bb = U.el("div", "results-badges");
      bb.appendChild(U.el("h3", null, "Nouveau badge !"));
      var strip = U.el("div", "badge-strip");
      s.badges.forEach(function (b) {
        var badge = U.el("div", "badge earned");
        badge.appendChild(U.el("span", "badge-icon", b.icon));
        badge.appendChild(U.el("strong", null, b.name));
        badge.appendChild(U.el("small", null, b.desc));
        strip.appendChild(badge);
      });
      bb.appendChild(strip);
      wrap.appendChild(bb);
    }

    var actions = U.el("div", "results-actions");
    actions.appendChild(App.UI.bigButton("Rejouer", {
      icon: "🔄",
      onClick: function () { App.Router.go("play", { id: s.gameId }); }
    }));
    actions.appendChild(App.UI.bigButton("La salle de jeux", {
      icon: "🏠", variant: "ghost",
      onClick: function () { App.Router.go("home"); }
    }));
    wrap.appendChild(actions);

    host.appendChild(wrap);

    if (s.accuracy >= 80 || s.bossBeaten) {
      setTimeout(function () { App.FX.rain(70); App.Sound.win(); }, 220);
    } else if (s.promoted) {
      App.Sound.levelUp();
    }
    if (s.badges && s.badges.length) {
      s.badges.forEach(function (b, i) {
        setTimeout(function () { App.UI.toast("Badge débloqué : " + b.name, b.icon, "good"); }, 500 + i * 700);
      });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
