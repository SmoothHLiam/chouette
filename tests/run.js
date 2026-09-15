/* Chouette ! — content and conjugation tests.  Run with:  npm test
 * No dependencies: the game's own files are plain scripts that also load
 * happily inside Node. */
"use strict";

require("../js/core.js");
require("../js/data/vocab.js");
require("../js/data/verbs.js");
require("../js/data/sentences.js");
require("../js/data/grammar.js");
require("../js/skin.js");
require("../js/state.js");
require("../js/accounts.js");
require("../js/ear.js");
require("../js/shell.js");
require("../js/games/common.js");
require("../js/games/eclair.js");
require("../js/games/genre.js");
require("../js/games/conjugaison.js");
require("../js/games/accents.js");
require("../js/games/phrase.js");
require("../js/games/ecoute.js");
require("../js/games/memoire.js");
require("../js/games/boss.js");
require("../js/games/parle.js");
require("../js/data/classroom.js");
require("../js/data/lists.js");
require("../js/translate.js");
require("../js/paper.js");
require("../js/export.js");

var App = globalThis.App;
var V = App.Vocab, Verbs = App.Verbs, S = App.Sentences, G = App.Grammar;

var passed = 0;
var failures = [];

function check(name, condition, detail) {
  if (condition) { passed++; return; }
  failures.push(name + (detail ? "  →  " + detail : ""));
}

function eq(name, actual, expected) {
  check(name, actual === expected, "got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected));
}

function verb(inf) {
  var v = Verbs.all.filter(function (x) { return x.inf === inf; })[0];
  if (!v) throw new Error("No such verb in the bank: " + inf);
  return v;
}

/* ------------------------------------------------------- conjugations -- */
/* Every one of these was checked against a standard conjugation table. */
var CONJUGATIONS = [
  ["parler", "present", ["parle", "parles", "parle", "parlons", "parlez", "parlent"]],
  ["manger", "present", ["mange", "manges", "mange", "mangeons", "mangez", "mangent"]],
  ["commencer", "present", ["commence", "commences", "commence", "commençons", "commencez", "commencent"]],
  ["finir", "present", ["finis", "finis", "finit", "finissons", "finissez", "finissent"]],
  ["vendre", "present", ["vends", "vends", "vend", "vendons", "vendez", "vendent"]],
  ["être", "present", ["suis", "es", "est", "sommes", "êtes", "sont"]],
  ["avoir", "present", ["ai", "as", "a", "avons", "avez", "ont"]],
  ["aller", "present", ["vais", "vas", "va", "allons", "allez", "vont"]],
  ["faire", "present", ["fais", "fais", "fait", "faisons", "faites", "font"]],
  ["prendre", "present", ["prends", "prends", "prend", "prenons", "prenez", "prennent"]],

  ["finir", "imparfait", ["finissais", "finissais", "finissait", "finissions", "finissiez", "finissaient"]],
  ["manger", "imparfait", ["mangeais", "mangeais", "mangeait", "mangions", "mangiez", "mangeaient"]],
  ["commencer", "imparfait", ["commençais", "commençais", "commençait", "commencions", "commenciez", "commençaient"]],
  ["être", "imparfait", ["étais", "étais", "était", "étions", "étiez", "étaient"]],
  ["avoir", "imparfait", ["avais", "avais", "avait", "avions", "aviez", "avaient"]],
  ["faire", "imparfait", ["faisais", "faisais", "faisait", "faisions", "faisiez", "faisaient"]],
  ["croire", "imparfait", ["croyais", "croyais", "croyait", "croyions", "croyiez", "croyaient"]],

  ["parler", "futur", ["parlerai", "parleras", "parlera", "parlerons", "parlerez", "parleront"]],
  ["vendre", "futur", ["vendrai", "vendras", "vendra", "vendrons", "vendrez", "vendront"]],
  ["être", "futur", ["serai", "seras", "sera", "serons", "serez", "seront"]],
  ["aller", "futur", ["irai", "iras", "ira", "irons", "irez", "iront"]],
  ["voir", "futur", ["verrai", "verras", "verra", "verrons", "verrez", "verront"]],
  ["acheter", "futur", ["achèterai", "achèteras", "achètera", "achèterons", "achèterez", "achèteront"]],

  ["avoir", "conditionnel", ["aurais", "aurais", "aurait", "aurions", "auriez", "auraient"]],
  ["être", "conditionnel", ["serais", "serais", "serait", "serions", "seriez", "seraient"]],
  ["mourir", "conditionnel", ["mourrais", "mourrais", "mourrait", "mourrions", "mourriez", "mourraient"]],

  ["être", "subjonctif", ["sois", "sois", "soit", "soyons", "soyez", "soient"]],
  ["avoir", "subjonctif", ["aie", "aies", "ait", "ayons", "ayez", "aient"]],
  ["faire", "subjonctif", ["fasse", "fasses", "fasse", "fassions", "fassiez", "fassent"]],
  ["aller", "subjonctif", ["aille", "ailles", "aille", "allions", "alliez", "aillent"]],
  ["pouvoir", "subjonctif", ["puisse", "puisses", "puisse", "puissions", "puissiez", "puissent"]],
  ["prendre", "subjonctif", ["prenne", "prennes", "prenne", "prenions", "preniez", "prennent"]],
  ["finir", "subjonctif", ["finisse", "finisses", "finisse", "finissions", "finissiez", "finissent"]],
  ["recevoir", "subjonctif", ["reçoive", "reçoives", "reçoive", "recevions", "receviez", "reçoivent"]],
  ["manger", "subjonctif", ["mange", "manges", "mange", "mangions", "mangiez", "mangent"]],

  ["parler", "passeCompose", ["ai parlé", "as parlé", "a parlé", "avons parlé", "avez parlé", "ont parlé"]],
  ["aller", "passeCompose", ["suis allé", "es allé", "est allé", "sommes allés", "êtes allés", "sont allés"]],
  ["prendre", "passeCompose", ["ai pris", "as pris", "a pris", "avons pris", "avez pris", "ont pris"]],
  ["se lever", "passeCompose", ["suis levé", "es levé", "est levé", "sommes levés", "êtes levés", "sont levés"]],
  ["naître", "passeCompose", ["suis né", "es né", "est né", "sommes nés", "êtes nés", "sont nés"]],

  ["voir", "plusQueParfait", ["avais vu", "avais vu", "avait vu", "avions vu", "aviez vu", "avaient vu"]],
  ["partir", "plusQueParfait", ["étais parti", "étais parti", "était parti", "étions partis", "étiez partis", "étaient partis"]],
  ["faire", "conditionnelPasse", ["aurais fait", "aurais fait", "aurait fait", "aurions fait", "auriez fait", "auraient fait"]],
  ["finir", "futurAnterieur", ["aurai fini", "auras fini", "aura fini", "aurons fini", "aurez fini", "auront fini"]],
  ["écrire", "subjonctifPasse", ["aie écrit", "aies écrit", "ait écrit", "ayons écrit", "ayez écrit", "aient écrit"]]
];

CONJUGATIONS.forEach(function (row) {
  var forms = Verbs.forms(verb(row[0]), row[1]);
  eq(row[0] + " · " + row[1], forms.join(" | "), row[2].join(" | "));
});

/* Full forms: elision, reflexive pronouns and the "que" of the subjunctive. */
eq("elision: j'aime", Verbs.full(verb("aimer"), "present", 0), "j'aime");
eq("elision: j'habite", Verbs.full(verb("habiter"), "present", 0), "j'habite");
eq("no elision: je parle", Verbs.full(verb("parler"), "present", 0), "je parle");
eq("reflexive: je m'amuse", Verbs.full(verb("s'amuser"), "present", 0), "je m'amuse");
eq("reflexive: nous nous levons", Verbs.full(verb("se lever"), "present", 3), "nous nous levons");
eq("reflexive compound", Verbs.full(verb("se lever"), "passeCompose", 3), "nous nous sommes levés");
eq("subjunctive prefix", Verbs.full(verb("avoir"), "subjonctif", 0), "que j'aie");
eq("prompt subject (reflexive)", Verbs.promptSubject(verb("se lever"), 1), "tu te");
eq("prompt subject (plain)", Verbs.promptSubject(verb("parler"), 4), "vous");

/* No verb may produce an empty or undefined form in any tense it can be asked. */
Verbs.all.forEach(function (v) {
  Verbs.tenses.forEach(function (t) {
    var forms;
    try { forms = Verbs.forms(v, t.id); } catch (e) {
      failures.push("threw for " + v.inf + " / " + t.id + ": " + e.message);
      return;
    }
    check(v.inf + " / " + t.id + " has 6 forms", forms.length === 6);
    forms.forEach(function (f, i) {
      check(v.inf + " / " + t.id + " form " + i + " is a non-empty string",
        typeof f === "string" && f.length > 0 && f.indexOf("undefined") === -1, JSON.stringify(f));
      check(v.inf + " / " + t.id + " full form " + i + " renders",
        Verbs.full(v, t.id, i).indexOf("undefined") === -1);
    });
  });
  check(v.inf + " declares a level 1–5", v.lvl >= 1 && v.lvl <= 5);
  check(v.inf + " is regular or has a present table", !!(v.group || v.present));
});

/* ------------------------------------------------------------- vocab -- */
var TYPES = { n: 1, v: 1, a: 1, e: 1 };
var totalWords = 0;

[1, 2, 3, 4, 5].forEach(function (level) {
  var list = V.byLevel[level];
  check("level " + level + " has vocabulary", Array.isArray(list) && list.length >= 40,
    list ? list.length + " entries" : "missing");
  var seen = {};
  list.forEach(function (item) {
    totalWords++;
    var label = "L" + level + " « " + item.fr + " »";
    check(label + " has a French form", typeof item.fr === "string" && item.fr.length > 0);
    check(label + " has an English gloss", typeof item.en === "string" && item.en.length > 0);
    check(label + " has a known type", !!TYPES[item.t], item.t);
    if (item.t === "n") {
      check(label + " (noun) has a gender", item.g === "m" || item.g === "f", String(item.g));
      check(label + " is stored without its article", !/^(le |la |les |l')/i.test(item.fr));
    } else {
      check(label + " (non-noun) has no gender", item.g === null);
    }
    check(label + " is not duplicated in its level", !seen[item.fr]);
    seen[item.fr] = 1;
  });
});

eq("l'eau elides", V.display({ fr: "eau", en: "water", g: "f", t: "n" }), "l'eau");
eq("le livre keeps its article", V.display({ fr: "livre", en: "book", g: "m", t: "n" }), "le livre");
eq("la maison keeps its article", V.display({ fr: "maison", en: "house", g: "f", t: "n" }), "la maison");
eq("verbs are shown bare", V.display({ fr: "parler", en: "to speak", g: null, t: "v" }), "parler");
check("elides() flags vowel-initial nouns", V.elides({ fr: "école", t: "n", g: "f" }) === true);
check("elides() ignores consonants", V.elides({ fr: "livre", t: "n", g: "m" }) === false);

check("deck() weights the current level", V.deck(3).length > V.upTo(3).length);
check("deck({nounsOnly}) only returns nouns",
  V.deck(5, { nounsOnly: true }).every(function (i) { return i.t === "n"; }));
check("upTo(2) includes level 1 and 2 only",
  V.upTo(2).length === V.byLevel[1].length + V.byLevel[2].length);

/* --------------------------------------------------------- sentences -- */
[1, 2, 3, 4, 5].forEach(function (level) {
  var list = S.byLevel[level];
  check("level " + level + " has sentences", list && list.length >= 10, list ? String(list.length) : "missing");
  list.forEach(function (s) {
    var label = "L" + level + " « " + s.fr + " »";
    check(label + " has an English prompt", !!s.en && s.en.length > 3);
    var tokens = S.tokens(s.fr);
    check(label + " splits into at least 3 tiles", tokens.length >= 3, tokens.length + " tiles");
    check(label + " has no empty tile", tokens.every(function (t) { return t.length > 0; }));
    check(label + " ends with punctuation", S.tail(s.fr).length > 0);
    check(label + " rebuilds from its tiles",
      tokens.join(" ") + S.tail(s.fr) === s.fr.replace(/\s+([.?!]+)$/, "$1"));
  });
});
check("wordPool is lower-cased and deduplicated", (function () {
  var pool = S.wordPool(5);
  var seen = {};
  return pool.every(function (w) {
    if (seen[w] || w !== w.toLowerCase()) return false;
    seen[w] = 1;
    return true;
  });
})());

/* ----------------------------------------------------------- grammar -- */
[1, 2, 3, 4, 5].forEach(function (level) {
  var list = G.byLevel[level];
  check("level " + level + " has grammar questions", list && list.length >= 8, list ? String(list.length) : "missing");
  list.forEach(function (q) {
    var label = "L" + level + " « " + q.q + " »";
    check(label + " offers 4 options", q.opts.length === 4, String(q.opts.length));
    check(label + " includes its own answer", q.opts.indexOf(q.a) !== -1, q.a);
    check(label + " has no duplicate option", new Set(q.opts).size === 4);
    check(label + " explains itself", !!q.why && q.why.length > 8);
  });
});

/* ------------------------------------------------------------ ranks --- */
eq("rank at 0 XP", App.rankFor(0).name, "Petit Escargot");
eq("rank at 8500 XP", App.rankFor(8500).name, "Légende Francophone");
check("rank progress stays within 0..1", (function () {
  for (var xp = 0; xp < 12000; xp += 137) {
    var p = App.rankProgress(xp);
    if (p < 0 || p > 1) return false;
  }
  return true;
})());
eq("five class levels are offered", App.LEVELS.length, 5);
eq("the last one is AP", App.LEVELS[4].label, "French 5 (AP French)");

/* ------------------------------------------------------- mot du jour -- */
check("the word of the day is a real entry at that level", (function () {
  var pool = V.upTo(3).map(function (i) { return i.fr; });
  return pool.indexOf(V.wordOfTheDay(3, "2026-09-13").fr) !== -1;
})());
check("the same day and level always give the same word",
  V.wordOfTheDay(2, "2026-09-13").fr === V.wordOfTheDay(2, "2026-09-13").fr);
check("different days give different words over a week", (function () {
  var seen = {};
  ["2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17"].forEach(function (d) {
    seen[V.wordOfTheDay(4, d).fr] = 1;
  });
  return Object.keys(seen).length >= 4;
})());
check("a year of words never falls outside the level", (function () {
  var pool = {};
  V.upTo(5).forEach(function (i) { pool[i.fr] = 1; });
  for (var d = 1; d <= 365; d++) {
    var date = new Date(2026, 0, d);
    var key = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
    var word = V.wordOfTheDay(5, key);
    if (!word || !pool[word.fr]) return false;
  }
  return true;
})());
check("every level produces a word", [1, 2, 3, 4, 5].every(function (l) {
  return !!V.wordOfTheDay(l, "2026-09-13");
}));

/* --------------------------------------------------------- classroom -- */
var School = App.School;

/* Codes have to survive being read aloud and copied off a whiteboard. */
var codes = [];
for (var c = 0; c < 200; c++) codes.push(App.School.pretty(School.createClass({ name: "C" + c, level: 1 }).code));
check("class codes are formatted XXX-XXX", codes.every(function (x) { return /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(x); }),
  codes.slice(0, 3).join(", "));
check("class codes avoid look-alike characters", codes.every(function (x) { return !/[01OIL]/.test(x); }),
  codes.filter(function (x) { return /[01OIL]/.test(x); })[0]);
check("class codes are unique across 200 draws", new Set(codes).size >= 198, String(new Set(codes).size));

eq("codes normalise", School.normalizeCode(" abc-123 "), "ABC123");
eq("codes pretty-print", School.pretty("abc123"), "ABC-123");

var klass = School.createClass({ name: "Français 3 — période 4", teacher: "Mme Dupont", level: 3 });
check("a new class is retrievable by its own code", !!School.get(klass.code));
check("a class is found without its dash", !!School.get(School.normalizeCode(klass.code)));
check("a class is found in lower case", !!School.get(klass.code.toLowerCase()));
eq("a new class starts with no assignments", klass.assignments.length, 0);

var a1 = School.addAssignment(klass.code, { gameId: "eclair", goal: "correct", target: 20, note: "Chapitre 5" });
var a2 = School.addAssignment(klass.code, { gameId: "boss", goal: "boss" });
eq("assignments are stored", School.get(klass.code).assignments.length, 2);
eq("an assignment describes itself", School.describe(a1), "Éclair Rapide — 20 bonnes réponses");
eq("a boss assignment describes itself", School.describe(a2), "Le Défi du Boss — Bats le boss");
var aAny = School.addAssignment(klass.code, { gameId: "any", goal: "correct", target: 30 });
eq("an any-game assignment reads as a sentence", School.describe(aAny),
  "N'importe quel jeu — 30 bonnes réponses");
School.removeAssignment(klass.code, aAny.id);

/* Goal checking: the gate between "played a game" and "did the homework". */
function session(over) {
  var base = { gameId: "eclair", correct: 0, wrong: 0, total: 0, accuracy: 0, score: 0, bestCombo: 0, bossBeaten: false };
  Object.keys(over || {}).forEach(function (k) { base[k] = over[k]; });
  return base;
}
var G = function (goal, target, gameId) {
  return { gameId: gameId || "eclair", goal: goal, target: target };
};
check("correct-count goal met", School.satisfied(G("correct", 20), session({ correct: 20, total: 20 })));
check("correct-count goal not met", !School.satisfied(G("correct", 20), session({ correct: 19, total: 20 })));
check("score goal met", School.satisfied(G("score", 800), session({ score: 900, total: 9 })));
check("score goal not met", !School.satisfied(G("score", 800), session({ score: 799, total: 9 })));
check("accuracy goal met", School.satisfied(G("accuracy", 80), session({ accuracy: 85, total: 10 })));
check("accuracy goal ignores a 2-answer fluke",
  !School.satisfied(G("accuracy", 80), session({ accuracy: 100, total: 2 })));
check("combo goal met", School.satisfied(G("combo", 10), session({ bestCombo: 12, total: 20 })));
check("boss goal needs a dead boss", School.satisfied(G("boss", 0, "boss"), session({ gameId: "boss", bossBeaten: true, total: 9 })));
check("boss goal fails when the boss lives", !School.satisfied(G("boss", 0, "boss"), session({ gameId: "boss", total: 9 })));
check("play goal needs at least one answer", School.satisfied(G("play", 0), session({ total: 1 })));
check("play goal rejects an empty session", !School.satisfied(G("play", 0), session({ total: 0 })));
check("the wrong game never counts",
  !School.satisfied(G("correct", 5, "genre"), session({ gameId: "eclair", correct: 30, total: 30 })));
check('"any game" counts for every game',
  School.satisfied(G("correct", 5, "any"), session({ gameId: "memoire", correct: 9, total: 9 })));

/* The invite code is the only thing that crosses devices — accents included. */
var invite = School.shareCode(klass.code);
check("an invite code is produced", typeof invite === "string" && invite.indexOf("CHOU1.") === 0);
School.removeClass(klass.code);
check("the class is gone after removal", !School.get(klass.code));
var back = School.importShare(invite);
check("the invite code restores the class", back.ok, back.error);
eq("…with its accented name intact", back.klass.name, "Français 3 — période 4");
eq("…with its teacher", back.klass.teacher, "Mme Dupont");
eq("…with its level", back.klass.level, 3);
eq("…with both assignments", back.klass.assignments.length, 2);
eq("…and the same assignment ids", back.klass.assignments[0].id, a1.id);
check("an imported class is not marked as owned", back.klass.owned === false);

var joined = School.joinByCode(klass.code);
check("a student can join with the short code", joined.ok, joined.error);
var joinedLong = School.joinByCode(invite);
check("a student can join with the invite code", joinedLong.ok, joinedLong.error);
check("an unknown code is refused", !School.joinByCode("ZZZ-999").ok);
check("garbage is refused", !School.joinByCode("hello").ok);
check("a truncated invite code is refused politely", !School.importShare("CHOU1.not-base64!!").ok);
check("an empty code is refused", !School.joinByCode("").ok);

/* A finished game marks homework off, pays once, and never pays twice. */
var student = App.State._blank();
student.role = "student";
student.name = "Camille";
student.classCode = klass.code;
var coinsBefore = student.coins;
var winning = session({ gameId: "eclair", correct: 22, total: 24, accuracy: 92, score: 2400 });
var doneNow = School.checkSession(student, winning);
eq("the matching assignment is marked done", doneNow.length, 1);
eq("…and it is the right one", doneNow[0].id, a1.id);
eq("finishing homework pays croissants", student.coins, coinsBefore + School.REWARD.coins);
eq("replaying pays nothing extra", School.checkSession(student, winning).length, 0);
eq("…and the balance is unchanged", student.coins, coinsBefore + School.REWARD.coins);
eq("one of two assignments is done", School.statusFor(student).done, 1);
eq("the other one is still open", School.openFor(student).length, 1);

var bossWin = session({ gameId: "boss", correct: 12, total: 14, accuracy: 86, bossBeaten: true });
eq("the boss assignment closes on a win", School.checkSession(student, bossWin).length, 1);
eq("both assignments are now done", School.statusFor(student).done, 2);
eq("nothing is left open", School.openFor(student).length, 0);

check("a teacher's own play never counts as homework",
  School.checkSession({ role: "teacher", classCode: klass.code, assignments: {}, coins: 0, xp: 0 }, winning).length === 0);
check("a student with no class has no homework",
  School.statusFor({ role: "student", classCode: null, assignments: {} }) === null);

/* Editing an assignment keeps its identity, so finished work stays finished. */
var edited = School.updateAssignment(klass.code, a1.id,
  { gameId: "eclair", goal: "correct", target: 30, note: "Chapitre 6" });
eq("editing keeps the assignment id", edited.id, a1.id);
eq("…and applies the new target", edited.target, 30);
eq("…and the new note", edited.note, "Chapitre 6");
eq("…and it reads back changed", School.describe(School.get(klass.code).assignments[0]),
  "Éclair Rapide — 30 bonnes réponses");
check("…while a student who finished it stays finished",
  student.assignments[School.progressKey(klass.code, a1.id)].done === true);
eq("…so the class still counts it as done", School.statusFor(student).done, 2);
check("editing a missing assignment is a no-op",
  School.updateAssignment(klass.code, "nope", { gameId: "eclair", goal: "play" }) === null);

/* Removing a student clears their row and nobody else's. */
School.mergeCloudRoster(klass.code, [
  { id: "other-student", name: "Léo", xp: 50, done: {}, at: Date.now() }
]);
var before = School.roster(klass.code).length;
check("there are two students to begin with", before === 2, String(before));
check("removing one reports success", School.removeStudent(klass.code, "other-student") === true);
eq("…leaving exactly one", School.roster(klass.code).length, 1);
check("…and it is the other student", School.roster(klass.code)[0].name === "Camille");
check("removing someone already gone is harmless",
  School.removeStudent(klass.code, "other-student") === false);
eq("…and changes nothing", School.roster(klass.code).length, 1);

/* Results travel back to the teacher the same way they came. */
var report = School.progressCode(student);
check("a progress code is produced", typeof report === "string" && report.indexOf("CHOUP1.") === 0);
var merged = School.importProgress(report);
check("the teacher can import it", merged.ok, merged.error);
eq("…under the student's name", merged.student, "Camille");
var sheet = School.roster(klass.code);
check("the roster lists the student", sheet.length >= 1);
eq("…with both assignments ticked", sheet[0].done, 2);
check("a progress code from elsewhere is refused", !School.importProgress("CHOUP1.zzzz").ok);

/* One student must never occupy two rows, whichever road their results take. */
School.recordRoster(School.get(klass.code), student);          // local device
School.importProgress(report);                                 // pasted code
School.mergeCloudRoster(klass.code, [                          // sync service
  { id: student.syncId || App.State.syncId(), name: "Camille", xp: 500, done: { d1: 10 }, at: Date.now() }
]);
var rows = School.roster(klass.code).filter(function (r) { return r.name === "Camille"; });
eq("the same student is one row, not three", rows.length, 1);
check("an invite code is not a progress code", !School.importProgress(invite).ok);

/* ----------------------------------------------- teacher-made lists ---- */
var Lists = App.Lists;

/* The paste box is the feature: whatever a teacher already has must survive. */
var pasted = Lists.parse([
  "le chien = dog",
  "la maison = house",
  "manger = to eat",
  "l'eau (f) = water",
  "les gens = people",
  "une pomme = an apple",
  "le café\tcoffee",              // straight from a spreadsheet
  "la fenêtre ; window",
  "le stylo - pen",
  "",
  "# une remarque ignorée",
  "ligne sans separateur"
].join("\n"), "vocab", false);

eq("every readable line becomes an entry", pasted.items.length, 9);
eq("a line with no separator is reported", pasted.problems.length, 1);
eq("…by line number", pasted.problems[0].line, 12);

function entry(fr) {
  return pasted.items.filter(function (i) { return i.fr === fr; })[0];
}
eq("« le » gives a masculine noun", entry("chien").g, "m");
eq("« la » gives a feminine noun", entry("maison").g, "f");
eq("…and the article is stripped", entry("maison").fr, "maison");
check("a bare verb keeps no gender", entry("manger").g === null);
eq("« l' » hides the gender, so the (f) marker supplies it", entry("eau").g, "f");
check("« les » does not invent a gender", entry("gens").g === null);
eq("« une » gives feminine", entry("pomme").g, "f");
eq("a tab separates", entry("café").en, "coffee");
eq("a semicolon separates", entry("fenêtre").en, "window");
eq("a spaced dash separates", entry("stylo").en, "pen");
check("blank lines are skipped", !entry(""));
check("# comments are skipped", pasted.items.every(function (i) { return i.fr.charAt(0) !== "#"; }));

var reversed = Lists.parse("dog = le chien\nhouse = la maison", "vocab", true);
eq("English-first is understood", reversed.items[0].fr, "chien");
eq("…with the gender still read", reversed.items[0].g, "m");
eq("…and the English kept", reversed.items[0].en, "dog");

var sentenceList = Lists.parse("J'ai un chien. = I have a dog.\nElle est ma sœur. = She is my sister.",
  "sentences", false);
eq("sentences are read whole", sentenceList.items.length, 2);
eq("…keeping punctuation and case", sentenceList.items[0].fr, "J'ai un chien.");
check("…and no article is stripped from a sentence", sentenceList.items[1].fr.indexOf("Elle est") === 0);

/* A list has to be reopenable: text in, text out. */
var roundTrip = { name: "Test", kind: "vocab", items: pasted.items };
var again = Lists.parse(Lists.toText(roundTrip), "vocab", false);
eq("a list survives a round trip through the editor", again.items.length, pasted.items.length);
eq("…genders included", again.items.filter(function (i) { return i.g; }).length,
  pasted.items.filter(function (i) { return i.g; }).length);

/* Which games a list can actually drive. */
var wordList = { name: "Mots", kind: "vocab", items: pasted.items };
var caps = Lists.capabilities(wordList);
eq("nouns are counted", caps.nouns, 7);   // chien, maison, eau, pomme, café, fenêtre, stylo
check("accented words are counted", caps.accented >= 2, String(caps.accented));
check("a word list drives the translation sprint", Lists.supports(wordList, "eclair"));
check("…and the memory grid", Lists.supports(wordList, "memoire"));
check("…and the gender duel, having enough nouns", Lists.supports(wordList, "genre"));
check("…but never the phrase builder", !Lists.supports(wordList, "phrase"));
check("…nor conjugation, which the verb engine drives", !Lists.supports(wordList, "conjugaison"));

var tiny = { name: "Court", kind: "vocab", items: pasted.items.slice(0, 2) };
check("a two-word list drives nothing", Lists.gamesFor(tiny).length === 0);
check("…and says why", /au moins/.test(Lists.whyNot(tiny, "eclair")));

var genderless = { name: "Verbes", kind: "vocab",
  items: [{ fr: "manger", en: "to eat", g: null }, { fr: "boire", en: "to drink", g: null },
          { fr: "parler", en: "to speak", g: null }, { fr: "courir", en: "to run", g: null }] };
check("a list with no nouns cannot drive the gender duel", !Lists.supports(genderless, "genre"));
check("…and explains that it needs le/la", /le\/la/.test(Lists.whyNot(genderless, "genre")));
check("…but still drives the translation sprint", Lists.supports(genderless, "eclair"));

var sentences = { name: "Phrases", kind: "sentences", items: sentenceList.items.concat(sentenceList.items) };
check("a sentence list drives the phrase builder", Lists.supports(sentences, "phrase"));
check("…and listening", Lists.supports(sentences, "ecoute"));
check("…but not the gender duel", !Lists.supports(sentences, "genre"));

/* Custom items must be indistinguishable from the built-in bank downstream. */
var asVocab = Lists.asVocab(wordList);
eq("custom words carry an article like built-in nouns", App.Vocab.display(asVocab[0]), "le chien");
check("…and a genderless entry is shown bare",
  App.Vocab.display(Lists.asVocab(genderless)[0]) === "manger");
check("…and every item has the fields games rely on",
  asVocab.every(function (i) { return i.fr && i.en && i.t && "g" in i; }));

/* Storage on the class, and what happens when a list is deleted. */
var listClass = School.createClass({ name: "Listes", level: 2 });
var saved = Lists.save(listClass.code, { name: "Chapitre 7", kind: "vocab", items: pasted.items });
check("a list is saved to its class", !!saved && !!saved.id);
eq("…and read back", Lists.all(listClass.code).length, 1);
eq("…by id", Lists.get(listClass.code, saved.id).name, "Chapitre 7");

var edited = Lists.save(listClass.code, { id: saved.id, name: "Chapitre 8", kind: "vocab", items: pasted.items });
eq("editing keeps the same id", edited.id, saved.id);
eq("…and does not add a second list", Lists.all(listClass.code).length, 1);
eq("…with the new name", Lists.get(listClass.code, saved.id).name, "Chapitre 8");

var withList = School.addAssignment(listClass.code, { gameId: "eclair", goal: "correct", target: 10, listId: saved.id });
eq("an assignment can point at a list", withList.listId, saved.id);
var plain = School.addAssignment(listClass.code, { gameId: "eclair", goal: "correct", target: 10 });
check("…and an assignment without one still uses the built-in bank", !plain.listId);

check("deleting a list reports success", Lists.remove(listClass.code, saved.id) === true);
eq("…the list is gone", Lists.all(listClass.code).length, 0);
check("…and the assignment falls back rather than breaking",
  !School.get(listClass.code).assignments.filter(function (a) { return a.id === withList.id; })[0].listId);

/* Lists travel with the class, both ways. */
var listInvite = School.shareCode(listClass.code);
Lists.save(listClass.code, { name: "Voyage", kind: "sentences", items: sentenceList.items });
var travelInvite = School.shareCode(listClass.code);
School.removeClass(listClass.code);
var landed = School.importShare(travelInvite);
check("an invite code carries the lists", landed.ok, landed.error);
eq("…with the list intact", Lists.all(landed.klass.code).length, 1);
eq("…its name", Lists.all(landed.klass.code)[0].name, "Voyage");
eq("…and its entries", Lists.all(landed.klass.code)[0].items.length, sentenceList.items.length);
check("…including accented text", /sœur/.test(JSON.stringify(Lists.all(landed.klass.code)[0].items)));
check("an older invite code without lists still works", School.importShare(listInvite).ok);

/* -------------------------------------------- translation lookup ------ */
var T = App.Translate;
eq("an article is stripped before looking up", T.lookup("le chien").en, "dog");
eq("a bare word works too", T.lookup("chien").en, "dog");
eq("case does not matter", T.lookup("Le Chien").en, "dog");
eq("l' is stripped", T.lookup("l'eau").en, "water");
eq("une is stripped", T.lookup("une pomme").en, "apple");
eq("verbs are known", T.lookup("manger").en, "to eat");
eq("…including irregular ones from the engine", T.lookup("soutenir").en, "to support");
eq("a missing accent still matches", T.lookup("la fenetre").en, "window");
check("…and says the match was loose", T.lookup("la fenetre").loose === true);
check("an exact match is not flagged loose", !T.lookup("la fenêtre").loose);
check("an unknown word returns nothing", T.lookup("zzzznotaword") === null);
check("an empty string returns nothing", T.lookup("   ") === null);
check("the source is named", /vocabulaire/.test(T.lookup("chien").from));

var pickClass = School.createClass({ name: "Mot du prof", level: 2 });
Lists.save(pickClass.code, {
  name: "Chapitre 9", kind: "vocab",
  items: [{ fr: "hérisson", en: "hedgehog", g: "m" }, { fr: "blaireau", en: "badger", g: "m" },
          { fr: "chien", en: "a class-specific dog", g: "m" }, { fr: "libellule", en: "dragonfly", g: "f" }]
});
eq("a teacher's own list is searched", T.lookup("le hérisson", pickClass.code).en, "hedgehog");
check("…and named as the source", /Chapitre 9/.test(T.lookup("le hérisson", pickClass.code).from));
eq("the class's own wording wins over the built-in bank",
  T.lookup("chien", pickClass.code).en, "a class-specific dog");
eq("…while the bank still answers without a class", T.lookup("chien").en, "dog");

/* ------------------------------------------------- the pick itself ---- */
check("no pick means nothing to show", School.pickFor(pickClass.code) === null);

var pick = School.setPick(pickClass.code, { fr: "le hérisson", en: "hedgehog", note: "notre mascotte", by: "Mme Dupont" });
check("a pick is stored", !!pick);
eq("…dated today", pick.date, App.U.today());
eq("…and shows today", School.pickFor(pickClass.code).fr, "le hérisson");
eq("…with its translation", School.pickFor(pickClass.code).en, "hedgehog");
eq("…and its note", School.pickFor(pickClass.code).note, "notre mascotte");

School.setPick(pickClass.code, { fr: "d'hier", en: "yesterday", date: "2020-01-01" });
check("yesterday's pick does not show", School.pickFor(pickClass.code) === null);
check("…though it is still on the class record", !!School.get(pickClass.code).pick);

School.setPick(pickClass.code, { fr: "le blaireau", en: "badger" });
check("a new pick replaces the old one", School.pickFor(pickClass.code).fr === "le blaireau");
check("an empty word is refused", School.setPick(pickClass.code, { fr: "   " }) === null);
check("…leaving the previous pick alone", School.pickFor(pickClass.code).fr === "le blaireau");

check("a pick changes the class signature",
  School.signature(School.get(pickClass.code)) !== School.signature({ name: "Mot du prof", level: 2 }));
var sigBefore = School.pickSignature(School.get(pickClass.code));
School.setPick(pickClass.code, { fr: "la libellule", en: "dragonfly" });
check("…and its own signature tracks the word", School.pickSignature(School.get(pickClass.code)) !== sigBefore);

/* It has to reach students the same way everything else does. */
var pickInvite = School.shareCode(pickClass.code);
School.removeClass(pickClass.code);
var pickLanded = School.importShare(pickInvite);
check("an invite code carries the pick", pickLanded.ok, pickLanded.error);
eq("…with the word", School.pickFor(pickLanded.klass.code).fr, "la libellule");
eq("…and the translation", School.pickFor(pickLanded.klass.code).en, "dragonfly");

check("clearing removes it", School.clearPick(pickLanded.klass.code) === true);
check("…so nothing shows", School.pickFor(pickLanded.klass.code) === null);
check("clearing again is harmless", School.clearPick(pickLanded.klass.code) === false);

/* --------------------------------------------------- plural-only nouns -- */
/* "devoirs" is plural in French whatever else it is; printing "le devoirs" on
 * a worksheet teaches the wrong thing. */
var devoirs = V.upTo(1).filter(function (i) { return i.fr === "devoirs"; })[0];
check("the bank knows homework is plural", devoirs && devoirs.pl === true);
eq("…so it takes les", V.withArticle(devoirs), "les devoirs");
eq("…and shows that everywhere", V.display(devoirs), "les devoirs");
check("a singular noun ending in -s is untouched",
  V.withArticle(V.upTo(1).filter(function (i) { return i.fr === "jus"; })[0]) === "le jus");
/* le or la has no right answer for it, so the gender game must never ask. */
var genderDeck = V.deck(5, { nounsOnly: true });
check("the le/la game never asks about a plural",
  genderDeck.every(function (i) { return !i.pl; }));
check("…while still having plenty to ask about", genderDeck.length > 100, String(genderDeck.length));

/* ------------------------------------------------------------ speaking -- */
var Ear = App.Ear;

/* A recogniser hands back a spelling, not a pronunciation, so the judge has to
 * forgive what French spelling hides and nothing more. */
function said(words, target) { return Ear.judge([].concat(words), target); }

check("saying it exactly is right", said("le livre", "le livre").ok);
check("the article is optional — it is not a pronunciation", said("livre", "le livre").ok);
/* The final -s is silent: "le livre" and "le livres" are the same sound. */
check("a silent plural is not a mistake", said("le livres", "le livre").ok);
check("…in either direction", said("le devoir", "les devoirs").ok);
check("an elided article counts", said("l'ordinateur", "ordinateur").ok);
check("a different word is wrong", !said("le chien", "le chat").ok);
check("…and not even close", !said("le chien", "le chat").near);

/* Tolerance scales with the word, because so does the room to mishear one
 * syllable of it. A short word gets none. */
check("a long word forgives one letter", said("la grenouile", "la grenouille").ok);
check("a short word forgives nothing", !said("vent", "vert").ok);
check("…but says it was close", said("vent", "vert").near);

/* The recogniser offers several guesses; any of them may be the right one. */
check("any alternative can be the right one",
  said(["le chat", "le chien", "le livre"], "le livre").ok);
eq("…and it reports which it took", said(["le chien", "le livre"], "le livre").heard, "le livre");

eq("nothing heard is not a pass", said([], "le livre").ok, false);
eq("…nor is silence", said([""], "le livre").ok, false);

check("accents are not a pronunciation test", said("la fenetre", "la fenêtre").ok);
check("punctuation is ignored", said("le livre.", "le livre").ok);
check("case is ignored", said("Le Livre", "le livre").ok);

eq("distance is symmetric", Ear.distance("chat", "chien"), Ear.distance("chien", "chat"));
eq("…and zero for the same word", Ear.distance("chat", "chat"), 0);

/* The gate. Nothing a student is marked on may need a microphone. */
var parle = App.Games.get("parle");
check("the speaking game is registered", !!parle);
eq("…and declares what it needs", parle.needs, "mic");
check("no assignable game needs hardware",
  App.Games.assignable().every(function (g) { return !g.needs; }),
  App.Games.assignable().filter(function (g) { return g.needs; }).map(function (g) { return g.id; }).join(","));
check("…and the speaking game is not among them",
  App.Games.assignable().every(function (g) { return g.id !== "parle"; }));
check("every other game still is",
  App.Games.assignable().length === App.Games.playable().length - 1,
  App.Games.assignable().length + " of " + App.Games.playable().length);

/* Without a recogniser in Node, it must not be offered on the map either. */
check("an unusable game is off the map",
  App.Games.forLevel(5).every(function (g) { return g.id !== "parle"; }));
check("…while everything else is still there", App.Games.forLevel(5).length >= 7,
  String(App.Games.forLevel(5).length));
check("a game that needs nothing is always usable", App.Games.usable(App.Games.get("eclair")));

/* -------------------------------------------------------- offline shell -- */
/* The service worker lists what to cache by hand, and index.html lists what to
 * load. If the two ever drift, the app breaks only for people with no signal —
 * the hardest failure to notice and the one this feature exists to prevent. */
var fs = require("fs");
var pathOf = function (f) { return require("path").join(__dirname, "..", f); };
var indexHtml = fs.readFileSync(pathOf("index.html"), "utf8");
var swSource = fs.readFileSync(pathOf("sw.js"), "utf8");

var referenced = [];
indexHtml.replace(/(?:src|href)="((?:js|css|icons)\/[^"]+)"/g, function (_, file) {
  referenced.push(file);
  return _;
});
check("index.html does reference its files", referenced.length > 20, String(referenced.length));

var cached = {};
swSource.replace(/"\.\/([^"]*)"/g, function (_, file) { cached[file] = true; return _; });

var missing = referenced.filter(function (file) { return !cached[file]; });
check("every file the page loads is in the offline shell",
  missing.length === 0, missing.join(", "));

/* And the other way: a file listed but no longer shipped fails the install
 * step outright, which takes the whole service worker down with it. */
var listed = Object.keys(cached).filter(function (f) { return f && f.indexOf(".") !== -1; });
var gone = listed.filter(function (file) { return !fs.existsSync(pathOf(file)); });
check("every file in the offline shell exists", gone.length === 0, gone.join(", "));

check("the shell caches the page itself", !!cached["index.html"]);
check("…and the manifest", !!cached["manifest.json"]);
check("…and both skins", !!cached["css/base.css"] && !!cached["css/redesign.css"]);

/* A cached roster or homework list would be worse than no answer at all. */
check("the worker never caches the sync API",
  /url\.pathname\.indexOf\("\/api\/"\) === 0\) return;/.test(swSource));

var manifest = JSON.parse(fs.readFileSync(pathOf("manifest.json"), "utf8"));
eq("the manifest can stand alone on a home screen", manifest.display, "standalone");
check("…with an icon Android can crop",
  manifest.icons.some(function (i) { return i.purpose === "maskable"; }));
check("…and every icon file exists",
  manifest.icons.every(function (i) { return fs.existsSync(pathOf(i.src)); }),
  manifest.icons.map(function (i) { return i.src; }).join(", "));
check("…all of them cached for offline",
  manifest.icons.every(function (i) { return cached[i.src]; }));
/* Relative, so it works on a custom domain, a workers.dev URL and a
 * subdirectory alike. */
check("the start URL is relative", manifest.start_url.indexOf("./") === 0, manifest.start_url);

/* ------------------------------------------------------ accommodations -- */
var Skin = App.Skin;

/* Extended time has to reach the games, not just the screen. */
eq("normal time is the plain clock", Skin.get("timing"), "normal");
eq("…which is a scale of one", Skin.timeScale(), 1);
Skin.set("timing", "half");
eq("time and a half", Skin.timeScale(), 1.5);
Skin.set("timing", "double");
eq("double time", Skin.timeScale(), 2);
Skin.set("timing", "none");
check("no clock at all", Skin.timeScale() === Infinity);
Skin.set("timing", "nonsense");
check("a value from nowhere is ignored", Skin.timeScale() === Infinity);
Skin.set("timing", "normal");

eq("a readable-text default", Skin.get("font"), "standard");
Skin.set("font", "readable");
eq("…that can be turned on", Skin.get("font"), "readable");
check("…and describes itself", !!Skin.describe("font").blurb);
Skin.set("font", "standard");

/* The registry's mode object is shared by every round ever played; scaling it
 * in place would make the first player's accommodation everybody's. */
var timed = App.Games.all().filter(function (g) { return g.mode && g.mode.type === "timer"; });
check("there are timed games to scale", timed.length > 0);
var before = timed.map(function (g) { return g.mode.duration; });
Skin.set("timing", "double");
check("scaling never touches the registry",
  timed.every(function (g, i) { return g.mode.duration === before[i]; }));
Skin.set("timing", "normal");

/* ----------------------------------------------------------- on paper -- */
var Paper = App.Paper;

/* Flashcards are printed double-sided and flipped on the long edge, so the
 * back of a page is mirrored left-to-right. Get this wrong and every card has
 * the wrong word behind it. */
eq("a card row is mirrored", Paper.mirrorRows([1, 2, 3, 4, 5, 6, 7, 8, 9], 3).join(""), "321654987");
eq("…and a short last row too", Paper.mirrorRows([1, 2, 3, 4], 3).join(""), "3214");
check("mirroring twice is the identity",
  Paper.mirrorRows(Paper.mirrorRows([1, 2, 3, 4, 5, 6], 3), 3).join("") === "123456");

var paperClass = School.createClass({ name: "Fiches", teacher: "Mme B.", level: 2 });
var paperSources = Paper.sources(paperClass);
check("there is something to print", paperSources.length > 0);
check("…the built-in bank is offered", paperSources.some(function (s) { return s.id === "level:1"; }));
check("…only up to the class's own level",
  !paperSources.some(function (s) { return s.id === "level:3"; }));
check("…and the verbs come with conjugations",
  paperSources.some(function (s) { return s.verbs && s.verbs.length; }));
check("every source has pairs with both sides", paperSources.every(function (s) {
  return s.pairs.length && s.pairs.every(function (pair) { return pair.fr && pair.en; });
}));

/* A teacher's own list has to be printable — that is the whole point. */
App.Lists.save(paperClass.code, {
  name: "Unité 3", kind: "vocab",
  items: [{ fr: "le hérisson", en: "hedgehog" }, { fr: "la grenouille", en: "frog" }]
});
var withList = Paper.sources(School.get(paperClass.code));
check("a teacher list is printable",
  withList.some(function (s) { return s.id.indexOf("list:") === 0; }));
check("…and it comes first", withList[0].id.indexOf("list:") === 0);

var quizPairs = [{ fr: "le livre", en: "book" }, { fr: "la porte", en: "door" }];
var quiz = Paper.build({ kind: "quiz", title: "Contrôle", pairs: quizPairs });
check("a quiz numbers its questions", quiz.indexOf("<b>1.</b>") !== -1 && quiz.indexOf("<b>2.</b>") !== -1);
check("…asks in French by default", quiz.indexOf("le livre") !== -1);
check("…leaves a line to write on", quiz.indexOf("paper-blank") !== -1);
check("…and gives no answers away", quiz.indexOf("book") === -1);
check("…nor a corrigé", quiz.indexOf("paper-key") === -1);

var quizKeyed = Paper.build({ kind: "quiz", title: "Contrôle", pairs: quizPairs, answers: true });
check("the corrigé is a second sheet", quizKeyed.indexOf("paper-key") !== -1);
check("…with the answers on it", quizKeyed.indexOf("book") !== -1 && quizKeyed.indexOf("door") !== -1);

var quizEn = Paper.build({ kind: "quiz", pairs: quizPairs, direction: "en-fr", answers: true });
check("the other direction asks in English", quizEn.indexOf(">book<") !== -1);
check("…and expects the article back", quizEn.indexOf("le livre") !== -1);

/* Teacher lists are typed by hand, so the sheet must never execute them. */
var nasty = Paper.build({ kind: "quiz", title: "<script>x</script>", pairs: [{ fr: "a & b", en: "<b>c</b>" }], answers: true });
check("a sheet escapes its title", nasty.indexOf("<script>") === -1);
check("…and the words on it", nasty.indexOf("<b>c</b>") === -1 && nasty.indexOf("&lt;b&gt;c&lt;/b&gt;") !== -1);
check("…keeping the text readable", nasty.indexOf("a &amp; b") !== -1);

var tenCards = [];
for (var ci = 0; ci < 10; ci++) tenCards.push({ fr: "mot" + ci, en: "word" + ci });
var cards = Paper.build({ kind: "cards", pairs: tenCards });
eq("ten cards need two sheets, front and back",
  cards.split("paper-page").length - 1, 4);
check("a card front is French", cards.indexOf("mot0") !== -1);
check("…its back is English", cards.indexOf("word0") !== -1);
/* The second sheet holds one card, so eight cells are blank — on both sides,
 * or the cut lines would not line up. */
eq("a part-full page is padded to the grid", cards.split("is-blank").length - 1, 16);

var studyList = Paper.build({ kind: "list", pairs: tenCards });
eq("a study list puts two pairs on a row", studyList.split("<tr>").length - 1, 1 + 5);
check("…and never leaks a blank line to write on", studyList.indexOf("paper-blank") === -1);

/* The sheet tells a French class what to do, in French. */
eq("the instruction contracts à + le", Paper.atTense("le passé composé"), "au passé composé");
eq("…and elides before a vowel", Paper.atTense("l'imparfait"), "à l'imparfait");
eq("…and copes with a bare name", Paper.atTense("présent"), "au présent");

var etre = Verbs.all.filter(function (v) { return v.inf === "être"; });
var conj = Paper.build({ kind: "verbs", verbs: etre, tense: "present", answers: true });
check("a blank table has a line per person", conj.indexOf("paper-blank-cell") !== -1);
check("…under a properly worded instruction", conj.indexOf("au présent.") !== -1);
check("…and does not print the answers on it",
  conj.slice(0, conj.indexOf("paper-key")).indexOf("sommes") === -1);
check("the corrigé conjugates properly", conj.indexOf("sommes") !== -1 && conj.indexOf("êtes") !== -1);
eq("…for all six persons", conj.split("paper-answer").length - 1, 6);

/* --------------------------------------------------------- gradebook -- */
var Export = App.Export;

eq("a plain cell is left alone", Export.cell("Chloé"), "Chloé");
eq("a comma forces quotes", Export.cell("Dupont, Marie"), '"Dupont, Marie"');
eq("a quote is doubled", Export.cell('say "hi"'), '"say ""hi"""');
eq("a number stays a number", Export.cell(420), "420");
/* A student picks their own name and it travels here from their device; a
 * spreadsheet must read it as text, not run it. */
eq("a formula is defused", Export.cell("=1+1"), "'=1+1");
eq("…and so is a lookalike", Export.cell("@SUM(A1)"), "'@SUM(A1)");
eq("rows join with CRLF", Export.toCsv([["a"], ["b"]]), "a\r\nb");

var gradeClass = School.createClass({ name: "Carnet · période 4", teacher: "M. R.", level: 1 });
var d1 = School.addAssignment(gradeClass.code, { gameId: "eclair", goal: "correct", target: 20 });
var d2 = School.addAssignment(gradeClass.code, { gameId: "genre", goal: "play" });
var live = School.get(gradeClass.code);
live.roster = {
  s1: { name: "Chloé", xp: 300, done: { }, lastSeen: 0 },
  s2: { name: "Ahmed", xp: 120, done: { }, lastSeen: 0 },
  s3: { name: "Zoé", xp: 900, done: { }, lastSeen: 0 }
};
live.roster.s1.done[d1.id] = { at: Date.now(), score: 880 };
live.roster.s1.done[d2.id] = { at: Date.now(), score: 0 };
live.roster.s3.done[d1.id] = { at: Date.now(), score: 400 };
School.put(live);

var book = Export.gradebook(School.get(gradeClass.code));
eq("the gradebook has a row per student", book.length, 4);
eq("…and a column per assignment", book[0].length, 3 + 2 + 1);
check("the header names the work", book[0][3].indexOf("1.") === 0);
eq("the furthest along comes first", book[1][0], "Chloé");
eq("…then the next", book[2][0], "Zoé");
eq("…and whoever has done nothing is last", book[3][0], "Ahmed");
eq("a finished assignment shows its score", book[1][3], 880);
/* Zero is a real score. Only a blank means "not handed in". */
eq("…even when the score is zero", book[1][4], 0);
eq("an unfinished one is blank", book[2][4], "");
eq("the count matches", book[1][2], 2);

var csv = Export.toCsv(book);
check("the accented names survive", csv.indexOf("Chloé") !== -1);
var commaClass = School.get(gradeClass.code);
commaClass.roster.s4 = { name: "Roux, Jean-Luc", xp: 10, done: {}, lastSeen: 0 };
School.put(commaClass);
check("a name with a comma cannot break the columns",
  Export.toCsv(Export.gradebook(commaClass)).indexOf('"Roux, Jean-Luc"') !== -1);

check("the file is named after the class and the day",
  /^chouette-carnet-periode-4-\d{4}-\d{2}-\d{2}\.csv$/.test(Export.filename(School.get(gradeClass.code))),
  Export.filename(School.get(gradeClass.code)));

var emptyClass = School.createClass({ name: "Vide", teacher: "M. R.", level: 1 });
eq("an empty class exports only a header", Export.gradebook(School.get(emptyClass.code)).length, 1);

/* ------------------------------------------------------------ report -- */
console.log("Chouette ! — test suite");
console.log("  " + totalWords + " vocabulary entries · " + Verbs.all.length + " verbs · " +
  Verbs.tenses.length + " tenses");
console.log("  " + passed + " assertions passed" + (failures.length ? "" : " — all green ✔"));

if (failures.length) {
  console.error("\n" + failures.length + " FAILED:");
  failures.slice(0, 40).forEach(function (f) { console.error("  ✘ " + f); });
  if (failures.length > 40) console.error("  … and " + (failures.length - 40) + " more");
  process.exit(1);
}
