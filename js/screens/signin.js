/* Sign in.
 *
 * Students: a name, kept on this device. No password, no email — they are
 * often minors, and nothing a student does here needs an account.
 *
 * Teachers: the same, plus the option of a real account. That is not about
 * security; it is because a class used to live on whichever laptop made it.
 * Signing in is always optional, and the name-only path below it never goes
 * away — it is what works offline, on a shared computer, and from a file://
 * page where Firebase cannot run at all.
 */
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

    /* The account block sits above the name form, and only for teachers. */
    if (role === "teacher" && App.Auth.supported()) {
      card.appendChild(accountBlock());
      card.appendChild(U.el("p", "or-line", "— ou reste sur cet appareil —"));
    }

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

    /* ------------------------------------------------------- the account */
    function accountBlock() {
      var box = U.el("div", "auth-block");
      /* Set when a trip to Google came back without completing. Reading it
       * clears it, so it shows once and not on every later visit. */
      var returned = App.Auth.redirectError();
      var form = U.el("form", "auth-form");

      var email = U.el("input", "conj-input");
      email.type = "email";
      email.autocomplete = "email";
      email.placeholder = "ton.adresse@ecole.org";
      email.setAttribute("aria-label", "Adresse e-mail");

      var password = U.el("input", "conj-input");
      password.type = "password";
      password.autocomplete = "current-password";
      password.placeholder = "Mot de passe";
      password.setAttribute("aria-label", "Mot de passe");

      var note = U.el("p", "auth-note");
      function say(text, kind) {
        note.textContent = text || "";
        note.className = "auth-note " + (kind || "");
      }

      var actions = U.el("div", "auth-actions");
      var signIn = U.el("button", "btn btn-primary", "Se connecter");
      signIn.type = "submit";
      var create = U.el("button", "btn btn-ghost", "Créer un compte");
      create.type = "button";
      actions.appendChild(signIn);
      actions.appendChild(create);

      var google = U.el("button", "btn btn-ghost auth-google");
      google.type = "button";
      google.innerHTML = '<span class="auth-g">G</span><span>Continuer avec Google</span>';

      var forgot = U.el("button", "linkish auth-forgot", "Mot de passe oublié ?");
      forgot.type = "button";

      form.appendChild(email);
      form.appendChild(password);
      form.appendChild(actions);
      box.appendChild(U.el("p", "auth-lead",
        "Connecte-toi pour retrouver tes classes sur n'importe quel appareil."));
      box.appendChild(form);
      box.appendChild(google);
      box.appendChild(forgot);
      box.appendChild(note);
      if (returned) { note.textContent = returned; note.className = "auth-note bad"; }

      function busy(on) {
        [signIn, create, google, forgot].forEach(function (b) { b.disabled = on; });
        say(on ? "Un instant…" : "");
      }

      /* One landing place for every route in, so the follow-up — adopting the
       * classes this account already owns — cannot be forgotten on one of
       * them. */
      function landed(res) {
        busy(false);
        if (!res.ok) {
          if (!res.cancelled) say(res.error, "bad");
          return;
        }
        var who = App.Auth.user();
        var name = who.name || (who.email || "").split("@")[0] || "Professeur";
        App.Sound.levelUp();
        say("Connecté. Je récupère tes classes…", "good");
        App.landTeacher(who, name);
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!email.value.trim() || !password.value) {
          say("Entre ton adresse et ton mot de passe.", "bad");
          return;
        }
        busy(true);
        App.Auth.signIn(email.value.trim(), password.value).then(landed);
      });

      create.addEventListener("click", function () {
        if (!email.value.trim() || !password.value) {
          say("Entre une adresse et un mot de passe pour créer le compte.", "bad");
          return;
        }
        busy(true);
        App.Auth.createAccount(email.value.trim(), password.value,
          (input.value || "").trim()).then(landed);
      });

      google.addEventListener("click", function () {
        busy(true);
        /* Said before it starts, not after: signInWithRedirect never resolves,
         * because the browser has already left by then. */
        if (App.Auth.willRedirect()) say("Redirection vers Google…");
        App.Auth.signInWithGoogle().then(function (res) {
          /* Leaving is neither a success nor a failure yet. Keep the buttons
           * locked and say so, rather than flashing an error on the way out. */
          if (res.leaving) { say("Redirection vers Google…"); return; }
          landed(res);
        });
      });

      forgot.addEventListener("click", function () {
        if (!email.value.trim()) { say("Entre ton adresse d'abord.", "bad"); return; }
        busy(true);
        App.Auth.sendReset(email.value.trim()).then(function (res) {
          busy(false);
          say(res.ok
            ? "Regarde tes e-mails : un lien pour changer ton mot de passe est parti."
            : res.error, res.ok ? "good" : "bad");
        });
      });

      return box;
    }

    var back = U.el("button", "linkish", "← Retour");
    back.addEventListener("click", function () { App.Sound.click(); App.Router.go("role"); });

    wrap.appendChild(card);
    wrap.appendChild(back);
    host.appendChild(wrap);
    setTimeout(function () { if (!existing.length) input.focus(); }, 120);
  });
  /**
   * Signs a teacher in locally and pulls down whatever their account owns.
   *
   * Lives out here rather than inside the screen because a Google sign-in that
   * went the redirect route lands on a *fresh page load* — there is no screen
   * left holding a callback, and main.js finishes the job instead.
   */
  App.landTeacher = function (who, fallbackName) {
    if (!who) return Promise.resolve();
    var name = who.name || fallbackName ||
      (who.email || "").split("@")[0] || "Professeur";
    var account = App.Accounts.byAuthUid(who.uid);
    if (!account) {
      account = App.Accounts.create(name, "teacher");
      App.Accounts.link(account.id, who.uid, who.email);
    }
    App.Accounts.signIn(account.id);
    App.State.profile.role = "teacher";
    App.State.save();

    return App.Sync.syncAccount().then(function (res) {
      if (res.found) {
        /* Their own classes carry the level they teach, so asking again is
         * asking a returning teacher to re-answer a question they already
         * answered — on the very screen that is supposed to prove the account
         * remembered them. */
        adoptLevel();
        App.UI.toast(res.found + " classe" + (res.found > 1 ? "s" : "") + " retrouvée" +
          (res.found > 1 ? "s" : "") + ".", "☁️", "good");
      } else if (!res.ok) {
        /* Never land silently on an empty dashboard after a failed fetch: the
         * teacher cannot tell that apart from having no classes, and will
         * build the whole term again. */
        App.UI.toast(res.error || "Tes classes n'ont pas pu être récupérées.",
          res.stale ? "🛠️" : "⚠️");
      }
      App.Router.go(App.State.profile.level ? "teacher" : "level");
    });
  };

  /** Takes the level from a class this teacher already runs. */
  function adoptLevel() {
    if (App.State.profile.level) return;
    var mine = App.School.all().filter(function (k) { return k.owned; });
    if (!mine.length) return;
    App.State.profile.level = mine[0].level || 1;
    App.State.setClass(mine[0].code);
    App.State.save();
  }
})(typeof window !== "undefined" ? window : globalThis);
