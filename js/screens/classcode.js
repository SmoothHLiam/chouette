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

    /* Coming back rather than arriving. Folded away, because most people
     * typing on this screen are joining for the first time. */
    card.appendChild(resumeBlock());

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
      if (klass.cloud) {
        App.Sync.pushProgress(App.State.profile, { force: true, rejoin: true });
      }
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
    /* ------------------------------------------ picking up where you left off */
    function resumeBlock() {
      var box = U.el("div", "resume-block");
      var open = U.el("button", "linkish", "J'ai déjà un code élève");
      open.type = "button";
      box.appendChild(open);

      var panel = U.el("div", "resume-panel");
      panel.hidden = true;

      panel.appendChild(U.el("p", "level-sub",
        "Entre le code de ta classe et le code élève que l'app t'a donné sur " +
        "ton autre appareil. Tu retrouveras ton XP, ta série et tes badges."));

      var classInput = U.el("input", "conj-input code-input");
      classInput.type = "text";
      classInput.autocomplete = "off";
      classInput.autocapitalize = "characters";
      classInput.spellcheck = false;
      classInput.placeholder = "Code de la classe — ABC-123";
      classInput.setAttribute("aria-label", "Code de la classe");

      var passWrap = U.el("div", "code-reveal");
      var passInput = U.el("input", "conj-input code-input");
      /* A password field so phones stop trying to autocorrect it, and so it is
       * not readable over a shoulder in a classroom. The eye is why that is
       * bearable when a typo means "no such student". */
      passInput.type = "password";
      passInput.autocomplete = "off";
      passInput.autocapitalize = "characters";
      passInput.spellcheck = false;
      passInput.placeholder = "Ton code élève";
      passInput.setAttribute("aria-label", "Ton code élève");
      passWrap.appendChild(passInput);
      passWrap.appendChild(App.UI.eyeToggle(function (shown) {
        passInput.type = shown ? "text" : "password";
      }, { showLabel: "Afficher le code", hideLabel: "Masquer le code" }));

      var go = App.UI.bigButton("Retrouver ma progression", { icon: "↩︎", onClick: submitResume });
      var says = U.el("p", "join-note", "");

      panel.appendChild(classInput);
      panel.appendChild(passWrap);
      panel.appendChild(go);
      panel.appendChild(says);
      box.appendChild(panel);

      open.addEventListener("click", function () {
        App.Sound.click();
        panel.hidden = !panel.hidden;
        open.textContent = panel.hidden
          ? "J'ai déjà un code élève" : "← Rejoindre une classe à la place";
        if (!panel.hidden) setTimeout(function () { classInput.focus(); }, 60);
      });

      function say(text, kind) {
        says.textContent = text || "";
        says.className = "join-note " + (kind || "");
      }

      function submitResume() {
        if (!App.Sync.available()) {
          say("Il faut une connexion pour retrouver ta progression.", "bad");
          return;
        }
        if (!classInput.value.trim() || !passInput.value.trim()) {
          say("Entre les deux codes.", "bad");
          return;
        }
        say("Recherche…");
        App.Sync.resumeStudent(classInput.value, passInput.value).then(function (res) {
          if (!res.ok || !res.student) {
            say(res.error || "Aucun élève avec ce code dans cette classe.", "bad");
            return;
          }
          App.School.adoptCloud(res.class);
          App.School.restoreStudent(res.student);
          App.State.setClass(res.class.code);
          App.State.setStudentCode(res.student.pass || passInput.value);
          App.Sound.win();
          App.FX.rain(50);
          App.UI.toast("Te revoilà, " + (res.student.name || "toi") + " !", "🦉", "good");
          App.Router.go("home");
        });
      }

      panel.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submitResume(); }
      });

      return box;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
