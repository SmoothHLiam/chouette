/* Écoute Bien — listening practice through the browser's French voice.
 * If the device has no French voice, it quietly becomes a reading drill. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U, K = App.GameKit;

  App.Games.register({
    id: "ecoute",
    name: "Écoute Bien",
    icon: "🎧",
    color: "teal",
    tagline: "Une voix française, quatre réponses.",
    blurb: "Dix écoutes. Rejoue autant que tu veux, mais le temps file.",
    minLevel: 1,
    mode: { type: "rounds", rounds: 10 },
    build: function (api) {
      var hasVoice = App.Speech.supported();
      // Voices load asynchronously, and the player can mute the voice in their
      // profile — so this is re-checked for every question, not just at start.
      function voiced() {
        return App.Speech.ready() && App.State.profile.voice !== false;
      }
      var words = U.uniqueBy(App.Content.vocabDeck(api.level), function (v) { return v.fr; });
      var sentences = App.Content.sentenceDeck(api.level);
      var wordFeed = K.cycler(words);
      var sentenceFeed = K.cycler(sentences);
      var live = null;

      if (!hasVoice) {
        var warn = U.el("div", "notice");
        warn.textContent = "Cet appareil n'a pas de synthèse vocale : le texte s'affiche à la place.";
        api.stage.appendChild(warn);
      }
      // mcq() clears whatever host it is given, so it gets its own box.
      var host = U.el("div", "listen-host");
      api.stage.appendChild(host);

      function playerCard(text) {
        var box = U.el("div", "listen-box");
        var big = U.el("button", "listen-btn", "🔊");
        big.setAttribute("aria-label", "Rejouer l'audio");
        big.addEventListener("click", function () { speak(text); });
        box.appendChild(big);
        box.appendChild(U.el("small", null, voiced()
          ? "Touche pour réécouter"
          : "Pas de voix française ici — lis le texte ci-dessus."));
        return box;
      }

      function speak(text) {
        App.Speech.say(text, { rate: 0.86 });
      }

      function ask() {
        var listKind = App.Content.active() ? App.Content.active().kind : null;
        var sentencesAllowed = listKind !== "vocab";     // a word list has none
        var useSentence = sentencesAllowed && api.level >= 2 &&
          Math.random() < 0.45 && sentences.length > 3;
        var item, spoken, options, tag, hintText;

        if (useSentence) {
          item = sentenceFeed.next();
          spoken = item.fr;
          tag = "Qu'est-ce que tu entends ?";
          hintText = null;
          options = U.shuffle(K.distractors(sentences, item, 3, function (s) { return s.fr; })
            .map(function (s) { return { label: s.en, correct: false }; })
            .concat([{ label: item.en, correct: true }]));
        } else {
          item = wordFeed.next();
          spoken = App.Vocab.display(item);
          tag = "Ce mot veut dire…";
          hintText = null;
          options = U.shuffle(K.distractors(words, item, 3, function (v) { return v.fr; })
            .map(function (v) { return { label: v.en, correct: false }; })
            .concat([{ label: item.en, correct: true }]));
        }

        live = K.mcq(host, {
          tag: tag,
          prompt: voiced() ? "🎧" : spoken,
          hint: hintText,
          extra: playerCard(spoken),
          options: options,
          columns: 1,
          onAnswer: function (ok, node) {
            if (ok) api.correct({ node: node, key: spoken, points: 130 });
            else api.wrong({ node: node, key: spoken });
            api.status(spoken);
            setTimeout(function () {
              if (api.tick()) return;
              ask();
            }, ok ? 700 : 1500);
          }
        });
        speak(spoken);
      }

      ask();
      return {
        destroy: function () {
          App.Speech.stop();
          if (live) live.destroy();
        }
      };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
