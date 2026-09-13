/* Joining a class. Accepts the short code a teacher writes on the board when
 * the class already exists on this device, or the long invite code that
 * carries the whole class from another machine. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("classcode", function (host, params) {
    var p = App.State.profile;
    var wrap = U.el("div", "level-screen");
    var card = U.el("div", "level-card");

    card.appendChild(U.el("h2", "level-question", "Tu as un code de classe ?"));
    card.appendChild(U.el("p", "level-sub",
      "Entre le code que ton professeur t'a donné pour recevoir ses devoirs. " +
      "Tu peux aussi jouer sans classe et l'ajouter plus tard."));

    var form = U.el("form", "signin-form");
    var input = U.el("input", "conj-input code-input");
    input.type = "text";
    input.autocomplete = "off";
    input.autocapitalize = "characters";
    input.spellcheck = false;
    input.placeholder = "ABC-123";
    input.setAttribute("aria-label", "Code de classe");
    var submit = U.el("button", "conj-go", "Rejoindre");
    submit.type = "submit";
    form.appendChild(input);
    form.appendChild(submit);
    card.appendChild(form);

    var note = U.el("p", "join-note", "");
    card.appendChild(note);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var typed = input.value;
      var local = App.School.joinByCode(typed);
      if (local.ok) { arrive(local.klass); return; }

      // Not on this device — ask the sync service before giving up.
      if (App.Sync.available() && !/^CHOU/i.test(typed.trim())) {
        note.className = "join-note";
        note.textContent = "Recherche de la classe…";
        submit.disabled = true;
        App.Sync.fetchClass(typed).then(function (res) {
          submit.disabled = false;
          if (res.ok) { arrive(App.School.adoptCloud(res.class)); return; }
          refuse(res.offline
            ? "Serveur injoignable. Vérifie ta connexion, ou demande le code d'invitation complet."
            : res.error || local.error);
        });
        return;
      }
      refuse(local.error);
    });

    function refuse(message) {
      note.className = "join-note bad";
      note.textContent = message;
      App.Sound.wrong();
      App.FX.shake(card);
    }

    function arrive(klass) {
      App.State.setClass(klass.code);
      App.School.recordRoster(klass, App.State.profile);
      // Appear on the teacher's roster straight away, before playing anything.
      if (klass.cloud) App.Sync.pushProgress(App.State.profile, { force: true });
      App.Sound.win();
      App.FX.rain(50);
      App.UI.toast("Bienvenue dans « " + klass.name + " » !", "🎒", "good");

      if (klass.level && klass.level !== p.level) {
        App.UI.modal(function (box, close) {
          box.appendChild(U.el("h3", null, "Aligner ton niveau ?"));
          box.appendChild(U.el("p", null,
            "Cette classe travaille en " + App.LEVELS[klass.level - 1].label +
            ", et tu es réglé sur " + App.LEVELS[(p.level || 1) - 1].label + "."));
          var row = U.el("div", "modal-actions");
          row.appendChild(App.UI.bigButton("Je garde le mien", {
            variant: "ghost",
            onClick: function () { close(); App.Router.go("home"); }
          }));
          row.appendChild(App.UI.bigButton("Utiliser celui de la classe", {
            onClick: function () {
              App.State.setLevel(klass.level);
              close();
              App.Router.go("home");
            }
          }));
          box.appendChild(row);
        });
        return;
      }
      App.Router.go("home");
    }

    wrap.appendChild(card);

    var skip = U.el("button", "linkish",
      params && params.fromProfile ? "← Retour" : "Jouer sans classe pour l'instant →");
    skip.addEventListener("click", function () {
      App.Sound.click();
      App.Router.go(params && params.fromProfile ? "profile" : "home");
    });
    wrap.appendChild(skip);
    host.appendChild(wrap);
    setTimeout(function () { input.focus(); }, 120);
  });
})(typeof window !== "undefined" ? window : globalThis);
