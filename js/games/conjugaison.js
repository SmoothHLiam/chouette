/* Conjugaison Rush — type the right form. The tense pool grows with your class
 * level, and a missing accent is treated as "almost", not as a failure. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U, K = App.GameKit;

  App.Games.register({
    id: "conjugaison",
    name: "Conjugaison Rush",
    icon: "🌀",
    color: "purple",
    tagline: "Écris la bonne forme avant le chrono.",
    blurb: "Les temps que ta classe a vus, verbe après verbe. Les accents comptent.",
    minLevel: 1,
    mode: { type: "timer", duration: 90 },
    build: function (api) {
      var verbs = App.Verbs.forLevel(api.level);
      var tenses = App.Verbs.tensesForLevel(api.level);
      var feed = K.cycler(verbs);
      var current = null, currentTense = null, person = 0, locked = false;

      var wrap = U.el("div", "conj");
      var tag = U.el("div", "qtag");
      var line = U.el("div", "conj-line");
      var meaning = U.el("div", "conj-meaning");
      var form = U.el("form", "conj-form");
      var input = U.el("input", "conj-input");
      input.type = "text";
      input.autocomplete = "off";
      input.autocapitalize = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", "Ta réponse");
      var go = U.el("button", "conj-go", "OK");
      go.type = "submit";
      form.appendChild(input);
      form.appendChild(go);
      var feedback = U.el("div", "conj-feedback");
      var skip = U.el("button", "linkish", "Je passe (–1 combo)");

      wrap.appendChild(tag);
      wrap.appendChild(line);
      wrap.appendChild(meaning);
      wrap.appendChild(form);
      wrap.appendChild(K.accentBar(input));
      wrap.appendChild(feedback);
      wrap.appendChild(skip);
      api.stage.appendChild(wrap);

      function ask() {
        locked = false;
        current = feed.next();
        var usable = tenses.filter(function (t) { return t.lvl <= api.level; });
        currentTense = U.pick(usable);
        person = U.rand(6);
        tag.textContent = currentTense.fr + " · " + currentTense.en;
        var subject = App.Verbs.promptSubject(current, person);
        line.innerHTML = '<span class="conj-pron">' + subject + '</span> <span class="conj-blank">?</span> ' +
          '<span class="conj-inf">(' + current.inf + ")</span>";
        meaning.textContent = current.en;
        feedback.textContent = "";
        feedback.className = "conj-feedback";
        input.value = "";
        input.disabled = false;
        input.focus();
      }

      function reveal(kind, message) {
        feedback.className = "conj-feedback " + kind;
        feedback.textContent = message;
      }

      function submit(e) {
        if (e) e.preventDefault();
        if (locked || !current) return;
        var typed = U.normalize(input.value);
        if (!typed) return;
        locked = true;
        input.disabled = true;

        var answer = App.Verbs.answer(current, currentTense.id, person);
        var key = current.inf + ":" + currentTense.id;
        var exact = typed === U.normalize(answer);
        var close = !exact && U.stripAccents(typed) === U.stripAccents(answer);

        if (exact) {
          api.correct({ node: form, key: key, points: 140 });
          reveal("good", "✔ " + App.Verbs.full(current, currentTense.id, person));
          api.addTime(1.5);
        } else if (close) {
          api.correct({ node: form, key: key, points: 70 });
          reveal("close", "Presque ! Les accents comptent : " + answer);
        } else {
          api.wrong({ node: form, key: key });
          reveal("bad", "✘ " + App.Verbs.full(current, currentTense.id, person));
        }
        setTimeout(function () { if (api.timeLeft > 0) ask(); }, exact ? 620 : 1500);
      }

      form.addEventListener("submit", submit);
      skip.addEventListener("click", function () {
        if (locked || !current) return;
        locked = true;
        input.disabled = true;
        api.wrong({ node: form, key: current.inf + ":" + currentTense.id, label: "passé" });
        reveal("bad", App.Verbs.full(current, currentTense.id, person));
        setTimeout(function () { if (api.timeLeft > 0) ask(); }, 1200);
      });

      ask();
      return { destroy: function () { App.Speech.stop(); } };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
