/* Chouette ! — Verb bank + conjugation engine
 *
 * Regular verbs are generated from rules (including the -ger / -cer spelling
 * changes); irregular verbs carry explicit tables. Everything else — imparfait,
 * futur, conditionnel, subjonctif and the four compound tenses — is derived, so
 * a verb only ever needs its present tense, its future stem and its participle.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var PRONOUNS = ["je", "tu", "il", "nous", "vous", "ils"];
  var REFL = ["me", "te", "se", "nous", "vous", "se"];
  var VOWELISH = /^[aeiouâàéèêëîïôûùüyh]/i;

  var END = {
    er: ["e", "es", "e", "ons", "ez", "ent"],
    ir: ["is", "is", "it", "issons", "issez", "issent"],
    re: ["s", "s", "", "ons", "ez", "ent"],
    imparfait: ["ais", "ais", "ait", "ions", "iez", "aient"],
    futur: ["ai", "as", "a", "ons", "ez", "ont"],
    subj: ["e", "es", "e", "ions", "iez", "ent"]
  };

  /* ---------------------------------------------------------------- verbs -- */
  /* group: "er" | "ir" | "re" (regular) — otherwise `present` is required.
   * fut  : future stem (defaults to the infinitive, minus a final "e")
   * pp   : past participle (defaults to the regular one)
   * aux  : "avoir" (default) | "etre"
   * subj : full subjunctive override (rarely needed)
   * refl : reflexive verb (always takes être)                                 */
  var VERBS = [
    // ---- French 1 -------------------------------------------------------
    { inf: "être", en: "to be", lvl: 1, present: ["suis", "es", "est", "sommes", "êtes", "sont"], fut: "ser", pp: "été", impStem: "ét", subj: ["sois", "sois", "soit", "soyons", "soyez", "soient"] },
    { inf: "avoir", en: "to have", lvl: 1, present: ["ai", "as", "a", "avons", "avez", "ont"], fut: "aur", pp: "eu", impStem: "av", subj: ["aie", "aies", "ait", "ayons", "ayez", "aient"] },
    { inf: "aller", en: "to go", lvl: 1, present: ["vais", "vas", "va", "allons", "allez", "vont"], fut: "ir", pp: "allé", aux: "etre", impStem: "all", subj: ["aille", "ailles", "aille", "allions", "alliez", "aillent"] },
    { inf: "faire", en: "to do / make", lvl: 1, present: ["fais", "fais", "fait", "faisons", "faites", "font"], fut: "fer", pp: "fait", subj: ["fasse", "fasses", "fasse", "fassions", "fassiez", "fassent"] },
    { inf: "parler", en: "to speak", lvl: 1, group: "er" },
    { inf: "aimer", en: "to like / love", lvl: 1, group: "er" },
    { inf: "habiter", en: "to live (somewhere)", lvl: 1, group: "er" },
    { inf: "écouter", en: "to listen to", lvl: 1, group: "er" },
    { inf: "regarder", en: "to watch", lvl: 1, group: "er" },
    { inf: "manger", en: "to eat", lvl: 1, group: "er" },
    { inf: "commencer", en: "to begin", lvl: 1, group: "er" },
    { inf: "finir", en: "to finish", lvl: 1, group: "ir" },
    { inf: "choisir", en: "to choose", lvl: 1, group: "ir" },
    { inf: "attendre", en: "to wait for", lvl: 1, group: "re" },
    { inf: "vendre", en: "to sell", lvl: 1, group: "re" },

    // ---- French 2 -------------------------------------------------------
    { inf: "prendre", en: "to take", lvl: 2, present: ["prends", "prends", "prend", "prenons", "prenez", "prennent"], fut: "prendr", pp: "pris" },
    { inf: "venir", en: "to come", lvl: 2, present: ["viens", "viens", "vient", "venons", "venez", "viennent"], fut: "viendr", pp: "venu", aux: "etre" },
    { inf: "partir", en: "to leave", lvl: 2, present: ["pars", "pars", "part", "partons", "partez", "partent"], pp: "parti", aux: "etre" },
    { inf: "sortir", en: "to go out", lvl: 2, present: ["sors", "sors", "sort", "sortons", "sortez", "sortent"], pp: "sorti", aux: "etre" },
    { inf: "dormir", en: "to sleep", lvl: 2, present: ["dors", "dors", "dort", "dormons", "dormez", "dorment"], pp: "dormi" },
    { inf: "mettre", en: "to put (on)", lvl: 2, present: ["mets", "mets", "met", "mettons", "mettez", "mettent"], pp: "mis" },
    { inf: "pouvoir", en: "to be able to", lvl: 2, present: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"], fut: "pourr", pp: "pu", subj: ["puisse", "puisses", "puisse", "puissions", "puissiez", "puissent"] },
    { inf: "vouloir", en: "to want", lvl: 2, present: ["veux", "veux", "veut", "voulons", "voulez", "veulent"], fut: "voudr", pp: "voulu", subj: ["veuille", "veuilles", "veuille", "voulions", "vouliez", "veuillent"] },
    { inf: "devoir", en: "to have to", lvl: 2, present: ["dois", "dois", "doit", "devons", "devez", "doivent"], fut: "devr", pp: "dû" },
    { inf: "savoir", en: "to know (a fact)", lvl: 2, present: ["sais", "sais", "sait", "savons", "savez", "savent"], fut: "saur", pp: "su", subj: ["sache", "saches", "sache", "sachions", "sachiez", "sachent"] },
    { inf: "voir", en: "to see", lvl: 2, present: ["vois", "vois", "voit", "voyons", "voyez", "voient"], fut: "verr", pp: "vu" },
    { inf: "dire", en: "to say", lvl: 2, present: ["dis", "dis", "dit", "disons", "dites", "disent"], pp: "dit" },
    { inf: "lire", en: "to read", lvl: 2, present: ["lis", "lis", "lit", "lisons", "lisez", "lisent"], pp: "lu" },
    { inf: "écrire", en: "to write", lvl: 2, present: ["écris", "écris", "écrit", "écrivons", "écrivez", "écrivent"], pp: "écrit" },
    { inf: "boire", en: "to drink", lvl: 2, present: ["bois", "bois", "boit", "buvons", "buvez", "boivent"], pp: "bu", subj: ["boive", "boives", "boive", "buvions", "buviez", "boivent"] },
    { inf: "se lever", en: "to get up", lvl: 2, refl: true, present: ["lève", "lèves", "lève", "levons", "levez", "lèvent"], fut: "lèver", pp: "levé" },
    { inf: "se coucher", en: "to go to bed", lvl: 2, refl: true, group: "er" },
    { inf: "s'amuser", en: "to have fun", lvl: 2, refl: true, group: "er" },
    { inf: "se réveiller", en: "to wake up", lvl: 2, refl: true, group: "er" },

    // ---- French 3 -------------------------------------------------------
    { inf: "connaître", en: "to know (be familiar with)", lvl: 3, present: ["connais", "connais", "connaît", "connaissons", "connaissez", "connaissent"], pp: "connu" },
    { inf: "croire", en: "to believe", lvl: 3, present: ["crois", "crois", "croit", "croyons", "croyez", "croient"], pp: "cru" },
    { inf: "recevoir", en: "to receive", lvl: 3, present: ["reçois", "reçois", "reçoit", "recevons", "recevez", "reçoivent"], fut: "recevr", pp: "reçu" },
    { inf: "ouvrir", en: "to open", lvl: 3, present: ["ouvre", "ouvres", "ouvre", "ouvrons", "ouvrez", "ouvrent"], pp: "ouvert" },
    { inf: "courir", en: "to run", lvl: 3, present: ["cours", "cours", "court", "courons", "courez", "courent"], fut: "courr", pp: "couru" },
    { inf: "suivre", en: "to follow / to take (a class)", lvl: 3, present: ["suis", "suis", "suit", "suivons", "suivez", "suivent"], pp: "suivi" },
    { inf: "vivre", en: "to live", lvl: 3, present: ["vis", "vis", "vit", "vivons", "vivez", "vivent"], pp: "vécu" },
    { inf: "préférer", en: "to prefer", lvl: 3, present: ["préfère", "préfères", "préfère", "préférons", "préférez", "préfèrent"], fut: "préférer", pp: "préféré" },
    { inf: "acheter", en: "to buy", lvl: 3, present: ["achète", "achètes", "achète", "achetons", "achetez", "achètent"], fut: "achèter", pp: "acheté" },
    { inf: "réussir", en: "to succeed", lvl: 3, group: "ir" },
    { inf: "réfléchir", en: "to think / reflect", lvl: 3, group: "ir" },

    // ---- French 4 -------------------------------------------------------
    { inf: "tenir", en: "to hold", lvl: 4, present: ["tiens", "tiens", "tient", "tenons", "tenez", "tiennent"], fut: "tiendr", pp: "tenu" },
    { inf: "craindre", en: "to fear", lvl: 4, present: ["crains", "crains", "craint", "craignons", "craignez", "craignent"], pp: "craint" },
    { inf: "conduire", en: "to drive", lvl: 4, present: ["conduis", "conduis", "conduit", "conduisons", "conduisez", "conduisent"], pp: "conduit" },
    { inf: "plaire", en: "to please", lvl: 4, present: ["plais", "plais", "plaît", "plaisons", "plaisez", "plaisent"], pp: "plu" },
    { inf: "atteindre", en: "to reach", lvl: 4, present: ["atteins", "atteins", "atteint", "atteignons", "atteignez", "atteignent"], pp: "atteint" },
    { inf: "convaincre", en: "to convince", lvl: 4, present: ["convaincs", "convaincs", "convainc", "convainquons", "convainquez", "convainquent"], pp: "convaincu" },
    { inf: "élire", en: "to elect", lvl: 4, present: ["élis", "élis", "élit", "élisons", "élisez", "élisent"], pp: "élu" },
    { inf: "soutenir", en: "to support", lvl: 4, present: ["soutiens", "soutiens", "soutient", "soutenons", "soutenez", "soutiennent"], fut: "soutiendr", pp: "soutenu" },

    // ---- French 5 (AP) ---------------------------------------------------
    { inf: "naître", en: "to be born", lvl: 5, present: ["nais", "nais", "naît", "naissons", "naissez", "naissent"], pp: "né", aux: "etre" },
    { inf: "mourir", en: "to die", lvl: 5, present: ["meurs", "meurs", "meurt", "mourons", "mourez", "meurent"], fut: "mourr", pp: "mort", aux: "etre" },
    { inf: "valoir", en: "to be worth", lvl: 5, present: ["vaux", "vaux", "vaut", "valons", "valez", "valent"], fut: "vaudr", pp: "valu", subj: ["vaille", "vailles", "vaille", "valions", "valiez", "vaillent"] },
    { inf: "résoudre", en: "to solve", lvl: 5, present: ["résous", "résous", "résout", "résolvons", "résolvez", "résolvent"], pp: "résolu" },
    { inf: "acquérir", en: "to acquire", lvl: 5, present: ["acquiers", "acquiers", "acquiert", "acquérons", "acquérez", "acquièrent"], fut: "acquerr", pp: "acquis" },
    { inf: "s'épanouir", en: "to flourish", lvl: 5, refl: true, group: "ir" },
    { inf: "produire", en: "to produce", lvl: 5, present: ["produis", "produis", "produit", "produisons", "produisez", "produisent"], pp: "produit" }
  ];

  /* ---------------------------------------------------------------- tenses -- */
  var TENSES = [
    { id: "present", fr: "le présent", en: "present", lvl: 1 },
    { id: "passeCompose", fr: "le passé composé", en: "past (has done)", lvl: 2 },
    { id: "imparfait", fr: "l'imparfait", en: "was doing / used to do", lvl: 3 },
    { id: "futur", fr: "le futur simple", en: "will do", lvl: 3 },
    { id: "conditionnel", fr: "le conditionnel", en: "would do", lvl: 4 },
    { id: "subjonctif", fr: "le subjonctif", en: "subjunctive", lvl: 4, prefix: "que " },
    { id: "plusQueParfait", fr: "le plus-que-parfait", en: "had done", lvl: 5 },
    { id: "conditionnelPasse", fr: "le conditionnel passé", en: "would have done", lvl: 5 },
    { id: "futurAnterieur", fr: "le futur antérieur", en: "will have done", lvl: 5 },
    { id: "subjonctifPasse", fr: "le subjonctif passé", en: "past subjunctive", lvl: 5, prefix: "que " }
  ];

  /* ------------------------------------------------------------- machinery -- */
  function bareInf(v) {
    return v.refl ? v.inf.replace(/^(se |s')/, "") : v.inf;
  }

  function stemOf(v) {
    var inf = bareInf(v);
    return inf.slice(0, -2);
  }

  /** -ger keeps its "e" and -cer takes a cedilla before "a" and "o". */
  function softStem(v, ending) {
    var inf = bareInf(v);
    var stem = stemOf(v);
    if (!/^[ao]/.test(ending)) return stem;
    if (/ger$/.test(inf)) return stem + "e";
    if (/cer$/.test(inf)) return stem.slice(0, -1) + "ç";
    return stem;
  }

  function presentForms(v) {
    if (v.present) return v.present.slice();
    var endings = END[v.group];
    return endings.map(function (e) {
      return softStem(v, e) + e;
    });
  }

  function futureStem(v) {
    if (v.fut) return v.fut;
    var inf = bareInf(v);
    return /re$/.test(inf) ? inf.slice(0, -1) : inf;
  }

  function participle(v) {
    if (v.pp) return v.pp;
    var stem = stemOf(v);
    if (v.group === "er") return stem + "é";
    if (v.group === "ir") return stem + "i";
    return stem + "u";
  }

  /* The imparfait stem is always the "nous" form of the present, minus -ons:
   * finissons -> finiss- (finissais), mangeons -> mange- (mangeais). Before the
   * -i endings the -ger "e" and the -cer cedilla drop again: nous mangions. */
  function imparfaitForms(v) {
    var base = v.impStem || presentForms(v)[3].replace(/ons$/, "");
    var inf = bareInf(v);
    return END.imparfait.map(function (e) {
      var stem = base;
      if (/^i/.test(e)) {
        if (/ger$/.test(inf)) stem = stem.replace(/e$/, "");
        else if (/cer$/.test(inf)) stem = stem.replace(/\u00e7$/, "c");
      }
      return stem + e;
    });
  }

  function futurForms(v) {
    var s = futureStem(v);
    return END.futur.map(function (e) {
      return s + e;
    });
  }

  function conditionnelForms(v) {
    var s = futureStem(v);
    return END.imparfait.map(function (e) {
      return s + e;
    });
  }

  function subjonctifForms(v) {
    if (v.subj) return v.subj.slice();
    var ils = presentForms(v)[5].replace(/ent$/, "");
    var imp = imparfaitForms(v);
    return [
      ils + "e",
      ils + "es",
      ils + "e",
      imp[3], // nous: same shape as the imparfait
      imp[4], // vous
      ils + "ent"
    ];
  }

  function auxOf(v) {
    return v.refl || v.aux === "etre" ? "être" : "avoir";
  }

  function auxVerb(v) {
    var name = auxOf(v);
    for (var i = 0; i < VERBS.length; i++) if (VERBS[i].inf === name) return VERBS[i];
    return null;
  }

  /** Masculine agreement: nothing for je/tu/il, an -s for nous/vous/ils. */
  function agree(v, person) {
    if (auxOf(v) !== "être") return "";
    return person >= 3 ? "s" : "";
  }

  function compound(v, person, auxForms) {
    var pp = participle(v);
    var suffix = agree(v, person);
    if (suffix && / /.test(pp)) return auxForms[person] + " " + pp; // "rendu compte" stays put
    return auxForms[person] + " " + pp + suffix;
  }

  /** The six conjugated forms of `v` in `tense` (no subject pronouns). */
  function forms(v, tense) {
    var a = auxVerb(v);
    switch (tense) {
      case "present": return presentForms(v);
      case "imparfait": return imparfaitForms(v);
      case "futur": return futurForms(v);
      case "conditionnel": return conditionnelForms(v);
      case "subjonctif": return subjonctifForms(v);
      case "passeCompose": return sixOf(v, presentForms(a));
      case "plusQueParfait": return sixOf(v, imparfaitForms(a));
      case "conditionnelPasse": return sixOf(v, conditionnelForms(a));
      case "futurAnterieur": return sixOf(v, futurForms(a));
      case "subjonctifPasse": return sixOf(v, subjonctifForms(a));
      default: throw new Error("Unknown tense: " + tense);
    }
  }

  function sixOf(v, auxForms) {
    var out = [];
    for (var i = 0; i < 6; i++) out.push(compound(v, i, auxForms));
    return out;
  }

  function elide(word, next) {
    return VOWELISH.test(next) ? word.slice(0, -1) + "'" : word + " ";
  }

  /** Subject (+ reflexive pronoun) for person `i`, ready to sit before `form`. */
  function subject(v, i, form) {
    var pron = PRONOUNS[i];
    if (v.refl) {
      var r = REFL[i];
      var refl = i === 0 || i === 1 || i === 2 || i === 5 ? elide(r, form) : r + " ";
      return (i === 0 ? "je " : pron + " ") + refl;
    }
    return i === 0 ? elide(pron, form) : pron + " ";
  }

  /** Full answer, e.g. "nous nous sommes levés" or "que j'aie". */
  function full(v, tense, i) {
    var form = forms(v, tense)[i];
    var meta = tenseById(tense);
    return (meta && meta.prefix ? meta.prefix : "") + subject(v, i, form) + form;
  }

  /** Just the part the student types: pronouns are given by the prompt. */
  function answer(v, tense, i) {
    return forms(v, tense)[i];
  }

  /** The pronoun shown in the prompt, e.g. "nous nous" for reflexives. */
  function promptSubject(v, i) {
    if (v.refl) return PRONOUNS[i] + " " + REFL[i];
    return PRONOUNS[i];
  }

  function tenseById(id) {
    for (var i = 0; i < TENSES.length; i++) if (TENSES[i].id === id) return TENSES[i];
    return null;
  }

  App.Verbs = {
    all: VERBS,
    tenses: TENSES,
    pronouns: PRONOUNS,
    forms: forms,
    full: full,
    answer: answer,
    participle: participle,
    aux: auxOf,
    promptSubject: promptSubject,
    tenseById: tenseById,
    infinitive: function (v) { return v.inf; },
    /** Verbs a student at `level` has met. */
    forLevel: function (level) {
      return VERBS.filter(function (v) { return v.lvl <= level; });
    },
    /** Tenses a student at `level` has been taught. */
    tensesForLevel: function (level) {
      return TENSES.filter(function (t) { return t.lvl <= level; });
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Verbs;
})(typeof window !== "undefined" ? window : globalThis);
