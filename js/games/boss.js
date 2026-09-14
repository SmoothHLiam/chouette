/* Le Défi du Boss — the level's boss fires mixed questions on a short fuse.
 * Vocabulary, conjugation and grammar all show up; three hearts, one monster. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U, K = App.GameKit;

  var BOSSES = {
    1: { name: "Le Monstre des Articles", icon: "👹", taunt: "Le ? La ? Tu ne sauras jamais !" },
    2: { name: "Le Dragon du Passé Composé", icon: "🐲", taunt: "Avoir ou être ? Choisis… mal." },
    3: { name: "Le Spectre de l'Imparfait", icon: "👻", taunt: "Je hantais, tu hantais, nous hantions…" },
    4: { name: "La Sorcière du Subjonctif", icon: "🧙", taunt: "Il faut que tu échoues !" },
    5: { name: "Le Gardien de l'Argumentation", icon: "🗿", taunt: "Nuance tes propos… ou disparais." }
  };

  var QUESTION_TIME = 12;

  App.Games.register({
    id: "boss",
    name: "Le Défi du Boss",
    icon: "🐲",
    color: "crimson",
    tagline: "Trois cœurs. Un monstre. Tout ce que tu sais.",
    blurb: "Vocabulaire, conjugaison et grammaire mélangés, chrono par question.",
    minLevel: 1,
    mode: { type: "lives", lives: 3 },
    build: function (api) {
      var boss = BOSSES[api.level] || BOSSES[1];
      var maxHp = 100 + api.level * 20;
      var hp = maxHp;

      var vocab = U.uniqueBy(App.Content.vocabDeck(api.level), function (v) { return v.fr; });
      var verbs = App.Verbs.forLevel(api.level);
      var tenses = App.Verbs.tensesForLevel(api.level);
      var grammar = App.Grammar.deck(api.level);
      var grammarFeed = K.cycler(grammar);
      var verbFeed = K.cycler(verbs);
      var vocabFeed = K.cycler(vocab);

      var wrap = U.el("div", "boss");
      var arena = U.el("div", "boss-arena");
      var sprite = U.el("div", "boss-sprite", boss.icon);
      var nameTag = U.el("div", "boss-name", boss.name);
      var hpBar = U.el("div", "boss-hp");
      var hpFill = U.el("div", "boss-hp-fill");
      var hpText = U.el("span", "boss-hp-text");
      hpBar.appendChild(hpFill);
      hpBar.appendChild(hpText);
      var speech = U.el("div", "boss-speech", boss.taunt);
      var fuse = U.el("div", "boss-fuse");
      var fuseFill = U.el("div", "boss-fuse-fill");
      fuse.appendChild(fuseFill);

      arena.appendChild(nameTag);
      arena.appendChild(sprite);
      arena.appendChild(hpBar);
      arena.appendChild(speech);
      wrap.appendChild(arena);
      wrap.appendChild(fuse);
      var host = U.el("div", "boss-question");
      wrap.appendChild(host);
      api.stage.appendChild(wrap);

      var live = null, timer = null, deadline = 0, over = false;

      function renderHp() {
        var pct = Math.max(hp, 0) / maxHp * 100;
        hpFill.style.width = pct + "%";
        hpFill.classList.toggle("hurt", pct < 35);
        hpText.textContent = Math.max(hp, 0) + " / " + maxHp;
      }

      function startFuse() {
        deadline = Date.now() + QUESTION_TIME * 1000;
        if (timer) clearInterval(timer);
        timer = setInterval(function () {
          var left = (deadline - Date.now()) / 1000;
          fuseFill.style.width = U.clamp(left / QUESTION_TIME, 0, 1) * 100 + "%";
          if (left <= 0) {
            clearInterval(timer);
            timer = null;
            if (live) live.destroy();
            timeout();
          }
        }, 80);
      }

      function stopFuse() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      function bossAttack(message) {
        sprite.classList.remove("attack");
        void sprite.offsetWidth;
        sprite.classList.add("attack");
        speech.textContent = message || boss.taunt;
        App.Sound.hurt();
        App.FX.shake(wrap, true);
      }

      function timeout() {
        if (over) return;
        stopFuse();
        api.wrong({ node: sprite, label: "trop lent !" });
        bossAttack("Trop lent !");
        if (api.lives > 0) setTimeout(next, 900);
      }

      function damage(node) {
        var crit = api.combo >= 4 && Math.random() < 0.35;
        var dealt = 12 + api.combo * 2 + (crit ? 20 : 0);
        hp -= dealt;
        renderHp();
        sprite.classList.remove("hit");
        void sprite.offsetWidth;
        sprite.classList.add("hit");
        App.Sound.hit();
        App.FX.pop(sprite, "-" + dealt + (crit ? " CRITIQUE !" : ""), crit ? "crit" : "good");
        speech.textContent = crit ? "Aïe ! Coup critique !" : "Grrr…";
        if (hp <= 0) {
          over = true;
          stopFuse();
          api.setExtra("bossBeaten", true);
          sprite.classList.add("defeated");
          speech.textContent = "Non… c'est impossible !";
          App.FX.rain(90);
          App.Sound.win();
          setTimeout(function () { api.end(); }, 1600);
          return true;
        }
        return false;
      }

      /* ------------------------------------------------ question factory -- */
      function vocabQuestion() {
        var item = vocabFeed.next();
        var opts = U.shuffle(K.distractors(vocab, item, 3, function (v) { return v.fr; })
          .map(function (v) { return { label: App.Vocab.display(v), correct: false }; })
          .concat([{ label: App.Vocab.display(item), correct: true }]));
        return { tag: "Vocabulaire", prompt: item.en, options: opts, key: item.fr, columns: 2 };
      }

      function verbQuestion() {
        var verb = verbFeed.next();
        var tense = U.pick(tenses);
        var person = U.rand(6);
        var right = App.Verbs.answer(verb, tense.id, person);
        var wrongs = [];
        var guard = 0;
        while (wrongs.length < 3 && guard < 40) {
          guard++;
          var other = Math.random() < 0.5 ? verb : U.pick(verbs);
          var otherTense = Math.random() < 0.5 ? tense : U.pick(tenses);
          var otherPerson = U.rand(6);
          var candidate = App.Verbs.answer(other, otherTense.id, otherPerson);
          if (candidate === right || wrongs.indexOf(candidate) !== -1) continue;
          wrongs.push(candidate);
        }
        var opts = U.shuffle(wrongs.map(function (w) { return { label: w, correct: false }; })
          .concat([{ label: right, correct: true }]));
        return {
          tag: "Conjugaison · " + tense.fr,
          prompt: App.Verbs.promptSubject(verb, person) + " … (" + verb.inf + ")",
          hint: verb.en,
          options: opts,
          key: verb.inf + ":" + tense.id,
          columns: 2
        };
      }

      function grammarQuestion() {
        var g = grammarFeed.next();
        var opts = U.shuffle(g.opts.map(function (o) { return { label: o, correct: o === g.a, note: g.why }; }));
        return { tag: "Grammaire", prompt: g.q, options: opts, key: "gram:" + g.q, columns: 2, why: g.why };
      }

      function next() {
        if (over) return;
        var roll = Math.random();
        var q = roll < 0.34 ? vocabQuestion() : roll < 0.67 ? verbQuestion() : grammarQuestion();
        live = K.mcq(host, {
          tag: q.tag,
          prompt: q.prompt,
          hint: q.hint,
          options: q.options,
          columns: q.columns,
          onAnswer: function (ok, node) {
            stopFuse();
            if (ok) {
              api.correct({ node: node, key: q.key, points: 150 });
              if (damage(node)) return;
            } else {
              api.wrong({ node: node, key: q.key });
              bossAttack(q.why || "Ha ! Encore raté.");
            }
            if (q.why) api.status(q.why);
            if (api.lives > 0 && !over) setTimeout(next, ok ? 620 : 1700);
          }
        });
        startFuse();
      }

      renderHp();
      next();
      return {
        destroy: function () {
          over = true;
          stopFuse();
          if (live) live.destroy();
        }
      };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
