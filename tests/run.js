/* Chouette ! — content and conjugation tests.  Run with:  npm test
 * No dependencies: the game's own files are plain scripts that also load
 * happily inside Node. */
"use strict";

require("../js/core.js");
require("../js/data/vocab.js");
require("../js/data/verbs.js");
require("../js/data/sentences.js");
require("../js/data/grammar.js");
require("../js/state.js");
require("../js/accounts.js");
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
require("../js/data/classroom.js");

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
check("an invite code is not a progress code", !School.importProgress(invite).ok);

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
