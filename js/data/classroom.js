/* Chouette ! — classes, class codes and assignments.
 *
 * There is no server, so a class has to travel as data. A teacher's class lives
 * in their own browser and is shared as a *code*: a short one for students on
 * the same machine, and a long "invite code" that carries the whole class —
 * name, level and every assignment — so a student can join from any device.
 * Students hand results back the same way, with a progress code.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var KEY = "chouette.school.v1";
  var SHARE_PREFIX = "CHOU1.";
  var PROGRESS_PREFIX = "CHOUP1.";
  /* No 0/O, 1/I/L: these get read aloud and copied off a whiteboard. */
  var ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  var REWARD = { coins: 75, xp: 100 };

  var GOALS = [
    { id: "play", label: "Terminer une partie", needsTarget: false,
      text: function () { return "Termine une partie"; } },
    { id: "correct", label: "Bonnes réponses", needsTarget: true, defaultTarget: 20, unit: "réponses",
      text: function (t) { return t + " bonnes réponses"; } },
    { id: "score", label: "Score à atteindre", needsTarget: true, defaultTarget: 800, unit: "points",
      text: function (t) { return "Marque " + t + " points"; } },
    { id: "accuracy", label: "Précision minimum", needsTarget: true, defaultTarget: 80, unit: "%",
      text: function (t) { return "Au moins " + t + " % de précision"; } },
    { id: "combo", label: "Combo à atteindre", needsTarget: true, defaultTarget: 10, unit: "combo",
      text: function (t) { return "Atteins un combo de " + t; } },
    { id: "boss", label: "Battre le boss", needsTarget: false,
      text: function () { return "Bats le boss"; } }
  ];

  function goalById(id) {
    for (var i = 0; i < GOALS.length; i++) if (GOALS[i].id === id) return GOALS[i];
    return GOALS[0];
  }

  /* ------------------------------------------------------------ storage -- */

  function load() {
    var saved = App.State._read(KEY);
    if (!saved || typeof saved !== "object" || !saved.classes) return { classes: {} };
    return saved;
  }

  function persist(school) {
    App.State._write(KEY, school);
  }

  /* -------------------------------------------------------------- codes -- */

  function randomCode() {
    var out = "";
    for (var i = 0; i < 6; i++) out += ALPHABET.charAt(U.rand(ALPHABET.length));
    return out.slice(0, 3) + "-" + out.slice(3);
  }

  /** Codes are compared without their dash and without case. */
  function normalizeCode(code) {
    return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function pretty(code) {
    var flat = normalizeCode(code);
    return flat.length === 6 ? flat.slice(0, 3) + "-" + flat.slice(3) : flat;
  }

  function uniqueCode(school) {
    for (var i = 0; i < 50; i++) {
      var code = randomCode();
      if (!school.classes[normalizeCode(code)]) return code;
    }
    return randomCode();
  }

  /* --------------------------------------------------- base64 transport -- */

  function encode64(str) {
    if (typeof global.btoa === "function" && typeof global.TextEncoder === "function") {
      var bytes = new global.TextEncoder().encode(str);
      var binary = "";
      for (var i = 0; i < bytes.length; i += 1024) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 1024));
      }
      return global.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    return Buffer.from(str, "utf8").toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decode64(text) {
    var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    if (typeof global.atob === "function" && typeof global.TextDecoder === "function") {
      var binary = global.atob(b64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new global.TextDecoder().decode(bytes);
    }
    return Buffer.from(b64, "base64").toString("utf8");
  }

  /* ------------------------------------------------------------ classes -- */

  function all() {
    var school = load();
    return Object.keys(school.classes).map(function (k) { return school.classes[k]; });
  }

  function get(code) {
    return load().classes[normalizeCode(code)] || null;
  }

  function put(klass) {
    var school = load();
    school.classes[normalizeCode(klass.code)] = klass;
    persist(school);
    return klass;
  }

  function createClass(opts) {
    var school = load();
    var klass = {
      code: uniqueCode(school),
      name: String(opts.name || "Ma classe").trim().slice(0, 40),
      teacher: String(opts.teacher || "").trim().slice(0, 30),
      level: opts.level || 1,
      created: Date.now(),
      owned: true,          // this device created it — the teacher's copy
      assignments: [],
      roster: {}
    };
    school.classes[normalizeCode(klass.code)] = klass;
    persist(school);
    return klass;
  }

  function removeClass(code) {
    var school = load();
    delete school.classes[normalizeCode(code)];
    persist(school);
  }

  /* -------------------------------------------------------- assignments -- */

  function addAssignment(code, data) {
    var klass = get(code);
    if (!klass) return null;
    var assignment = {
      id: "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      gameId: data.gameId,
      goal: goalById(data.goal).id,
      target: Number(data.target) || 0,
      due: data.due || null,
      note: String(data.note || "").slice(0, 120),
      created: Date.now()
    };
    klass.assignments.push(assignment);
    put(klass);
    return assignment;
  }

  function removeAssignment(code, id) {
    var klass = get(code);
    if (!klass) return;
    klass.assignments = klass.assignments.filter(function (a) { return a.id !== id; });
    put(klass);
  }

  /** "Éclair Rapide — 20 bonnes réponses" */
  function describe(assignment) {
    var game = App.Games.get(assignment.gameId);
    var goal = goalById(assignment.goal);
    return (game ? game.name : assignment.gameId) + " — " + goal.text(assignment.target);
  }

  function dueLabel(assignment) {
    if (!assignment.due) return null;
    var days = U.daysBetween(U.today(), assignment.due);
    if (days < 0) return "en retard";
    if (days === 0) return "pour aujourd'hui";
    if (days === 1) return "pour demain";
    return "dans " + days + " jours";
  }

  /** Did this finished game satisfy the assignment? */
  function satisfied(assignment, session) {
    if (assignment.gameId !== "any" && assignment.gameId !== session.gameId) return false;
    switch (assignment.goal) {
      case "play": return session.total > 0;
      case "correct": return session.correct >= assignment.target;
      case "score": return session.score >= assignment.target;
      case "accuracy": return session.total >= 5 && session.accuracy >= assignment.target;
      case "combo": return session.bestCombo >= assignment.target;
      case "boss": return !!session.bossBeaten;
      default: return false;
    }
  }

  function progressKey(code, assignmentId) {
    return normalizeCode(code) + ":" + assignmentId;
  }

  /** Assignments still open for the signed-in student. */
  function openFor(profile) {
    var klass = profile.classCode ? get(profile.classCode) : null;
    if (!klass) return [];
    return klass.assignments.filter(function (a) {
      var done = profile.assignments[progressKey(klass.code, a.id)];
      return !done || !done.done;
    });
  }

  function statusFor(profile) {
    var klass = profile.classCode ? get(profile.classCode) : null;
    if (!klass) return null;
    var done = klass.assignments.filter(function (a) {
      var rec = profile.assignments[progressKey(klass.code, a.id)];
      return rec && rec.done;
    });
    return { klass: klass, total: klass.assignments.length, done: done.length };
  }

  /** Called when a game ends. Marks anything now finished and pays out. */
  function checkSession(profile, session) {
    if (profile.role === "teacher" || !profile.classCode) return [];
    var klass = get(profile.classCode);
    if (!klass) return [];
    var completed = [];
    klass.assignments.forEach(function (a) {
      var key = progressKey(klass.code, a.id);
      if (profile.assignments[key] && profile.assignments[key].done) return;
      if (!satisfied(a, session)) return;
      profile.assignments[key] = { done: true, at: Date.now(), score: session.score };
      completed.push(a);
    });
    if (completed.length) {
      profile.coins += REWARD.coins * completed.length;
      profile.xp += REWARD.xp * completed.length;
    }
    // Mirror into the local roster so a teacher on this device sees it too.
    recordRoster(klass, profile);
    return completed;
  }

  function studentKey(profile) {
    var account = App.Accounts && App.Accounts.active();
    return account ? account.id : "n:" + String(profile.name || "élève").toLowerCase();
  }

  function recordRoster(klass, profile) {
    var key = studentKey(profile);
    var entry = klass.roster[key] || (klass.roster[key] = { name: profile.name || "Élève", done: {}, xp: 0 });
    entry.name = profile.name || entry.name;
    entry.xp = profile.xp;
    entry.lastSeen = Date.now();
    klass.assignments.forEach(function (a) {
      var rec = profile.assignments[progressKey(klass.code, a.id)];
      if (rec && rec.done) entry.done[a.id] = { at: rec.at, score: rec.score };
    });
    put(klass);
  }

  /* ------------------------------------------------------------- invite -- */

  /** The long code a teacher hands out: it carries the whole class. */
  function shareCode(code) {
    var klass = get(code);
    if (!klass) return null;
    return SHARE_PREFIX + encode64(JSON.stringify({
      c: klass.code,
      n: klass.name,
      t: klass.teacher,
      l: klass.level,
      a: klass.assignments.map(function (a) {
        return { i: a.id, g: a.gameId, o: a.goal, t: a.target, d: a.due, m: a.note };
      })
    }));
  }

  /** Accepts either a short class code (local) or a long invite code. */
  function joinByCode(text) {
    var raw = String(text || "").trim();
    if (!raw) return { ok: false, error: "Entre un code de classe." };

    if (raw.indexOf(SHARE_PREFIX) === 0) {
      var imported = importShare(raw);
      return imported.ok
        ? { ok: true, klass: imported.klass }
        : imported;
    }
    var klass = get(raw);
    if (klass) return { ok: true, klass: klass };
    return {
      ok: false,
      error: "Aucune classe avec le code « " + pretty(raw) + " » sur cet appareil. " +
             "Demande à ton professeur le code d'invitation complet."
    };
  }

  function importShare(text) {
    var raw = String(text || "").trim();
    if (raw.indexOf(SHARE_PREFIX) !== 0) return { ok: false, error: "Ce n'est pas un code d'invitation." };
    var data;
    try {
      data = JSON.parse(decode64(raw.slice(SHARE_PREFIX.length)));
    } catch (e) {
      return { ok: false, error: "Code d'invitation illisible — recopie-le en entier." };
    }
    if (!data || !data.c) return { ok: false, error: "Code d'invitation incomplet." };

    var existing = get(data.c);
    var klass = {
      code: data.c,
      name: data.n || "Classe",
      teacher: data.t || "",
      level: data.l || 1,
      created: existing ? existing.created : Date.now(),
      owned: existing ? existing.owned : false,
      assignments: (data.a || []).map(function (a) {
        return { id: a.i, gameId: a.g, goal: a.o, target: a.t, due: a.d, note: a.m, created: Date.now() };
      }),
      roster: existing ? existing.roster : {}
    };
    put(klass);
    return { ok: true, klass: klass };
  }

  /* ----------------------------------------------------------- progress -- */

  /** What a student sends back so the teacher can mark the work off. */
  function progressCode(profile) {
    var klass = profile.classCode ? get(profile.classCode) : null;
    if (!klass) return null;
    var done = {};
    klass.assignments.forEach(function (a) {
      var rec = profile.assignments[progressKey(klass.code, a.id)];
      if (rec && rec.done) done[a.id] = rec.score || 0;
    });
    return PROGRESS_PREFIX + encode64(JSON.stringify({
      c: klass.code, s: profile.name || "Élève", x: profile.xp, d: done
    }));
  }

  function importProgress(text) {
    var raw = String(text || "").trim();
    if (raw.indexOf(PROGRESS_PREFIX) !== 0) return { ok: false, error: "Ce n'est pas un code de résultats." };
    var data;
    try {
      data = JSON.parse(decode64(raw.slice(PROGRESS_PREFIX.length)));
    } catch (e) {
      return { ok: false, error: "Code de résultats illisible." };
    }
    var klass = get(data.c);
    if (!klass) return { ok: false, error: "Ce code vient d'une autre classe." };
    var key = "n:" + String(data.s || "élève").toLowerCase();
    var entry = klass.roster[key] || (klass.roster[key] = { name: data.s, done: {}, xp: 0 });
    entry.name = data.s || entry.name;
    entry.xp = Math.max(entry.xp || 0, data.x || 0);
    entry.lastSeen = Date.now();
    Object.keys(data.d || {}).forEach(function (aid) {
      entry.done[aid] = { at: Date.now(), score: data.d[aid] };
    });
    put(klass);
    return { ok: true, klass: klass, student: entry.name };
  }

  function roster(code) {
    var klass = get(code);
    if (!klass) return [];
    return Object.keys(klass.roster).map(function (k) {
      var entry = klass.roster[k];
      return {
        key: k,
        name: entry.name,
        xp: entry.xp || 0,
        done: Object.keys(entry.done || {}).length,
        lastSeen: entry.lastSeen || 0
      };
    }).sort(function (a, b) { return b.done - a.done || b.xp - a.xp; });
  }

  App.School = {
    GOALS: GOALS,
    REWARD: REWARD,
    goalById: goalById,
    all: all,
    get: get,
    createClass: createClass,
    removeClass: removeClass,
    addAssignment: addAssignment,
    removeAssignment: removeAssignment,
    describe: describe,
    dueLabel: dueLabel,
    satisfied: satisfied,
    openFor: openFor,
    statusFor: statusFor,
    checkSession: checkSession,
    recordRoster: recordRoster,
    shareCode: shareCode,
    joinByCode: joinByCode,
    importShare: importShare,
    progressCode: progressCode,
    importProgress: importProgress,
    roster: roster,
    pretty: pretty,
    normalizeCode: normalizeCode,
    progressKey: progressKey
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.School;
})(typeof window !== "undefined" ? window : globalThis);
