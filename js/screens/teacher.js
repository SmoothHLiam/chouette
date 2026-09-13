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

    var metaNodes = {};          // assignment id -> its live "N élèves" line
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
        go.disabled = true;
        makeClass(name.value.trim() || "Ma classe", p.level || 1, function () {
          App.Sound.win();
          App.FX.rain(60);
          App.Router.go("teacher");
        });
      });
      return box;
    }

    /* Publishes the class first when a server is reachable, so the code it
     * hands back is unique everywhere — not just on this laptop. Without a
     * server it falls back to a local class and the invite codes. */
    function makeClass(name, level, done) {
      function local(note) {
        App.School.createClass({ name: name, teacher: p.name, level: level });
        var made = App.School.all().filter(function (c) { return c.owned && c.name === name; }).pop();
        App.State.setClass(made.code);
        if (note) App.UI.toast(note, "📴");
        done();
      }
      if (!App.Sync.available()) { local(); return; }
      App.UI.toast("Publication de la classe…", "☁️");
      App.Sync.createClass({ name: name, teacher: p.name, level: level, assignments: [] })
        .then(function (res) {
          if (!res.ok) {
            local("Serveur injoignable — classe créée sur cet appareil seulement.");
            return;
          }
          var created = App.School.createClass({
            name: name, teacher: p.name, level: level,
            code: res.class.code, token: res.token, cloud: true
          });
          App.State.setClass(created.code);
          App.UI.toast("Classe en ligne : tes élèves peuvent la rejoindre avec le code.", "☁️", "good");
          done();
        });
    }

    /** Keeps the published copy in step after any change to the assignments. */
    function publish(k) {
      if (!k.cloud) return;
      App.Sync.updateClass(k).then(function (res) {
        if (!res.ok) App.UI.toast("Modification non synchronisée — elle repartira plus tard.", "📴");
      });
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

      var codeBox = U.el("div", "code-box" + (k.cloud ? " live" : ""));
      codeBox.appendChild(U.el("small", null, "Code de la classe"));
      codeBox.appendChild(U.el("strong", "code-value", App.School.pretty(k.code)));
      codeBox.appendChild(U.el("span", "code-state" + (k.cloud ? " on" : ""),
        k.cloud ? "☁️ en ligne — n'importe quel appareil" : "📴 cet appareil seulement"));
      box.appendChild(codeBox);

      var actions = U.el("div", "class-actions");
      actions.appendChild(App.UI.bigButton("Copier le code", {
        icon: "📋",
        onClick: function () { App.UI.copy(App.School.pretty(k.code), "Code copié"); }
      }));
      actions.appendChild(App.UI.bigButton("Code d'invitation", {
        icon: "🔗", variant: "ghost",
        onClick: function () {
          App.UI.copy(App.School.shareCode(k.code), "Code d'invitation copié");
        }
      }));
      actions.appendChild(App.UI.bigButton("Nouvelle classe", {
        icon: "➕", variant: "ghost",
        onClick: function () { newClassModal(); }
      }));
      box.appendChild(actions);

      box.appendChild(U.el("p", "class-hint", k.cloud
        ? "Écris " + App.School.pretty(k.code) + " au tableau : tes élèves le tapent une fois, " +
          "sur n'importe quel appareil, et ils apparaissent ici tout seuls. Le code d'invitation " +
          "reste utile si le réseau tombe."
        : "Cette classe n'est pas publiée : le code court ne marche que sur cet ordinateur. " +
          "Pour les autres appareils, envoie le code d'invitation."));
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
            makeClass(name.value.trim() || "Ma classe", parseInt(level.value, 10), function () {
              close();
              App.Router.go("teacher");
            });
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
        var metaNode = U.el("small", null, assignmentMeta(k.code, a));
        metaNodes[a.id] = { node: metaNode, assignment: a };
        mid.appendChild(metaNode);
        row.appendChild(mid);

        var edit = U.el("button", "icon-btn", "✏️");
        edit.title = "Modifier ce devoir";
        edit.setAttribute("aria-label", "Modifier ce devoir");
        edit.addEventListener("click", function () {
          App.Sound.click();
          assignmentModal(k, a);
        });
        row.appendChild(edit);

        var del = U.el("button", "icon-btn", "🗑");
        del.title = "Supprimer ce devoir";
        del.setAttribute("aria-label", "Supprimer ce devoir");
        del.addEventListener("click", function () {
          App.Sound.click();
          confirmModal({
            title: "Supprimer ce devoir ?",
            body: "« " + App.School.describe(a) + " » disparaîtra de l'écran de tes élèves, " +
                  "y compris de ceux qui l'ont déjà rendu.",
            confirm: "Supprimer",
            onConfirm: function () {
              App.School.removeAssignment(k.code, a.id);
              publish(App.School.get(k.code));
              App.Router.go("teacher");
            }
          });
        });
        row.appendChild(del);
        box.appendChild(row);
      });
      return box;
    }

    function assignmentModal(k, existing) {
      App.UI.modal(function (box, close) {
        box.appendChild(U.el("h3", null, existing ? "Modifier le devoir" : "Nouveau devoir"));

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

        if (existing) {
          gameSel.value = existing.gameId;
          goalSel.value = existing.goal;
          syncTarget();
          if (existing.target) target.value = String(existing.target);
          if (existing.due) due.value = existing.due;
          note.value = existing.note || "";
        }

        [["Jeu", gameSel], ["Objectif", goalSel], ["Valeur", target],
         ["À rendre pour", due], ["Consigne", note]].forEach(function (pair) {
          var field = U.el("label", "field");
          field.appendChild(U.el("span", null, pair[0]));
          field.appendChild(pair[1]);
          box.appendChild(field);
        });

        if (existing) {
          box.appendChild(U.el("p", "class-hint",
            "Les élèves qui l'ont déjà rendu le restent. Pour que tout le monde " +
            "recommence, supprime ce devoir et poses-en un nouveau."));
        }

        var row = U.el("div", "modal-actions");
        row.appendChild(App.UI.bigButton("Annuler", { variant: "ghost", onClick: close }));
        row.appendChild(App.UI.bigButton(existing ? "Enregistrer" : "Créer", {
          onClick: function () {
            var payload = {
              gameId: gameSel.value,
              goal: goalSel.value,
              target: parseInt(target.value, 10) || 0,
              due: due.value || null,
              note: note.value.trim()
            };
            if (existing) App.School.updateAssignment(k.code, existing.id, payload);
            else App.School.addAssignment(k.code, payload);
            publish(App.School.get(k.code));
            App.Sound.coin();
            close();
            App.Router.go("teacher");
          }
        }));
        box.appendChild(row);
      });
    }

    /** A yes/no dialog for anything that destroys something. */
    function confirmModal(opts) {
      App.UI.modal(function (box, close) {
        box.appendChild(U.el("h3", null, opts.title));
        box.appendChild(U.el("p", null, opts.body));
        var row = U.el("div", "modal-actions");
        row.appendChild(App.UI.bigButton("Annuler", { variant: "ghost", onClick: close }));
        row.appendChild(App.UI.bigButton(opts.confirm, {
          variant: "danger",
          onClick: function () { close(); opts.onConfirm(); }
        }));
        box.appendChild(row);
      });
    }

    /* ---------------------------------------------------------- the class */
    function rosterSection(k) {
      var box = U.el("section", "roster-section");
      var list = U.el("div", "roster-list");
      var head = U.el("div", "section-head");
      head.appendChild(U.el("h3", null, "Élèves"));
      if (k.cloud) {
        var refresh = U.el("button", "level-chip", "↻ Actualiser");
        refresh.title = "Les résultats peuvent mettre jusqu'à une minute à arriver.";
        refresh.addEventListener("click", function () {
          App.Sound.click();
          refresh.textContent = "↻ …";
          App.Sync.fetchRoster(k).then(function (res) {
            refresh.textContent = "↻ Actualiser";
            if (!res.ok) { App.UI.toast(res.error || "Serveur injoignable.", "📴"); return; }
            renderRoster(k, list, App.School.mergeCloudRoster(k.code, res.students));
            refreshCounts(k.code);
          });
        });
        head.appendChild(refresh);
      }
      var paste = U.el("button", "level-chip", "📥 Coller des résultats");
      paste.addEventListener("click", function () { App.Sound.click(); pasteModal(); });
      head.appendChild(paste);
      box.appendChild(head);

      box.appendChild(list);
      renderRoster(k, list, App.School.roster(k.code));

      // Then ask the server, so students on other devices show up too.
      if (k.cloud) {
        App.Sync.fetchRoster(k).then(function (res) {
          if (!res.ok) return;
          renderRoster(k, list, App.School.mergeCloudRoster(k.code, res.students));
          refreshCounts(k.code);
        });
      }
      return box;
    }

    /** How many students have finished this one, read from the live record. */
    function doneCount(code, assignmentId) {
      var klass = App.School.get(code);
      if (!klass) return 0;
      return Object.keys(klass.roster).filter(function (key) {
        var entry = klass.roster[key];
        return entry && entry.done && entry.done[assignmentId];
      }).length;
    }

    function assignmentMeta(code, a) {
      var meta = [];
      var due = App.School.dueLabel(a);
      if (due) meta.push("📅 " + due);
      var n = doneCount(code, a.id);
      meta.push("✅ " + n + " élève" + (n > 1 ? "s" : ""));
      if (a.note) meta.push("💬 " + a.note);
      return meta.join("  ·  ");
    }

    /** The roster arrives after the first paint, so the counts catch up. */
    function refreshCounts(code) {
      Object.keys(metaNodes).forEach(function (id) {
        var entry = metaNodes[id];
        entry.node.textContent = assignmentMeta(code, entry.assignment);
      });
    }

    function renderRoster(k, list, students) {
      U.clear(list);
      if (!students.length) {
        list.appendChild(U.el("p", "page-sub", k.cloud
          ? "Personne n'a encore rejoint. Dès qu'un élève entre le code " +
            App.School.pretty(k.code) + ", il apparaît ici."
          : "Personne n'a encore rejoint. Les élèves de cet appareil apparaissent tout seuls ; " +
            "ceux qui jouent ailleurs t'envoient un code de résultats depuis leur profil."));
        return;
      }
      students.forEach(function (student) {
        var row = U.el("div", "record-row");
        row.appendChild(U.el("span", "record-icon", "🙋"));
        var mid = U.el("div", "record-mid");
        mid.appendChild(U.el("strong", null, student.name));
        mid.appendChild(U.el("small", null, student.xp + " XP"));
        row.appendChild(mid);
        var count = U.el("span", "record-best", student.done + " / " + k.assignments.length);
        if (k.assignments.length && student.done >= k.assignments.length) count.classList.add("all-done");
        row.appendChild(count);

        var kick = U.el("button", "icon-btn", "🗑");
        kick.title = "Retirer " + student.name + " de la classe";
        kick.setAttribute("aria-label", "Retirer " + student.name + " de la classe");
        kick.addEventListener("click", function () {
          App.Sound.click();
          confirmModal({
            title: "Retirer " + student.name + " ?",
            body: "Ses résultats disparaîtront de ta liste. Rien n'est effacé sur son " +
                  "appareil : s'il rejoue avec le code de la classe, il réapparaîtra ici.",
            confirm: "Retirer",
            onConfirm: function () {
              App.School.removeStudent(k.code, student.key);
              var after = App.School.roster(k.code);
              renderRoster(k, list, after);
              refreshCounts(k.code);
              if (k.cloud) {
                App.Sync.removeStudent(k, student.key).then(function (res) {
                  if (!res.ok && !res.offline) App.UI.toast(res.error || "Retrait non synchronisé.", "⚠️");
                });
              }
              App.UI.toast(student.name + " a été retiré de la classe.", "👋");
            }
          });
        });
        row.appendChild(kick);
        list.appendChild(row);
      });
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
