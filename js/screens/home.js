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

    /* ------------------------------------------------------ les devoirs -- */
    if (p.role === "teacher") {
      var dash = U.el("button", "wide-card teacher-card");
      dash.innerHTML = '<span class="wide-icon">🎓</span><span class="wide-body">' +
        "<strong>Tableau de bord</strong><small>Ta classe, ton code et tes devoirs.</small></span>";
      dash.addEventListener("click", function () { App.Sound.click(); App.Router.go("teacher"); });
      wrap.appendChild(dash);
    } else {
      wrap.appendChild(homeworkSection());
    }

    wrap.appendChild(wordOfTheDay());

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

    /** One word a day, the same one for everyone at this level, so a class can
     *  actually talk about it. */
    function wordOfTheDay() {
      var item = App.Vocab.wordOfTheDay(level);
      var box = U.el("section", "wotd");
      var head = U.el("div", "wotd-head");
      head.appendChild(U.el("span", "wotd-label", "Mot du jour"));
      if (item.c) head.appendChild(U.el("span", "wotd-cat", item.c));
      box.appendChild(head);

      var line = U.el("div", "wotd-line");
      var word = U.el("strong", "wotd-word", App.Vocab.display(item));
      line.appendChild(word);
      line.appendChild(App.GameKit.speakButton(App.Vocab.display(item)));
      box.appendChild(line);
      box.appendChild(U.el("small", "wotd-en", item.en));

      var seen = App.State.masteryOf(item.fr);
      if (seen && seen.r + seen.w > 0) {
        box.appendChild(U.el("em", "wotd-note",
          seen.w > seen.r ? "Tu l'as déjà raté — vise-le aujourd'hui." : "Tu le connais déjà. Bravo !"));
      }
      return box;
    }

    /** Homework comes before the daily missions: it is the one thing that is
     *  actually owed to somebody. */
    function homeworkSection() {
      var status = App.School.statusFor(p);
      if (!status) {
        var join = U.el("button", "wide-card join-card");
        join.innerHTML = '<span class="wide-icon">🎒</span><span class="wide-body">' +
          "<strong>Rejoindre une classe</strong><small>Un code de ton professeur et ses devoirs arrivent ici.</small></span>";
        join.addEventListener("click", function () {
          App.Sound.click();
          App.Router.go("classcode");
        });
        return join;
      }

      var box = U.el("section", "homework");
      var head = U.el("div", "section-head");
      head.appendChild(U.el("h3", null, "Devoirs · " + status.klass.name));
      head.appendChild(U.el("span", "section-note", status.done + " / " + status.total + " rendus"));
      box.appendChild(head);

      if (!status.total) {
        box.appendChild(U.el("p", "page-sub",
          "Ton professeur n'a pas encore donné de devoir. Profites-en pour jouer."));
        return box;
      }

      status.klass.assignments.forEach(function (a) {
        var rec = p.assignments[App.School.progressKey(status.klass.code, a.id)];
        var done = !!(rec && rec.done);
        var game = App.Games.get(a.gameId);
        var row = U.el("button", "assign-row assign-play" + (done ? " done" : ""));
        row.appendChild(U.el("span", "assign-icon", done ? "✅" : (game ? game.icon : "🎯")));
        var mid = U.el("div", "assign-mid");
        mid.appendChild(U.el("strong", null, App.School.describe(a)));
        var meta = [];
        var due = App.School.dueLabel(a);
        if (due) meta.push("📅 " + due);
        if (a.note) meta.push("💬 " + a.note);
        if (done) meta.push("rendu ✓");
        else meta.push("🥐 " + App.School.REWARD.coins + " + " + App.School.REWARD.xp + " XP");
        mid.appendChild(U.el("small", null, meta.join("  ·  ")));
        row.appendChild(mid);
        if (!done) row.appendChild(U.el("span", "assign-go", "▶"));
        row.addEventListener("click", function () {
          if (done) { App.UI.toast("Déjà rendu — mais tu peux rejouer !", "✅"); }
          App.Sound.click();
          if (a.gameId === "any") {
            App.UI.toast("Choisis le jeu que tu veux dans la salle de jeux.", "🕹️");
            return;
          }
          App.Router.go("play", { id: a.gameId });
        });
        box.appendChild(row);
      });

      var overdue = status.klass.assignments.some(function (a) {
        var rec = p.assignments[App.School.progressKey(status.klass.code, a.id)];
        return (!rec || !rec.done) && a.due && U.daysBetween(U.today(), a.due) < 0;
      });
      if (overdue) box.classList.add("has-late");
      return box;
    }

    if (params && params.greet) {
      App.UI.toast("Niveau réglé sur " + App.LEVELS[level - 1].label + " !", "🎉", "good");
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
