/* The very first thing the app asks. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("level", function (host, params) {
    var p = App.State.profile;
    var wrap = U.el("div", "level-screen");

    var hero = U.el("div", "level-hero");
    hero.appendChild(App.UI.owl("normal", 130));
    var brand = U.el("div", "brand");
    brand.appendChild(U.el("h1", "brand-name", "Chouette !"));
    brand.appendChild(U.el("p", "brand-tag", "Le français, mais en jeu."));
    hero.appendChild(brand);

    var card = U.el("div", "level-card");
    card.appendChild(U.el("h2", "level-question", "What French level are you?"));
    card.appendChild(U.el("p", "level-sub", p.role === "teacher"
      ? "Le niveau que tu enseignes : il règle le vocabulaire, les temps verbaux et les boss des devoirs que tu donneras."
      : "Ton niveau règle le vocabulaire, les temps verbaux et les boss. Tu pourras le changer plus tard."));

    var select = U.el("select", "level-select");
    select.id = "level-select";
    select.setAttribute("aria-label", "What French level are you?");
    var placeholder = U.el("option", null, "Choisis ton niveau…");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    App.LEVELS.forEach(function (lvl) {
      var opt = U.el("option", null, lvl.label);
      opt.value = String(lvl.id);
      if (p.level === lvl.id) { opt.selected = true; placeholder.selected = false; }
      select.appendChild(opt);
    });
    card.appendChild(select);

    var blurb = U.el("p", "level-blurb", p.level ? App.LEVELS[p.level - 1].blurb : " ");
    card.appendChild(blurb);

    var go = App.UI.bigButton("C'est parti !", {
      icon: "🚀",
      onClick: function () {
        var value = parseInt(select.value, 10);
        if (!value) { select.focus(); App.UI.toast("Choisis d'abord ton niveau.", "👆"); return; }
        App.State.setLevel(value);
        App.Sound.levelUp();
        if (params && params.switching) { App.Router.go(App.afterSignIn()); return; }
        if (p.role === "teacher") { App.Router.go("teacher"); return; }
        App.Router.go(p.classCode ? "home" : "classcode", { greet: true });
      }
    });
    go.disabled = !p.level;
    card.appendChild(go);

    select.addEventListener("change", function () {
      var lvl = App.LEVELS[parseInt(select.value, 10) - 1];
      blurb.textContent = lvl ? lvl.blurb : "";
      go.disabled = false;
      App.Sound.click();
      blurb.classList.remove("pop");
      void blurb.offsetWidth;
      blurb.classList.add("pop");
    });

    wrap.appendChild(hero);
    wrap.appendChild(card);

    if (params && params.switching) {
      var back = U.el("button", "linkish", "← Retour au jeu");
      back.addEventListener("click", function () { App.Router.go("home"); });
      wrap.appendChild(back);
    } else {
      wrap.appendChild(U.el("p", "level-foot",
        "8 mini-jeux · 5 niveaux · aucune installation. Tes progrès restent sur cet appareil."));
      var changeRole = U.el("button", "linkish", "← Je ne suis pas " + (p.name || "ici"));
      changeRole.addEventListener("click", function () {
        App.Sound.click();
        App.Accounts.signOut();
        App.Router.go("role");
      });
      wrap.appendChild(changeRole);
    }

    host.appendChild(wrap);
  });
})(typeof window !== "undefined" ? window : globalThis);
