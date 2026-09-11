/* Chouette ! — the signed-in player's profile: XP, streak, mastery, quests,
 * unlocks and assignment progress.
 *
 * Each account keeps its own profile under its own storage key, so a shared
 * classroom computer can hold a whole class without anyone mixing up scores.
 * If localStorage is unavailable (private windows, some file:// setups) the
 * game still runs — it just forgets when the tab closes. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var LEGACY_KEY = "chouette.profile.v1";
  var memory = {};
  var storageKey = LEGACY_KEY;

  function read(key) {
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return memory[key] || null;
    }
  }

  function write(key, value) {
    memory[key] = value;
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage blocked — this session only */ }
  }

  function blank() {
    return {
      v: 2,
      role: "student",
      name: "",
      classCode: null,
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
      voiceURI: null,
      stats: { answered: 0, correct: 0, sessions: 0, bestCombo: 0, bosses: 0 },
      games: {},        // id -> { plays, best, correct }
      mastery: {},      // french word -> { r, w, last }
      achievements: {}, // id -> ISO date
      assignments: {},  // "CODE:assignmentId" -> { done, at, score }
      unlocked: { themes: ["nuit"], avatars: ["🦉"] },
      quests: null
    };
  }

  /** Fills in anything a older or half-written profile is missing. */
  function hydrate(saved) {
    var fresh = blank();
    if (!saved) return fresh;
    Object.keys(fresh).forEach(function (k) {
      if (saved[k] === undefined || saved[k] === null) {
        // These three are meaningful when null — do not overwrite them.
        if (k === "level" || k === "lastPlayed" || k === "quests" ||
            k === "classCode" || k === "voiceURI") {
          if (saved[k] === undefined) saved[k] = fresh[k];
          return;
        }
        saved[k] = fresh[k];
      }
    });
    if (!saved.stats) saved.stats = fresh.stats;
    if (!saved.unlocked) saved.unlocked = fresh.unlocked;
    if (!saved.assignments) saved.assignments = {};
    return saved;
  }

  var profile = hydrate(read(LEGACY_KEY));
  var listeners = [];

  function save() {
    write(storageKey, profile);
    listeners.forEach(function (fn) { fn(profile); });
  }

  /* ----------------------------------------------------------- progress -- */

  function addXP(amount) {
    var before = App.rankIndex(profile.xp);
    profile.xp += amount;
    var after = App.rankIndex(profile.xp);
    return after > before ? App.RANKS[after] : null; // the new rank, on promotion
  }

  function touchStreak() {
    var t = U.today();
    if (profile.lastPlayed === t) return { changed: false, streak: profile.streak };
    var gap = U.daysBetween(profile.lastPlayed, t);
    profile.streak = gap === 1 ? profile.streak + 1 : 1;
    profile.lastPlayed = t;
    if (profile.streak > profile.bestStreak) profile.bestStreak = profile.streak;
    return { changed: true, streak: profile.streak };
  }

  function streakAlive() {
    return U.daysBetween(profile.lastPlayed, U.today()) <= 1;
  }

  /* ------------------------------------------------------------ mastery -- */

  function recordAnswer(key, correct) {
    if (!key) return;
    var m = profile.mastery[key] || (profile.mastery[key] = { r: 0, w: 0, last: 0 });
    if (correct) m.r += 1;
    else { m.w += 1; m.last = Date.now(); }
    profile.stats.answered += 1;
    if (correct) profile.stats.correct += 1;
  }

  function weakKeys(limit) {
    var out = [];
    Object.keys(profile.mastery).forEach(function (k) {
      var m = profile.mastery[k];
      if (m.w > 0 && m.w >= m.r) out.push({ key: k, score: m.w * 2 - m.r, last: m.last });
    });
    out.sort(function (a, b) { return b.score - a.score || b.last - a.last; });
    return out.slice(0, limit || 40).map(function (o) { return o.key; });
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
    get key() { return storageKey; },
    save: save,
    onChange: function (fn) { listeners.push(fn); },

    /** Switches to an account's profile. Called by App.Accounts on sign-in. */
    use: function (account) {
      storageKey = account && account.storageKey ? account.storageKey : LEGACY_KEY;
      profile = hydrate(read(storageKey));
      if (account) {
        profile.name = account.name;
        profile.role = account.role;
      }
      return profile;
    },

    /** Wipes the *current* account's progress, keeping the account itself. */
    reset: function () {
      var keep = { name: profile.name, role: profile.role, classCode: profile.classCode };
      profile = blank();
      profile.name = keep.name;
      profile.role = keep.role;
      profile.classCode = keep.classCode;
      save();
    },

    setLevel: function (level) { profile.level = level; save(); },
    setClass: function (code) { profile.classCode = code || null; save(); },

    addXP: addXP,
    addCoins: function (amount) { profile.coins += amount; },
    touchStreak: touchStreak,
    streakAlive: streakAlive,
    recordAnswer: recordAnswer,
    weakKeys: weakKeys,
    masteryOf: function (key) { return profile.mastery[key] || null; },
    owns: owns,
    buy: buy,

    noteGame: function (id, correct, score) {
      var g = profile.games[id] || (profile.games[id] = { plays: 0, best: 0, correct: 0 });
      g.plays += 1;
      g.correct += correct;
      if (score > g.best) g.best = score;
      return g;
    },
    gamesPlayed: function () { return Object.keys(profile.games).length; },

    /* Raw access, used by the accounts module for migration and clean-up. */
    _read: read,
    _write: write,
    _blank: blank,
    _legacyKey: LEGACY_KEY
  };
})(typeof window !== "undefined" ? window : globalThis);
