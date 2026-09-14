/* Réglages — how the app looks, sounds and speaks on this device. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("settings", function (host) {
    var p = App.State.profile;
    host.appendChild(App.UI.topBar({ back: App.UI.homeScreen() }));

    var wrap = U.el("div", "settings-page");
    wrap.appendChild(U.el("h2", "page-title", "⚙️ Réglages"));
    wrap.appendChild(U.el("p", "page-sub",
      "L'apparence, le texte et les animations valent pour cet appareil — pratique " +
      "sur un ordinateur partagé. Le reste suit ton compte."));

    /* ------------------------------------------------------- apparence -- */
    wrap.appendChild(U.el("h3", "shop-head", "Apparence"));

    wrap.appendChild(segmented({
      label: "Mode d'affichage",
      options: App.Skin.SKINS,
      value: App.Skin.get("skin"),
      onPick: function (id) {
        App.Skin.set("skin", id);
        App.Sound.click();
        App.Router.go("settings");
        App.UI.toast("Mode " + App.Skin.describe("skin").name.toLowerCase() + " activé.", 
          App.Skin.describe("skin").icon, "good");
      }
    }));

    /* Themes are part of the colourful identity; minimal deliberately ignores
     * them, so say so rather than leaving a dead control on screen. */
    if (App.Skin.get("skin") === "colorful") {
      var owned = App.THEMES.filter(function (t) { return App.State.owns("themes", t.id); });
      if (owned.length > 1) {
        var themeRow = U.el("div", "setting-block");
        themeRow.appendChild(U.el("span", "setting-label", "Thème de couleur"));
        var swatches = U.el("div", "theme-row");
        owned.forEach(function (t) {
          var b = U.el("button", "theme-dot" + (p.theme === t.id ? " active" : ""));
          b.title = t.name;
          b.setAttribute("aria-label", t.name);
          t.swatch.forEach(function (c) {
            var s = U.el("span");
            s.style.background = c;
            b.appendChild(s);
          });
          b.addEventListener("click", function () {
            p.theme = t.id;
            App.UI.applyTheme(t.id);
            App.State.save();
            App.Sound.click();
            App.Router.go("settings");
          });
          swatches.appendChild(b);
        });
        themeRow.appendChild(swatches);
        themeRow.appendChild(U.el("small", "setting-hint",
          "D'autres thèmes t'attendent dans la boutique."));
        wrap.appendChild(themeRow);
      }
    } else {
      wrap.appendChild(hint("Le mode minimal utilise sa propre palette claire. " +
        "Tes thèmes achetés reviennent dès que tu repasses en mode coloré."));
    }

    wrap.appendChild(segmented({
      label: "Taille du texte",
      options: App.Skin.TEXT_SIZES,
      value: App.Skin.get("text"),
      onPick: function (id) {
        App.Skin.set("text", id);
        App.Sound.click();
        App.Router.go("settings");
      }
    }));

    wrap.appendChild(segmented({
      label: "Animations",
      options: App.Skin.MOTIONS,
      value: App.Skin.get("motion"),
      onPick: function (id) {
        App.Skin.set("motion", id);
        App.Sound.click();
        App.Router.go("settings");
      }
    }));

    /* ------------------------------------------------------ son & voix -- */
    wrap.appendChild(U.el("h3", "shop-head", "Son et voix"));
    var sound = U.el("div", "settings");

    sound.appendChild(toggle("🔊 Sons du jeu", p.sound !== false, function (on) {
      p.sound = on;
      App.State.save();
      if (on) App.Sound.click();
    }));
    sound.appendChild(toggle("🗣️ Voix française", p.voice !== false, function (on) {
      p.voice = on;
      App.State.save();
      if (on) App.Speech.say("Bonjour ! Je parle français.");
    }));
    sound.appendChild(voiceRow());
    wrap.appendChild(sound);

    /* --------------------------------------------------------- compte -- */
    wrap.appendChild(U.el("h3", "shop-head", "Compte"));
    var account = U.el("div", "settings");

    var levelRow = U.el("div", "setting-row");
    levelRow.appendChild(U.el("span", null, "🎓 Niveau de français"));
    var levelBtn = U.el("button", "linkish", App.LEVELS[(p.level || 1) - 1].label + " — changer");
    levelBtn.addEventListener("click", function () {
      App.Sound.click();
      App.Router.go("level", { switching: true });
    });
    levelRow.appendChild(levelBtn);
    account.appendChild(levelRow);

    var whoRow = U.el("div", "setting-row");
    whoRow.appendChild(U.el("span", null, "🙋 Compte"));
    var whoBtn = U.el("button", "linkish", (p.name || "Moi") + " — changer de compte");
    whoBtn.addEventListener("click", function () {
      App.Sound.click();
      App.Accounts.signOut();
      App.Router.go("role");
    });
    whoRow.appendChild(whoBtn);
    account.appendChild(whoRow);
    account.appendChild(syncRow());

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
    account.appendChild(resetRow);
    wrap.appendChild(account);

    host.appendChild(wrap);

    /* ---------------------------------------------------------- pieces -- */

    /** A labelled row of mutually exclusive choices. */
    function segmented(opts) {
      var block = U.el("div", "setting-block");
      block.appendChild(U.el("span", "setting-label", opts.label));
      var group = U.el("div", "seg");
      group.setAttribute("role", "radiogroup");
      group.setAttribute("aria-label", opts.label);
      opts.options.forEach(function (choice) {
        var on = choice.id === opts.value;
        var b = U.el("button", "seg-btn" + (on ? " on" : ""));
        b.setAttribute("role", "radio");
        b.setAttribute("aria-checked", on ? "true" : "false");
        if (choice.icon) b.appendChild(U.el("span", "seg-icon", choice.icon));
        b.appendChild(U.el("span", "seg-name", choice.name));
        b.addEventListener("click", function () {
          if (on) return;
          opts.onPick(choice.id);
        });
        group.appendChild(b);
      });
      block.appendChild(group);
      var chosen = opts.options.filter(function (c) { return c.id === opts.value; })[0];
      if (chosen && chosen.blurb) block.appendChild(U.el("small", "setting-hint", chosen.blurb));
      return block;
    }

    function hint(text) {
      var box = U.el("div", "setting-block");
      box.appendChild(U.el("small", "setting-hint", text));
      return box;
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

    function voiceRow() {
      var row = U.el("div", "setting-row voice-row");
      function render() {
        U.clear(row);
        row.appendChild(U.el("span", null, "🔈 Voix"));
        var voices = App.Speech.voices();
        if (!voices.length) {
          row.appendChild(U.el("small", "voice-missing", App.Speech.describe()));
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

    function syncRow() {
      var row = U.el("div", "setting-row");
      row.appendChild(U.el("span", null, "☁️ Synchronisation"));
      var state = U.el("small", "class-hint");
      function show() {
        U.clear(state);
        state.appendChild(U.el("span", "sync-dot" + (App.Sync.online ? " on" : "")));
        state.appendChild(document.createTextNode(
          !App.Sync.available() ? "hors ligne (fichier local) — codes d'invitation"
            : App.Sync.online ? "active" + (App.Sync.hasPending() ? " · envoi en attente" : "")
            : "serveur injoignable — les résultats repartiront plus tard"));
        if (App.Sync.available()) {
          state.appendChild(U.el("small", "sync-endpoint", App.Sync.endpoint() + "/api/health"));
        }
      }
      show();
      App.Sync.probe().then(show);
      row.appendChild(state);
      return row;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
