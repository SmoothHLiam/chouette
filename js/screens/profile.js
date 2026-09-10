/* Profil : statistiques, réglages, mots à revoir. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("profile", function (host) {
    var p = App.State.profile;
    host.appendChild(App.UI.topBar({ back: "home" }));

    var wrap = U.el("div", "profile");
    var rank = App.rankFor(p.xp);

    var card = U.el("div", "profile-card");
    card.appendChild(U.el("div", "profile-avatar", p.avatar));
    var meta = U.el("div", "profile-meta");
    meta.appendChild(U.el("h2", null, rank.icon + " " + rank.name));
    meta.appendChild(U.el("p", null, App.LEVELS[(p.level || 1) - 1].label + " · " + p.xp + " XP · 🥐 " + p.coins));
    card.appendChild(meta);
    wrap.appendChild(card);

    /* ---------------------------------------------------------- numbers -- */
    var acc = p.stats.answered ? Math.round((p.stats.correct / p.stats.answered) * 100) : 0;
    var grid = U.el("div", "stat-grid");
    [
      { icon: "🎮", value: p.stats.sessions, label: "parties jouées" },
      { icon: "💬", value: p.stats.answered, label: "réponses données" },
      { icon: "🎯", value: acc + " %", label: "précision globale" },
      { icon: "🔥", value: "×" + p.stats.bestCombo, label: "meilleur combo" },
      { icon: "🐲", value: p.stats.bosses, label: "boss vaincus" },
      { icon: "📅", value: p.bestStreak, label: "meilleure série" }
    ].forEach(function (s) {
      var box = U.el("div", "stat-box");
      box.appendChild(U.el("span", "stat-icon", s.icon));
      box.appendChild(U.el("strong", null, String(s.value)));
      box.appendChild(U.el("small", null, s.label));
      grid.appendChild(box);
    });
    wrap.appendChild(grid);

    /* ----------------------------------------------------- per-game bests */
    var games = App.Games.all().filter(function (g) { return p.games[g.id]; });
    if (games.length) {
      wrap.appendChild(U.el("h3", "shop-head", "Records par jeu"));
      var list = U.el("div", "record-list");
      games.forEach(function (g) {
        var rec = p.games[g.id];
        var row = U.el("div", "record-row");
        row.appendChild(U.el("span", "record-icon", g.icon));
        var mid = U.el("div", "record-mid");
        mid.appendChild(U.el("strong", null, g.name));
        mid.appendChild(U.el("small", null, rec.plays + " partie" + (rec.plays > 1 ? "s" : "") + " · " + rec.correct + " bonnes réponses"));
        row.appendChild(mid);
        row.appendChild(U.el("span", "record-best", rec.best + " pts"));
        list.appendChild(row);
      });
      wrap.appendChild(list);
    }

    /* -------------------------------------------------------- weak words -- */
    var weak = App.State.weakKeys(12);
    if (weak.length) {
      wrap.appendChild(U.el("h3", "shop-head", "Mots à revoir"));
      var chips = U.el("div", "weak-chips");
      weak.forEach(function (k) {
        var m = App.State.masteryOf(k) || { r: 0, w: 0 };
        var chip = U.el("span", "weak-chip", k);
        chip.title = m.r + " justes / " + m.w + " ratés";
        chips.appendChild(chip);
      });
      wrap.appendChild(chips);
    }

    /* ---------------------------------------------------------- settings -- */
    wrap.appendChild(U.el("h3", "shop-head", "Réglages"));
    var settings = U.el("div", "settings");

    settings.appendChild(toggle("🔊 Sons du jeu", p.sound !== false, function (on) {
      p.sound = on;
      App.State.save();
      if (on) App.Sound.click();
    }));
    settings.appendChild(toggle("🗣️ Voix française", p.voice !== false, function (on) {
      p.voice = on;
      App.State.save();
      if (on) App.Speech.say("Bonjour !");
    }));

    var levelRow = U.el("div", "setting-row");
    levelRow.appendChild(U.el("span", null, "🎓 Niveau de français"));
    var levelBtn = U.el("button", "linkish", App.LEVELS[(p.level || 1) - 1].label + " — changer");
    levelBtn.addEventListener("click", function () {
      App.Sound.click();
      App.Router.go("level", { switching: true });
    });
    levelRow.appendChild(levelBtn);
    settings.appendChild(levelRow);

    var resetRow = U.el("div", "setting-row");
    resetRow.appendChild(U.el("span", null, "🧹 Repartir de zéro"));
    var resetBtn = U.el("button", "linkish danger", "Effacer ma progression");
    resetBtn.addEventListener("click", function () {
      App.UI.modal(function (box, close) {
        box.appendChild(U.el("h3", null, "Tout effacer ?"));
        box.appendChild(U.el("p", null,
          "XP, badges, croissants et séries seront perdus. Cette action est définitive."));
        var row = U.el("div", "modal-actions");
        row.appendChild(App.UI.bigButton("Annuler", { variant: "ghost", onClick: close }));
        row.appendChild(App.UI.bigButton("Effacer", {
          variant: "danger",
          onClick: function () {
            App.State.reset();
            close();
            App.UI.applyTheme("nuit");
            App.Router.go("level");
          }
        }));
        box.appendChild(row);
      });
    });
    resetRow.appendChild(resetBtn);
    settings.appendChild(resetRow);
    wrap.appendChild(settings);

    host.appendChild(wrap);

    function toggle(label, value, onChange) {
      var row = U.el("div", "setting-row");
      row.appendChild(U.el("span", null, label));
      var btn = U.el("button", "switch" + (value ? " on" : ""));
      btn.setAttribute("role", "switch");
      btn.setAttribute("aria-checked", value ? "true" : "false");
      btn.appendChild(U.el("span", "knob"));
      btn.addEventListener("click", function () {
        var next = !btn.classList.contains("on");
        btn.classList.toggle("on", next);
        btn.setAttribute("aria-checked", next ? "true" : "false");
        onChange(next);
      });
      row.appendChild(btn);
      return row;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
