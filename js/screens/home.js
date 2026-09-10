/* The hub: missions of the day, then the arcade of mini-games. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var GREETINGS = [
    "Prêt à jouer ?", "On y va ?", "Encore une partie ?", "À l'attaque !",
    "Salut, champion·ne !", "Le français t'attend."
  ];

  App.Router.register("home", function (host, params) {
    var p = App.State.profile;
    var level = p.level || 1;
    host.appendChild(App.UI.topBar());

    var wrap = U.el("div", "home");

    /* ------------------------------------------------------- the mascot -- */
    var hello = U.el("div", "hello-card");
    hello.appendChild(App.UI.owl(App.State.streakAlive() && p.streak > 0 ? "happy" : "normal", 84));
    var helloText = U.el("div", "hello-text");
    helloText.appendChild(U.el("h2", null, U.pick(GREETINGS)));
    var streakLine = p.streak > 0 && App.State.streakAlive()
      ? "🔥 Série de " + p.streak + " jour" + (p.streak > 1 ? "s" : "") + " — ne la casse pas !"
      : "Joue une partie aujourd'hui pour lancer ta série.";
    helloText.appendChild(U.el("p", null, streakLine));
    hello.appendChild(helloText);
    wrap.appendChild(hello);

    /* ------------------------------------------------------ the missions -- */
    var quests = App.Quests.today();
    var qBox = U.el("section", "quests");
    var qHead = U.el("div", "section-head");
    qHead.appendChild(U.el("h3", null, "Missions du jour"));
    var doneCount = quests.filter(function (q) { return q.done; }).length;
    qHead.appendChild(U.el("span", "section-note", doneCount + " / " + quests.length + " terminées"));
    qBox.appendChild(qHead);

    quests.forEach(function (q) {
      var row = U.el("div", "quest" + (q.done ? " done" : ""));
      row.appendChild(U.el("span", "quest-icon", q.done ? "✅" : q.icon));
      var mid = U.el("div", "quest-mid");
      mid.appendChild(U.el("div", "quest-text", q.text));
      var track = U.el("div", "quest-track");
      var fill = U.el("div", "quest-fill");
      fill.style.width = U.clamp(q.progress / q.goal, 0, 1) * 100 + "%";
      track.appendChild(fill);
      mid.appendChild(track);
      mid.appendChild(U.el("small", "quest-count", q.progress + " / " + q.goal));
      row.appendChild(mid);
      row.appendChild(U.el("span", "quest-prize", "🥐 " + q.coins));
      qBox.appendChild(row);
    });
    wrap.appendChild(qBox);

    /* --------------------------------------------------------- the games -- */
    var games = App.Games.forLevel(level);
    var gBox = U.el("section", "arcade");
    var gHead = U.el("div", "section-head");
    gHead.appendChild(U.el("h3", null, "La salle de jeux"));
    var levelChip = U.el("button", "level-chip", App.LEVELS[level - 1].label + " ▾");
    levelChip.title = "Changer de niveau";
    levelChip.addEventListener("click", function () {
      App.Sound.click();
      App.Router.go("level", { switching: true });
    });
    gHead.appendChild(levelChip);
    gBox.appendChild(gHead);

    var grid = U.el("div", "game-grid");
    games.forEach(function (g) {
      var best = (p.games[g.id] || {}).best || 0;
      var card = U.el("button", "game-card theme-" + (g.color || "blue"));
      card.appendChild(U.el("span", "game-icon", g.icon));
      var body = U.el("span", "game-body");
      body.appendChild(U.el("strong", "game-name", g.name));
      body.appendChild(U.el("small", "game-tag", g.tagline));
      body.appendChild(U.el("small", "game-best", best ? "Record : " + best + " pts" : "Jamais joué"));
      card.appendChild(body);
      card.addEventListener("click", function () {
        App.Sound.click();
        App.Router.go("play", { id: g.id });
      });
      grid.appendChild(card);
    });
    gBox.appendChild(grid);
    wrap.appendChild(gBox);

    /* ------------------------------------------------------ side actions -- */
    var weak = App.State.weakKeys(60);
    var actions = U.el("section", "home-actions");

    var review = U.el("button", "wide-card review-card");
    review.innerHTML = '<span class="wide-icon">🔁</span>' +
      '<span class="wide-body"><strong>Révision ciblée</strong><small>' +
      (weak.length >= 4
        ? weak.length + " mots te résistent — 25 % d'XP en plus."
        : "Joue un peu : tes erreurs deviendront un entraînement sur mesure.") +
      "</small></span>";
    if (weak.length < 4) review.classList.add("locked");
    review.addEventListener("click", function () {
      if (weak.length < 4) { App.UI.toast("Il faut d'abord quelques erreurs à réviser !", "🙂"); return; }
      App.Sound.click();
      App.Router.go("play", { id: "revision" });
    });
    actions.appendChild(review);

    var row = U.el("div", "action-row");
    [
      { icon: "🛍️", label: "Boutique", screen: "shop" },
      { icon: "🏅", label: "Badges", screen: "badges" },
      { icon: "📊", label: "Profil", screen: "profile" }
    ].forEach(function (a) {
      var b = U.el("button", "mini-card");
      b.appendChild(U.el("span", "mini-icon", a.icon));
      b.appendChild(U.el("span", "mini-label", a.label));
      b.addEventListener("click", function () { App.Sound.click(); App.Router.go(a.screen); });
      row.appendChild(b);
    });
    actions.appendChild(row);
    wrap.appendChild(actions);

    host.appendChild(wrap);

    if (params && params.greet) {
      App.UI.toast("Niveau réglé sur " + App.LEVELS[level - 1].label + " !", "🎉", "good");
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
