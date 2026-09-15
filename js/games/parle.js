/* Parle Fort ! — the one drill a worksheet cannot set.
 *
 * Speaking is the hardest thing for a French teacher to assign at scale: it
 * needs a listener. The browser has one, free, in fr-FR. It is also the least
 * reliable thing in the app — Firefox has no recogniser at all, Chrome's sends
 * the audio to a server and so needs a network, and even at its best it is
 * guessing. So this game appears only when it can actually work, it is kept out
 * of the homework list entirely, and it is generous on purpose: a recogniser
 * that mishears is not evidence that a student mispronounced.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U, K = App.GameKit;

  App.Games.register({
    id: "parle",
    name: "Parle Fort !",
    icon: "🎤",
    color: "rose",
    tagline: "Dis-le à voix haute.",
    blurb: "Huit mots à prononcer. Le micro écoute et te dit si c'est passé.",
    minLevel: 1,
    /* Needs a microphone and, in most browsers, a network. The home screen
     * hides it when that is not true, and it can never be set as homework:
     * nobody's grade may depend on whether their browser can listen. */
    needs: "mic",
    mode: { type: "rounds", rounds: 8 },
    build: function (api) {
      /* The home screen already hides this game when the browser cannot
       * listen, but a link, a back button or a lost connection can still land
       * someone here. Say why, rather than showing a microphone that does
       * nothing. */
      if (!App.Ear.ready()) {
        var notice = U.el("div", "notice");
        notice.textContent = App.Ear.why() ||
          "L'écoute n'est pas disponible sur cet appareil.";
        api.stage.appendChild(notice);
        api.status("Ferme avec la croix — tes autres jeux marchent normalement.");
        return { destroy: function () {} };
      }

      var words = U.uniqueBy(App.Content.vocabDeck(api.level), function (v) { return v.fr; });
      var feed = K.cycler(words);
      var stopListening = null;
      var current = null;
      var tries = 0;

      var card = U.el("div", "qcard speak-card");
      var tag = U.el("div", "qtag", "Prononce ce mot");
      var prompt = U.el("div", "qprompt");
      var english = U.el("div", "qhint");
      card.appendChild(tag);
      card.appendChild(prompt);
      card.appendChild(english);

      var row = U.el("div", "speak-tools");
      var hear = U.el("button", "speak-hear", "🔊");
      hear.title = "Écouter le mot";
      hear.setAttribute("aria-label", "Écouter le mot");
      hear.addEventListener("click", function () {
        App.Sound.click();
        App.Speech.say(App.Vocab.display(current), { rate: 0.82 });
      });
      row.appendChild(hear);
      card.appendChild(row);

      var mic = U.el("button", "speak-mic");
      var micIcon = U.el("span", "speak-mic-icon", "🎤");
      var micLabel = U.el("span", "speak-mic-label", "Appuie et parle");
      mic.appendChild(micIcon);
      mic.appendChild(micLabel);

      var heard = U.el("div", "speak-heard");
      var pass = U.el("button", "linkish speak-pass", "Je passe →");

      api.stage.appendChild(card);
      api.stage.appendChild(mic);
      api.stage.appendChild(heard);
      api.stage.appendChild(pass);

      mic.addEventListener("click", function () {
        if (stopListening) { stop(); return; }
        App.Sound.click();
        start();
      });
      pass.addEventListener("click", function () {
        App.Sound.click();
        stop();
        api.wrong({ node: card, key: App.Vocab.display(current), label: "passé" });
        reveal(App.Vocab.display(current), "bad");
        next(1400);
      });

      function setListening(on) {
        mic.classList.toggle("listening", on);
        micLabel.textContent = on ? "J'écoute… (appuie pour arrêter)" : "Appuie et parle";
        micIcon.textContent = on ? "🔴" : "🎤";
      }

      function stop() {
        if (stopListening) { stopListening(); stopListening = null; }
        setListening(false);
      }

      function reveal(text, kind) {
        heard.className = "speak-heard " + (kind || "");
        heard.textContent = text;
      }

      function start() {
        var target = App.Vocab.display(current);
        reveal("", "");
        setListening(true);
        stopListening = App.Ear.listen({
          onResult: function (lines) {
            stop();
            var verdict = App.Ear.judge(lines, target);
            if (verdict.ok) {
              api.correct({ node: card, key: target, points: 140 });
              reveal("« " + verdict.heard + " »  ✓", "good");
              next(900);
              return;
            }
            /* One retry on a near miss: the recogniser gets a say, but it does
             * not get the last word on a first attempt. */
            tries += 1;
            if (verdict.near && tries < 2) {
              reveal("Presque ! J'ai entendu « " + verdict.heard + " ». Réessaie.", "near");
              App.Sound.tick();
              return;
            }
            api.wrong({ node: card, key: target });
            reveal("J'ai entendu « " + verdict.heard + " » — on disait " + target + ".", "bad");
            next(1800);
          },
          onError: function (message) {
            stop();
            if (!message) return;                 // we aborted it ourselves
            reveal(message, "bad");
            api.status(message);
          }
        });
      }

      function next(delay) {
        setTimeout(function () {
          if (api.tick()) return;
          ask();
        }, delay);
      }

      function ask() {
        current = feed.next();
        tries = 0;
        prompt.textContent = App.Vocab.display(current);
        english.textContent = current.en;
        reveal("", "");
        api.status("");
      }

      ask();
      return {
        destroy: function () {
          stop();
          App.Speech.stop();
        }
      };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
