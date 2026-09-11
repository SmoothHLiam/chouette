/* Sign in — a name and a role, kept on this device. No password, no email:
 * the people using this are often minors, and nothing here needs an account. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("signin", function (host, params) {
    var role = params.role === "teacher" ? "teacher" : "student";
    var existing = App.Accounts.byRole(role);

    var wrap = U.el("div", "level-screen");
    var card = U.el("div", "level-card");

    card.appendChild(U.el("h2", "level-question",
      role === "teacher" ? "Bienvenue, professeur" : "Comment tu t'appelles ?"));
    card.appendChild(U.el("p", "level-sub", role === "teacher"
      ? "Ton nom apparaîtra sur la classe que tes élèves rejoindront."
      : "Ton prénom suffit. Tout reste sur cet appareil — rien n'est envoyé nulle part."));

    if (existing.length) {
      var pick = U.el("div", "account-row");
      existing.forEach(function (account) {
        var b = U.el("button", "account-chip");
        b.appendChild(U.el("span", "account-face", role === "teacher" ? "🎓" : "🙋"));
        b.appendChild(U.el("strong", null, account.name));
        b.appendChild(U.el("small", null, "reprendre"));
        b.addEventListener("click", function () {
          App.Sound.click();
          App.Accounts.signIn(account.id);
          App.Router.go(App.afterSignIn());
        });
        pick.appendChild(b);
      });
      card.appendChild(pick);
      card.appendChild(U.el("p", "or-line", "— ou crée un nouveau compte —"));
    }

    var form = U.el("form", "signin-form");
    var input = U.el("input", "conj-input");
    input.type = "text";
    input.maxLength = 24;
    input.autocomplete = "given-name";
    input.placeholder = role === "teacher" ? "Mme Dupont" : "Camille";
    input.setAttribute("aria-label", "Ton nom");
    var submit = U.el("button", "conj-go", "OK");
    submit.type = "submit";
    form.appendChild(input);
    form.appendChild(submit);
    card.appendChild(form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = input.value.trim();
      if (!name) { input.focus(); App.UI.toast("Écris ton nom pour continuer.", "✏️"); return; }
      App.Sound.levelUp();
      var account = App.Accounts.create(name, role);
      App.Accounts.signIn(account.id);
      App.State.profile.role = role;
      App.State.save();
      App.Router.go("level");
    });

    var back = U.el("button", "linkish", "← Retour");
    back.addEventListener("click", function () { App.Sound.click(); App.Router.go("role"); });

    wrap.appendChild(card);
    wrap.appendChild(back);
    host.appendChild(wrap);
    setTimeout(function () { if (!existing.length) input.focus(); }, 120);
  });
})(typeof window !== "undefined" ? window : globalThis);
