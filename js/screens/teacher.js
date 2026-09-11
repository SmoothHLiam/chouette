/* Le tableau de bord du professeur : la classe, son code, les devoirs, la
 * progression des élèves. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("teacher", function (host) {
    var p = App.State.profile;
    host.appendChild(App.UI.topBar());

    var wrap = U.el("div", "teacher");
    wrap.appendChild(U.el("h2", "page-title", "🎓 Tableau de bord"));

    var owned = App.School.all().filter(function (k) { return k.owned; });
    var klass = p.classCode ? App.School.get(p.classCode) : null;
    if (!klass || !klass.owned) klass = owned[0] || null;
    if (klass && p.classCode !== klass.code) App.State.setClass(klass.code);

    if (!klass) {
      wrap.appendChild(emptyState());
      host.appendChild(wrap);
      return;
    }

    wrap.appendChild(classCard(klass, owned));
    wrap.appendChild(assignmentsSection(klass));
    wrap.appendChild(rosterSection(klass));

    var preview = U.el("button", "wide-card");
    preview.innerHTML = '<span class="wide-icon">🕹️</span><span class="wide-body">' +
      "<strong>Essayer les jeux</strong><small>Joue toi-même pour voir ce que tes élèves vont rencontrer.</small></span>";
    preview.addEventListener("click", function () { App.Sound.click(); App.Router.go("home"); });
    wrap.appendChild(preview);

    host.appendChild(wrap);

    /* ------------------------------------------------------- no class yet */
    function emptyState() {
      var box = U.el("div", "level-card");
      box.appendChild(U.el("h3", null, "Crée ta première classe"));
      box.appendChild(U.el("p", "level-sub",
        "Tu obtiendras un code à écrire au tableau. Tes élèves l'entrent une fois, " +
        "et tous tes devoirs arrivent chez eux."));
      var form = U.el("form", "class-form");
      var name = U.el("input", "conj-input");
      name.placeholder = "French 3 · période 4";
      name.maxLength = 40;
      name.setAttribute("aria-label", "Nom de la classe");
      var go = U.el("button", "conj-go", "Créer");
      go.type = "submit";
      form.appendChild(name);
      form.appendChild(go);
      box.appendChild(form);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var created = App.School.createClass({
          name: name.value.trim() || "Ma classe",
          teacher: p.name,
          level: p.level || 1
        });
        App.State.setClass(created.code);
        App.Sound.win();
        App.FX.rain(60);
        App.Router.go("teacher");
      });
      return box;
    }

    /* ---------------------------------------------------------- the class */
    function classCard(k, all) {
      var box = U.el("section", "class-card");
      var head = U.el("div", "class-head");
      var title = U.el("div", null);
      title.appendChild(U.el("h3", null, k.name));
      title.appendChild(U.el("small", null,
        App.LEVELS[(k.level || 1) - 1].label + " · " + (k.teacher || p.name)));
      head.appendChild(title);
      if (all.length > 1) {
        var swap = U.el("select", "class-switch");
        all.forEach(function (other) {
          var opt = U.el("option", null, other.name);
          opt.value = other.code;
          if (other.code === k.code) opt.selected = true;
          swap.appendChild(opt);
        });
        swap.addEventListener("change", function () {
          App.State.setClass(swap.value);
          App.Router.go("teacher");
        });
        head.appendChild(swap);
      }
      box.appendChild(head);

      var codeBox = U.el("div", "code-box");
      codeBox.appendChild(U.el("small", null, "Code de la classe"));
      codeBox.appendChild(U.el("strong", "code-value", App.School.pretty(k.code)));
      box.appendChild(codeBox);

      var actions = U.el("div", "class-actions");
      actions.appendChild(App.UI.bigButton("Copier le code d'invitation", {
        icon: "🔗",
        onClick: function () {
          App.UI.copy(App.School.shareCode(k.code), "Code d'invitation copié");
        }
      }));
      actions.appendChild(App.UI.bigButton("Nouvelle classe", {
        icon: "➕", variant: "ghost",
        onClick: function () { newClassModal(); }
      }));
      box.appendChild(actions);

      box.appendChild(U.el("p", "class-hint",
        "Le code court marche pour les élèves qui utilisent cet ordinateur. " +
        "Pour les autres appareils, envoie-leur le code d'invitation copié ci-dessus."));
      return box;
    }

    function newClassModal() {
      App.UI.modal(function (box, close) {
        box.appendChild(U.el("h3", null, "Nouvelle classe"));
        var form = U.el("form", "class-form");
        var name = U.el("input", "conj-input");
        name.placeholder = "French 2 · période 1";
        name.maxLength = 40;
        var level = U.el("select", "level-select");
        App.LEVELS.forEach(function (l) {
          var opt = U.el("option", null, l.label);
          opt.value = String(l.id);
          if (l.id === (p.level || 1)) opt.selected = true;
          level.appendChild(opt);
        });
        form.appendChild(name);
        box.appendChild(form);
        box.appendChild(level);
        var row = U.el("div", "modal-actions");
        row.appendChild(App.UI.bigButton("Annuler", { variant: "ghost", onClick: close }));
        row.appendChild(App.UI.bigButton("Créer", {
          onClick: function () {
            var created = App.School.createClass({
              name: name.value.trim() || "Ma classe",
              teacher: p.name,
              level: parseInt(level.value, 10)
            });
            App.State.setClass(created.code);
            close();
            App.Router.go("teacher");
          }
        }));
        box.appendChild(row);
        setTimeout(function () { name.focus(); }, 100);
      });
    }

    /* ----------------------------------------------------- the assignments */
    function assignmentsSection(k) {
      var box = U.el("section", "assign-section");
      var head = U.el("div", "section-head");
      head.appendChild(U.el("h3", null, "Devoirs"));
      var add = U.el("button", "level-chip", "➕ Nouveau devoir");
      add.addEventListener("click", function () { App.Sound.click(); assignmentModal(k); });
      head.appendChild(add);
      box.appendChild(head);

      if (!k.assignments.length) {
        box.appendChild(U.el("p", "page-sub",
          "Aucun devoir pour l'instant. Choisis un mini-jeu et un objectif — " +
          "le jeu coche le devoir tout seul quand l'élève l'atteint."));
        return box;
      }

      k.assignments.forEach(function (a) {
        var game = App.Games.get(a.gameId);
        var row = U.el("div", "assign-row");
        row.appendChild(U.el("span", "assign-icon", game ? game.icon : "🎯"));
        var mid = U.el("div", "assign-mid");
        mid.appendChild(U.el("strong", null, App.School.describe(a)));
        var meta = [];
        var due = App.School.dueLabel(a);
        if (due) meta.push("📅 " + due);
        var doneCount = App.School.roster(k.code).filter(function (s) {
          var entry = k.roster[s.key];
          return entry && entry.done && entry.done[a.id];
        }).length;
        meta.push("✅ " + doneCount + " élève" + (doneCount > 1 ? "s" : ""));
        if (a.note) meta.push("💬 " + a.note);
        mid.appendChild(U.el("small", null, meta.join("  ·  ")));
        row.appendChild(mid);
        var del = U.el("button", "icon-btn", "🗑");
        del.title = "Supprimer ce devoir";
        del.addEventListener("click", function () {
          App.School.removeAssignment(k.code, a.id);
          App.Sound.click();
          App.Router.go("teacher");
        });
        row.appendChild(del);
        box.appendChild(row);
      });
      return box;
    }

    function assignmentModal(k) {
      App.UI.modal(function (box, close) {
        box.appendChild(U.el("h3", null, "Nouveau devoir"));

        var gameSel = U.el("select", "level-select");
        var anyOpt = U.el("option", null, "N'importe quel jeu");
        anyOpt.value = "any";
        gameSel.appendChild(anyOpt);
        App.Games.playable().forEach(function (g) {
          var opt = U.el("option", null, g.icon + "  " + g.name);
          opt.value = g.id;
          gameSel.appendChild(opt);
        });

        var goalSel = U.el("select", "level-select");
        App.School.GOALS.forEach(function (goal) {
          var opt = U.el("option", null, goal.label);
          opt.value = goal.id;
          goalSel.appendChild(opt);
        });
        goalSel.value = "correct";

        var target = U.el("input", "conj-input");
        target.type = "number";
        target.min = "1";
        target.value = "20";
        target.setAttribute("aria-label", "Objectif chiffré");

        var due = U.el("input", "conj-input");
        due.type = "date";
        due.setAttribute("aria-label", "À rendre pour");

        var note = U.el("input", "conj-input");
        note.placeholder = "Consigne (facultatif)";
        note.maxLength = 120;

        function syncTarget() {
          var goal = App.School.goalById(goalSel.value);
          target.style.display = goal.needsTarget ? "" : "none";
          if (goal.needsTarget && goal.defaultTarget) target.value = String(goal.defaultTarget);
        }
        goalSel.addEventListener("change", syncTarget);
        syncTarget();

        [["Jeu", gameSel], ["Objectif", goalSel], ["Valeur", target],
         ["À rendre pour", due], ["Consigne", note]].forEach(function (pair) {
          var field = U.el("label", "field");
          field.appendChild(U.el("span", null, pair[0]));
          field.appendChild(pair[1]);
          box.appendChild(field);
        });

        var row = U.el("div", "modal-actions");
        row.appendChild(App.UI.bigButton("Annuler", { variant: "ghost", onClick: close }));
        row.appendChild(App.UI.bigButton("Créer", {
          onClick: function () {
            App.School.addAssignment(k.code, {
              gameId: gameSel.value,
              goal: goalSel.value,
              target: parseInt(target.value, 10) || 0,
              due: due.value || null,
              note: note.value.trim()
            });
            App.Sound.coin();
            close();
            App.Router.go("teacher");
          }
        }));
        box.appendChild(row);
      });
    }

    /* ---------------------------------------------------------- the class */
    function rosterSection(k) {
      var box = U.el("section", "roster-section");
      var head = U.el("div", "section-head");
      head.appendChild(U.el("h3", null, "Élèves"));
      var paste = U.el("button", "level-chip", "📥 Coller des résultats");
      paste.addEventListener("click", function () { App.Sound.click(); pasteModal(); });
      head.appendChild(paste);
      box.appendChild(head);

      var list = App.School.roster(k.code);
      if (!list.length) {
        box.appendChild(U.el("p", "page-sub",
          "Personne n'a encore rejoint. Les élèves de cet appareil apparaissent tout seuls ; " +
          "ceux qui jouent ailleurs t'envoient un code de résultats depuis leur profil."));
        return box;
      }

      list.forEach(function (student) {
        var row = U.el("div", "record-row");
        row.appendChild(U.el("span", "record-icon", "🙋"));
        var mid = U.el("div", "record-mid");
        mid.appendChild(U.el("strong", null, student.name));
        mid.appendChild(U.el("small", null, student.xp + " XP"));
        row.appendChild(mid);
        var count = U.el("span", "record-best",
          student.done + " / " + k.assignments.length);
        if (k.assignments.length && student.done >= k.assignments.length) count.classList.add("all-done");
        row.appendChild(count);
        box.appendChild(row);
      });
      return box;
    }

    function pasteModal() {
      App.UI.modal(function (box, close) {
        box.appendChild(U.el("h3", null, "Résultats d'un élève"));
        box.appendChild(U.el("p", null,
          "Colle ici le code de résultats que ton élève t'a envoyé depuis son profil."));
        var input = U.el("textarea", "code-area");
        input.rows = 4;
        input.placeholder = "CHOUP1.…";
        box.appendChild(input);
        var row = U.el("div", "modal-actions");
        row.appendChild(App.UI.bigButton("Annuler", { variant: "ghost", onClick: close }));
        row.appendChild(App.UI.bigButton("Ajouter", {
          onClick: function () {
            var res = App.School.importProgress(input.value);
            if (!res.ok) { App.UI.toast(res.error, "⚠️"); return; }
            App.Sound.coin();
            App.UI.toast("Résultats de " + res.student + " ajoutés.", "✅", "good");
            close();
            App.Router.go("teacher");
          }
        }));
        box.appendChild(row);
        setTimeout(function () { input.focus(); }, 100);
      });
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
