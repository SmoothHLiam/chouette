/* Chouette ! — the player's profile: XP, streak, mastery, quests, unlocks.
 * Everything lives in localStorage; if that is unavailable (private windows,
 * some file:// setups) the game still runs, it just forgets between sessions. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;
  var KEY = "chouette.profile.v1";

  var memoryFallback = null;

  function read() {
    try {
      var raw = global.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memoryFallback;
    }
  }

  function write(profile) {
    memoryFallback = profile;
    try {
      global.localStorage.setItem(KEY, JSON.stringify(profile));
    } catch (e) { /* storage blocked — memory only for this session */ }
  }

  function blank() {
    return {
      v: 1,
      level: null,
      xp: 0,
      coins: 0,
      streak: 0,
      bestStreak: 0,
      lastPlayed: null,
      avatar: "🦉",
      theme: "nuit",
      sound: true,
      voice: true,
      stats: { answered: 0, correct: 0, sessions: 0, bestCombo: 0, bosses: 0 },
      games: {},        // id -> { plays, best, correct }
      mastery: {},      // french word -> { r, w, last }
      achievements: {}, // id -> ISO date
      unlocked: { themes: ["nuit"], avatars: ["🦉"] },
      quests: null
    };
  }

  var profile = read() || blank();
  // Guard against half-written or older profiles.
  var fresh = blank();
  Object.keys(fresh).forEach(function (k) {
    if (profile[k] === undefined || profile[k] === null && fresh[k] !== null) {
      if (k !== "level" && k !== "lastPlayed" && k !== "quests") profile[k] = fresh[k];
    }
  });

  var listeners = [];

  function save() {
    write(profile);
    listeners.forEach(function (fn) { fn(profile); });
  }

  /* ----------------------------------------------------------- progress -- */

  function addXP(amount) {
    var before = App.rankIndex(profile.xp);
    profile.xp += amount;
    var after = App.rankIndex(profile.xp);
    return after > before ? App.RANKS[after] : null; // returns the new rank on promotion
  }

  function addCoins(amount) {
    profile.coins += amount;
  }

  /** Called once per finished game: rolls the daily streak forward. */
  function touchStreak() {
    var t = U.today();
    if (profile.lastPlayed === t) return { changed: false, streak: profile.streak };
    var gap = U.daysBetween(profile.lastPlayed, t);
    if (gap === 1) profile.streak += 1;
    else profile.streak = 1;
    profile.lastPlayed = t;
    if (profile.streak > profile.bestStreak) profile.bestStreak = profile.streak;
    return { changed: true, streak: profile.streak };
  }

  /** Streak is "alive" today if they played today or yesterday. */
  function streakAlive() {
    var gap = U.daysBetween(profile.lastPlayed, U.today());
    return gap <= 1;
  }

  /* ------------------------------------------------------------ mastery -- */

  function recordAnswer(key, correct) {
    if (!key) return;
    var m = profile.mastery[key] || (profile.mastery[key] = { r: 0, w: 0, last: 0 });
    if (correct) m.r += 1; else { m.w += 1; m.last = Date.now(); }
    profile.stats.answered += 1;
    if (correct) profile.stats.correct += 1;
  }

  /** Words that keep going wrong, worst first. */
  function weakKeys(limit) {
    var out = [];
    Object.keys(profile.mastery).forEach(function (k) {
      var m = profile.mastery[k];
      if (m.w > 0 && m.w >= m.r) out.push({ key: k, score: m.w * 2 - m.r, last: m.last });
    });
    out.sort(function (a, b) { return b.score - a.score || b.last - a.last; });
    return out.slice(0, limit || 40).map(function (o) { return o.key; });
  }

  function masteryOf(key) {
    return profile.mastery[key] || null;
  }

  /* ------------------------------------------------------------- unlock -- */

  function owns(kind, id) {
    return (profile.unlocked[kind] || []).indexOf(id) !== -1;
  }

  function buy(kind, id, cost) {
    if (owns(kind, id)) return "owned";
    if (profile.coins < cost) return "poor";
    profile.coins -= cost;
    profile.unlocked[kind].push(id);
    save();
    return "ok";
  }

  App.State = {
    get profile() { return profile; },
    save: save,
    onChange: function (fn) { listeners.push(fn); },
    reset: function () {
      profile = blank();
      save();
    },
    setLevel: function (level) {
      profile.level = level;
      save();
    },
    addXP: addXP,
    addCoins: addCoins,
    touchStreak: touchStreak,
    streakAlive: streakAlive,
    recordAnswer: recordAnswer,
    weakKeys: weakKeys,
    masteryOf: masteryOf,
    owns: owns,
    buy: buy,
    noteGame: function (id, correct, score) {
      var g = profile.games[id] || (profile.games[id] = { plays: 0, best: 0, correct: 0 });
      g.plays += 1;
      g.correct += correct;
      if (score > g.best) g.best = score;
      return g;
    },
    gamesPlayed: function () {
      return Object.keys(profile.games).length;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
