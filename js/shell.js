/* Chouette ! — the arcade frame every mini-game runs inside.
 *
 * A game only has to ask a question and call api.correct() / api.wrong().
 * The shell owns the timer, lives, score, combo multiplier, feedback effects,
 * XP maths and the hand-off to the results screen. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var REGISTRY = [];

  App.Games = {
    register: function (def) { REGISTRY.push(def); },
    all: function () { return REGISTRY.slice(); },
    /** Games that show up on the map (the review drill is unlocked elsewhere). */
    playable: function () { return REGISTRY.filter(function (g) { return !g.hidden; }); },
    get: function (id) {
      for (var i = 0; i < REGISTRY.length; i++) if (REGISTRY[i].id === id) return REGISTRY[i];
      return null;
    },
    forLevel: function (level) {
      return App.Games.playable().filter(function (g) { return (g.minLevel || 1) <= level; });
    }
  };

  var active = null;

  function play(root, gameId) {
    var def = App.Games.get(gameId);
    if (!def) { App.Router.go("home"); return; }
    var level = App.State.profile.level || 1;

    U.clear(root);
    var wrap = U.el("div", "play-wrap theme-" + (def.color || "blue"));

    /* ---------------------------------------------------------- the HUD -- */
    var bar = U.el("div", "play-bar");
    var quit = U.el("button", "icon-btn", "✕");
    quit.title = "Quitter la partie";
    quit.setAttribute("aria-label", "Quitter la partie");
    var title = U.el("div", "play-title");
    title.appendChild(U.el("span", "play-title-icon", def.icon));
    title.appendChild(U.el("span", null, def.name));
    var lifeBox = U.el("div", "play-lives");
    var scoreBox = U.el("div", "play-score");
    scoreBox.innerHTML = '<span class="play-score-value">0</span><span class="play-score-label">points</span>';
    bar.appendChild(quit);
    bar.appendChild(title);
    bar.appendChild(lifeBox);
    bar.appendChild(scoreBox);

    var meter = U.el("div", "play-meter");
    var meterFill = U.el("div", "play-meter-fill");
    var meterText = U.el("span", "play-meter-text");
    meter.appendChild(meterFill);
    meter.appendChild(meterText);

    var comboBox = U.el("div", "combo-box");
    var stage = U.el("div", "play-stage");
    var status = U.el("div", "play-status");

    wrap.appendChild(bar);
    wrap.appendChild(meter);
    wrap.appendChild(comboBox);
    wrap.appendChild(status);
    wrap.appendChild(stage);
    root.appendChild(wrap);

    /* -------------------------------------------------------- the state -- */
    var mode = def.mode || { type: "timer", duration: 70 };
    var state = {
      score: 0, combo: 0, bestCombo: 0, correct: 0, wrong: 0,
      lives: mode.lives || 0, round: 0, rounds: mode.rounds || 0,
      timeLeft: mode.duration || 0, started: Date.now(), over: false, extra: {}
    };

    function renderLives() {
      if (mode.type !== "lives" && !mode.lives) { lifeBox.textContent = ""; return; }
      var s = "";
      for (var i = 0; i < (mode.lives || 0); i++) s += i < state.lives ? "❤️" : "🖤";
      lifeBox.textContent = s;
    }

    function renderScore() {
      scoreBox.querySelector(".play-score-value").textContent = state.score;
    }

    function renderMeter() {
      if (mode.type === "timer") {
        var pct = U.clamp(state.timeLeft / mode.duration, 0, 1) * 100;
        meterFill.style.width = pct + "%";
        meterFill.classList.toggle("low", state.timeLeft <= 10);
        meterText.textContent = Math.ceil(state.timeLeft) + " s";
      } else if (mode.type === "rounds") {
        var p = U.clamp(state.round / mode.rounds, 0, 1) * 100;
        meterFill.style.width = p + "%";
        meterText.textContent = Math.min(state.round + 1, mode.rounds) + " / " + mode.rounds;
      } else {
        meterFill.style.width = "100%";
        meterText.textContent = state.correct + (state.correct === 1 ? " bonne réponse" : " bonnes réponses");
      }
    }

    function renderCombo() {
      if (state.combo < 2) { comboBox.textContent = ""; comboBox.className = "combo-box"; return; }
      comboBox.textContent = "COMBO ×" + state.combo + "  ·  " + multiplier().toFixed(1) + "× points";
      comboBox.className = "combo-box on tier" + Math.min(Math.floor(state.combo / 5), 4);
      comboBox.classList.remove("pulse");
      void comboBox.offsetWidth;
      comboBox.classList.add("pulse");
    }

    function multiplier() {
      return Math.min(1 + Math.floor(state.combo / 5) * 0.5, 4);
    }

    /* ------------------------------------------------------------ timer -- */
    var lastTick = Date.now(), ticker = null, warned = false;
    if (mode.type === "timer") {
      ticker = setInterval(function () {
        var now = Date.now();
        var dt = (now - lastTick) / 1000;
        lastTick = now;
        state.timeLeft -= dt;
        if (state.timeLeft <= 5 && !warned) { warned = true; App.Sound.tick(); }
        if (state.timeLeft <= 0) { state.timeLeft = 0; renderMeter(); finish(); return; }
        renderMeter();
      }, 100);
    }

    /* -------------------------------------------------------------- api -- */
    var api = {
      stage: stage,
      level: level,
      def: def,
      get combo() { return state.combo; },
      get score() { return state.score; },
      get lives() { return state.lives; },
      get timeLeft() { return state.timeLeft; },

      status: function (text) { status.textContent = text || ""; },

      correct: function (opts) {
        opts = opts || {};
        if (state.over) return 0;
        state.combo += 1;
        if (state.combo > state.bestCombo) state.bestCombo = state.combo;
        state.correct += 1;
        var pts = Math.round((opts.points || 100) * multiplier());
        state.score += pts;
        if (opts.key) App.State.recordAnswer(opts.key, true);
        App.Sound.correct(state.combo);
        if (opts.node) {
          App.FX.pop(opts.node, "+" + pts, "good");
          if (state.combo >= 5) App.FX.burstAt(opts.node, 14);
        }
        renderScore(); renderCombo(); renderMeter();
        return pts;
      },

      wrong: function (opts) {
        opts = opts || {};
        if (state.over) return;
        state.combo = 0;
        state.wrong += 1;
        if (opts.key) App.State.recordAnswer(opts.key, false);
        App.Sound.wrong();
        App.FX.shake(wrap);
        App.FX.flash("bad");
        if (opts.node) App.FX.pop(opts.node, opts.label || "✕", "bad");
        renderCombo(); renderMeter();
        if (mode.lives) {
          state.lives -= 1;
          renderLives();
          if (state.lives <= 0) setTimeout(finish, opts.delay || 700);
        }
      },

      /** Games in "rounds" mode call this after each question. */
      tick: function () {
        state.round += 1;
        renderMeter();
        if (mode.type === "rounds" && state.round >= mode.rounds) { finish(); return true; }
        return false;
      },

      addTime: function (seconds) {
        if (mode.type !== "timer") return;
        state.timeLeft = Math.min(state.timeLeft + seconds, mode.duration * 1.5);
        renderMeter();
      },

      damageLife: function () {
        if (!mode.lives) return;
        state.lives -= 1;
        renderLives();
        if (state.lives <= 0) setTimeout(finish, 600);
      },

      setExtra: function (key, value) { state.extra[key] = value; },
      end: function () { finish(); }
    };

    /* ----------------------------------------------------------- finish -- */
    var instance = null;

    function finish() {
      if (state.over) return;
      state.over = true;
      if (ticker) clearInterval(ticker);
      if (instance && instance.destroy) { try { instance.destroy(); } catch (e) { /* ignore */ } }
      App.Speech.stop();
      active = null;

      var total = state.correct + state.wrong;
      var summary = {
        gameId: def.id,
        gameName: def.name,
        gameIcon: def.icon,
        correct: state.correct,
        wrong: state.wrong,
        total: total,
        accuracy: total ? Math.round((state.correct / total) * 100) : 0,
        bestCombo: state.bestCombo,
        score: state.score,
        perfect: total > 0 && state.wrong === 0,
        bossBeaten: !!state.extra.bossBeaten,
        seconds: Math.round((Date.now() - state.started) / 1000)
      };

      // XP: honest work first, flair second.
      var xp = summary.correct * 10 + summary.bestCombo * 2;
      if (summary.perfect && summary.total >= 6) xp += 40;
      if (summary.bossBeaten) xp += 120;
      if (def.xpBonus) xp = Math.round(xp * def.xpBonus);
      summary.xp = xp;
      summary.coins = Math.max(summary.correct ? 5 : 0, Math.round(xp / 5));

      var p = App.State.profile;
      var promoted = App.State.addXP(summary.xp);
      App.State.addCoins(summary.coins);
      p.stats.sessions += 1;
      if (summary.bestCombo > p.stats.bestCombo) p.stats.bestCombo = summary.bestCombo;
      if (summary.bossBeaten) p.stats.bosses += 1;
      App.State.noteGame(def.id, summary.correct, summary.score);
      var streak = App.State.touchStreak();
      App.State.save();

      summary.promoted = promoted;
      summary.streak = streak;
      summary.quests = App.Quests.apply(summary);
      summary.assignments = App.School.checkSession(p, summary);
      summary.badges = App.Achievements.check(summary);
      App.State.save();

      // Tell the teacher's roster, if there is one. Never blocks the results.
      if (p.role === "student" && p.classCode) App.Sync.pushProgress(p);

      App.Router.go("results", summary);
    }

    quit.addEventListener("click", function () {
      if (state.over) return;
      if (state.correct + state.wrong === 0) {
        state.over = true;
        if (ticker) clearInterval(ticker);
        if (instance && instance.destroy) instance.destroy();
        App.Speech.stop();
        App.Router.go("home");
        return;
      }
      finish();
    });

    renderLives(); renderScore(); renderMeter();
    App.Sound.start();
    instance = def.build(api) || {};
    active = { destroy: function () { if (instance.destroy) instance.destroy(); if (ticker) clearInterval(ticker); } };
  }

  App.Shell = {
    play: play,
    teardown: function () {
      if (active && active.destroy) active.destroy();
      active = null;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
