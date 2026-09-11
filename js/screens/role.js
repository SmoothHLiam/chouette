/* The very first thing the app asks: who is holding the phone? */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var BLURB = {
    student: "Tu joues, tu gagnes de l'XP et tu rends tes devoirs sans t'en rendre compte.",
    teacher: "Crée une classe, donne le code à tes élèves et transforme tes devoirs en mini-jeux."
  };

  App.Router.register("role", function (host, params) {
    var wrap = U.el("div", "level-screen");

    var hero = U.el("div", "level-hero");
    hero.appendChild(App.UI.owl("normal", 118));
    var brand = U.el("div", "brand");
    brand.appendChild(U.el("h1", "brand-name", "Chouette !"));
    brand.appendChild(U.el("p", "brand-tag", "Le français, mais en jeu."));
    hero.appendChild(brand);

    var card = U.el("div", "level-card");
    card.appendChild(U.el("h2", "level-question", "Are you a student or a teacher?"));
    card.appendChild(U.el("p", "level-sub",
      "Les deux jouent aux mêmes jeux — le professeur peut en plus créer une classe et des devoirs."));

    var select = U.el("select", "level-select");
    select.id = "role-select";
    select.setAttribute("aria-label", "Are you a student or a teacher?");
    var placeholder = U.el("option", null, "Choisis…");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    [["student", "Student"], ["teacher", "Teacher"]].forEach(function (pair) {
      var opt = U.el("option", null, pair[1]);
      opt.value = pair[0];
      select.appendChild(opt);
    });
    card.appendChild(select);

    var blurb = U.el("p", "level-blurb", " ");
    card.appendChild(blurb);

    var go = App.UI.bigButton("Continuer", {
      icon: "→",
      onClick: function () {
        if (!select.value) { select.focus(); App.UI.toast("Choisis d'abord : student ou teacher.", "👆"); return; }
        App.Router.go("signin", { role: select.value });
      }
    });
    go.disabled = true;
    card.appendChild(go);

    select.addEventListener("change", function () {
      blurb.textContent = BLURB[select.value] || "";
      go.disabled = false;
      App.Sound.click();
      blurb.classList.remove("pop");
      void blurb.offsetWidth;
      blurb.classList.add("pop");
    });

    wrap.appendChild(hero);
    wrap.appendChild(card);

    /* Returning players skip straight back in. */
    var accounts = App.Accounts.all();
    if (accounts.length) {
      var quick = U.el("div", "quick-signin");
      quick.appendChild(U.el("h3", null, "Déjà venu ?"));
      var row = U.el("div", "account-row");
      accounts.slice(0, 6).forEach(function (account) {
        var b = U.el("button", "account-chip");
        b.appendChild(U.el("span", "account-face", account.role === "teacher" ? "🎓" : "🙋"));
        b.appendChild(U.el("strong", null, account.name));
        b.appendChild(U.el("small", null, account.role === "teacher" ? "professeur" : "élève"));
        b.addEventListener("click", function () {
          App.Sound.click();
          App.Accounts.signIn(account.id);
          App.Router.go(App.afterSignIn());
        });
        row.appendChild(b);
      });
      quick.appendChild(row);
      wrap.appendChild(quick);
    }

    if (params && params.switching) {
      var back = U.el("button", "linkish", "← Annuler");
      back.addEventListener("click", function () { App.Router.go(App.afterSignIn()); });
      wrap.appendChild(back);
    }

    host.appendChild(wrap);
  });

  /** Where a signed-in account belongs right now. */
  App.afterSignIn = function () {
    var p = App.State.profile;
    if (!p.level) return "level";
    return p.role === "teacher" ? "teacher" : "home";
  };
})(typeof window !== "undefined" ? window : globalThis);
