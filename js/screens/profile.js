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
      if (on) App.Speech.say("Bonjour ! Je parle français.");
    }));
    settings.appendChild(voiceRow());

    var levelRow = U.el("div", "setting-row");
    levelRow.appendChild(U.el("span", null, "🎓 Niveau de français"));
    var levelBtn = U.el("button", "linkish", App.LEVELS[(p.level || 1) - 1].label + " — changer");
    levelBtn.addEventListener("click", function () {
      App.Sound.click();
      App.Router.go("level", { switching: true });
    });
    levelRow.appendChild(levelBtn);
    settings.appendChild(levelRow);

    var accountRow = U.el("div", "setting-row");
    accountRow.appendChild(U.el("span", null, "🙋 Compte"));
    var switchBtn = U.el("button", "linkish", (p.name || "Moi") + " — changer de compte");
    switchBtn.addEventListener("click", function () {
      App.Sound.click();
      App.Accounts.signOut();
      App.Router.go("role");
    });
    accountRow.appendChild(switchBtn);
    settings.appendChild(accountRow);

    var syncRow = U.el("div", "setting-row");
    syncRow.appendChild(U.el("span", null, "☁️ Synchronisation"));
    var syncState = U.el("small", "class-hint");
    function showSync() {
      var dot = U.el("span", "sync-dot" + (App.Sync.online ? " on" : ""));
      U.clear(syncState);
      syncState.appendChild(dot);
      syncState.appendChild(document.createTextNode(
        !App.Sync.available() ? "hors ligne (fichier local) — codes d'invitation"
          : App.Sync.online ? "active" + (App.Sync.hasPending() ? " · envoi en attente" : "")
          : "serveur injoignable — les résultats repartiront plus tard"));
    }
    showSync();
    App.Sync.probe().then(showSync);
    syncRow.appendChild(syncState);
    settings.appendChild(syncRow);

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

    /* Which French voice reads the words. Voices arrive asynchronously, so the
     * row rebuilds itself once the browser has published its list. */
    function voiceRow() {
      var row = U.el("div", "setting-row voice-row");
      function render() {
        U.clear(row);
        row.appendChild(U.el("span", null, "🔈 Voix"));
        var voices = App.Speech.voices();
        if (!voices.length) {
          var warn = U.el("small", "voice-missing", App.Speech.describe());
          row.appendChild(warn);
          return;
        }
        var select = U.el("select", "voice-select");
        voices.forEach(function (v) {
          var opt = U.el("option", null, v.name + " · " + v.lang);
          opt.value = v.voiceURI;
          if (App.Speech.current() && App.Speech.current().voiceURI === v.voiceURI) opt.selected = true;
          select.appendChild(opt);
        });
        select.addEventListener("change", function () {
          App.Speech.setVoice(select.value);
          App.Speech.say("Bonjour ! Je parle français.");
        });
        row.appendChild(select);
      }
      render();
      App.Speech.onReady(render);
      return row;
    }

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
