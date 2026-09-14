/* Profil : statistiques, réglages, mots à revoir. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("profile", function (host) {
    var p = App.State.profile;
    host.appendChild(App.UI.topBar({ back: App.UI.homeScreen() }));

    var wrap = U.el("div", "profile");
    var rank = App.rankFor(p.xp);

    var card = U.el("div", "profile-card");
    card.appendChild(U.el("div", "profile-avatar", p.avatar));
    var meta = U.el("div", "profile-meta");
    meta.appendChild(U.el("h2", null, rank.icon + " " + rank.name));
    meta.appendChild(U.el("p", null, App.LEVELS[(p.level || 1) - 1].label + " · " + p.xp + " XP · 🥐 " + p.coins));
    card.appendChild(meta);
    wrap.appendChild(card);

    /* ------------------------------------------------------- ma classe -- */
    if (p.role === "student") {
      var status = App.School.statusFor(p);
      var classBox = U.el("section", "class-card");
      if (status) {
        var ch = U.el("div", "class-head");
        var ct = U.el("div", null);
        ct.appendChild(U.el("h3", null, status.klass.name));
        ct.appendChild(U.el("small", null,
          (status.klass.teacher ? status.klass.teacher + " · " : "") +
          status.done + " / " + status.total + " devoirs rendus"));
        ch.appendChild(ct);
        classBox.appendChild(ch);

        var codeBox = U.el("div", "code-box");
        codeBox.appendChild(U.el("small", null, "Code de la classe"));
        codeBox.appendChild(U.el("strong", "code-value", App.School.pretty(status.klass.code)));
        classBox.appendChild(codeBox);

        var ca = U.el("div", "class-actions");
        ca.appendChild(App.UI.bigButton("Envoyer mes résultats", {
          icon: "📤",
          onClick: function () {
            var code = App.School.progressCode(p);
            if (!code) { App.UI.toast("Rien à envoyer pour l'instant.", "🤷"); return; }
            App.UI.copy(code, "Code de résultats copié");
          }
        }));
        ca.appendChild(App.UI.bigButton("Quitter la classe", {
          variant: "ghost",
          onClick: function () {
            App.State.setClass(null);
            App.UI.toast("Tu as quitté la classe.", "👋");
            App.Router.go("profile");
          }
        }));
        classBox.appendChild(ca);
        classBox.appendChild(U.el("p", "class-hint",
          "Colle ce code de résultats dans un message à ton professeur : il verra " +
          "tes devoirs rendus même si vous n'êtes pas sur le même appareil."));
      } else {
        classBox.appendChild(U.el("h3", null, "Aucune classe"));
        classBox.appendChild(U.el("p", "class-hint",
          "Ton professeur t'a donné un code ? Ajoute-le pour recevoir ses devoirs."));
        classBox.appendChild(App.UI.bigButton("Rejoindre une classe", {
          icon: "🎒",
          onClick: function () { App.Router.go("classcode", { fromProfile: true }); }
        }));
      }
      wrap.appendChild(classBox);
    }

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

    /* Display, sound and account settings now live on their own screen. */
    var toSettings = U.el("button", "wide-card");
    toSettings.innerHTML = '<span class="wide-icon">⚙️</span><span class="wide-body">' +
      "<strong>Réglages</strong><small>Apparence, taille du texte, sons, voix et compte.</small></span>";
    toSettings.addEventListener("click", function () {
      App.Sound.click();
      App.Router.go("settings");
    });
    wrap.appendChild(toSettings);

    host.appendChild(wrap);
  });
})(typeof window !== "undefined" ? window : globalThis);
