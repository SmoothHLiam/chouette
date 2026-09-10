/* Chouette ! — Grammar questions, used by the boss fights and the daily quiz.
 * Each item: { q, a (the correct option), opts, why (shown after answering) }
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var GRAMMAR = {
    1: [
      { q: "___ voiture est rouge.", a: "La", opts: ["La", "Le", "Les", "L'"], why: "« Voiture » est féminin singulier → la voiture." },
      { q: "Je ___ français avec ma mère.", a: "parle", opts: ["parle", "parles", "parlons", "parlez"], why: "Verbe en -er, forme « je » → -e." },
      { q: "Nous ___ un chien et deux chats.", a: "avons", opts: ["avons", "avez", "ont", "as"], why: "avoir : nous avons." },
      { q: "Le pluriel de « le livre » :", a: "les livres", opts: ["les livres", "le livres", "les livre", "des livre"], why: "L'article ET le nom prennent la marque du pluriel." },
      { q: "Elle est très ___. (tall)", a: "grande", opts: ["grande", "grand", "grands", "grandes"], why: "L'adjectif s'accorde : féminin singulier → grande." },
      { q: "___-tu à l'école aujourd'hui ?", a: "Vas", opts: ["Vas", "Va", "Vais", "Vont"], why: "aller : tu vas." },
      { q: "Il y a ___ pomme sur la table.", a: "une", opts: ["une", "un", "des", "le"], why: "« Pomme » est féminin → une pomme." },
      { q: "J'aime ___ chocolat.", a: "le", opts: ["le", "un", "du", "de"], why: "Après aimer, on utilise l'article défini : j'aime le chocolat." },
      { q: "Ils ___ à Paris depuis 2019.", a: "habitent", opts: ["habitent", "habite", "habitez", "habitons"], why: "Verbe en -er, forme « ils » → -ent (muet)." },
      { q: "Quel mot est masculin ?", a: "le cahier", opts: ["le cahier", "la trousse", "la porte", "la chaise"], why: "Cahier est masculin ; les trois autres sont féminins." }
    ],
    2: [
      { q: "Hier, elle ___ au cinéma.", a: "est allée", opts: ["est allée", "a allé", "est allé", "a allée"], why: "aller prend être au passé composé, et le participe s'accorde : elle est allée." },
      { q: "Nous ___ fini nos devoirs.", a: "avons", opts: ["avons", "sommes", "avez", "êtes"], why: "finir prend l'auxiliaire avoir." },
      { q: "Je ___ levé très tôt ce matin.", a: "me suis", opts: ["me suis", "m'ai", "suis", "me lève"], why: "Les verbes pronominaux prennent toujours être." },
      { q: "Il ___ pas venu à la fête.", a: "n'est", opts: ["n'est", "n'a", "ne", "n'était"], why: "venir prend être : il n'est pas venu." },
      { q: "Je voudrais ___ eau, s'il vous plaît.", a: "de l'", opts: ["de l'", "du", "de la", "des"], why: "Partitif devant une voyelle → de l'eau." },
      { q: "Elle ___ son manteau avant de sortir.", a: "a mis", opts: ["a mis", "est mis", "a mettu", "a mit"], why: "Participe passé irrégulier de mettre → mis." },
      { q: "Marie est ___ grande que Paul.", a: "plus", opts: ["plus", "plus de", "mieux", "meilleure"], why: "Comparatif d'un adjectif : plus … que." },
      { q: "Ce sont ___ chaussures préférées.", a: "mes", opts: ["mes", "mon", "ma", "me"], why: "Possessif pluriel → mes." },
      { q: "Vous ___ partis avant midi.", a: "êtes", opts: ["êtes", "avez", "sont", "ont"], why: "partir prend être au passé composé." },
      { q: "Quand il fait froid, je ___ une écharpe.", a: "porte", opts: ["porte", "portes", "portons", "portez"], why: "Forme « je » d'un verbe en -er." }
    ],
    3: [
      { q: "Quand j'étais petit, je ___ souvent au parc.", a: "allais", opts: ["allais", "suis allé", "irai", "aille"], why: "Habitude dans le passé → imparfait." },
      { q: "Demain, nous ___ le recyclage au lycée.", a: "commencerons", opts: ["commencerons", "commencions", "commençons", "commencerions"], why: "« Demain » annonce le futur simple." },
      { q: "Il faut ___ l'environnement.", a: "protéger", opts: ["protéger", "protège", "protégeons", "protégé"], why: "Après « il faut », on emploie l'infinitif." },
      { q: "Tu vas au marché ? — Oui, j'___ vais.", a: "y", opts: ["y", "en", "le", "la"], why: "« y » remplace un lieu introduit par à/au/en." },
      { q: "Elle a beaucoup ___ travail cette semaine.", a: "de", opts: ["de", "du", "le", "des"], why: "Après une expression de quantité → de." },
      { q: "C'est le film ___ j'ai vu hier.", a: "que", opts: ["que", "qui", "dont", "où"], why: "« que » est complément d'objet direct de « j'ai vu »." },
      { q: "Si tu veux, on ___ demain matin.", a: "partira", opts: ["partira", "partirait", "partait", "parte"], why: "si + présent → futur dans la principale." },
      { q: "Il ___ beau et les oiseaux chantaient.", a: "faisait", opts: ["faisait", "a fait", "fera", "ferait"], why: "Description en arrière-plan → imparfait." },
      { q: "Elle a des rêves ___ elle parle souvent.", a: "dont", opts: ["dont", "que", "qui", "où"], why: "parler DE quelque chose → dont." },
      { q: "Nous ___ de moins en moins de papier.", a: "gaspillons", opts: ["gaspillons", "gaspillez", "gaspillent", "gaspille"], why: "Forme « nous » d'un verbe en -er." }
    ],
    4: [
      { q: "Il faut que tu ___ plus tôt.", a: "partes", opts: ["partes", "pars", "partiras", "partirais"], why: "« Il faut que » déclenche le subjonctif." },
      { q: "Bien qu'il ___ fatigué, il continue.", a: "soit", opts: ["soit", "est", "serait", "était"], why: "« Bien que » est toujours suivi du subjonctif." },
      { q: "Si j'avais le temps, je ___ ce roman.", a: "lirais", opts: ["lirais", "lirai", "lisais", "lise"], why: "si + imparfait → conditionnel présent." },
      { q: "Je pense qu'il ___ raison.", a: "a", opts: ["a", "ait", "aie", "aurait"], why: "penser à la forme affirmative → indicatif." },
      { q: "Avant qu'il ne ___ trop tard, agissons.", a: "soit", opts: ["soit", "est", "sera", "était"], why: "« avant que » exige le subjonctif." },
      { q: "Ce sont mes idées ; je ___ défends.", a: "les", opts: ["les", "leur", "lui", "en"], why: "défendre quelque chose → COD pluriel : les." },
      { q: "L'article ___ je parle est controversé.", a: "dont", opts: ["dont", "que", "qui", "où"], why: "parler DE → dont." },
      { q: "La loi ___ votée hier soir.", a: "a été", opts: ["a été", "est eu", "était", "a"], why: "Passif au passé composé : être au passé composé + participe." },
      { q: "Il vaut mieux que nous ___ prudents.", a: "soyons", opts: ["soyons", "sommes", "serons", "serions"], why: "« Il vaut mieux que » + subjonctif ; être → que nous soyons." },
      { q: "___, la situation reste préoccupante.", a: "Cependant", opts: ["Cependant", "Grâce à", "Afin de", "Pourvu"], why: "Un connecteur d'opposition en début de phrase." }
    ],
    5: [
      { q: "Il a dit qu'il ___ déjà vu ce documentaire.", a: "avait", opts: ["avait", "a", "aurait", "ait"], why: "Antériorité dans le passé → plus-que-parfait." },
      { q: "Si j'avais su, je ___ autrement.", a: "aurais agi", opts: ["aurais agi", "aurai agi", "avais agi", "agirais"], why: "si + plus-que-parfait → conditionnel passé." },
      { q: "Je suis ravi que tu ___ réussi ton examen.", a: "aies", opts: ["aies", "as", "avais", "auras"], why: "Émotion + fait accompli → subjonctif passé." },
      { q: "Quoi qu'il ___, nous continuerons.", a: "arrive", opts: ["arrive", "arrivera", "arriverait", "arrivait"], why: "« Quoi que » est suivi du subjonctif." },
      { q: "Ce sont les résultats ___ nous avions besoin.", a: "dont", opts: ["dont", "que", "qui", "lesquels"], why: "avoir besoin DE → dont." },
      { q: "Après ___ terminé, elle est partie.", a: "avoir", opts: ["avoir", "avait", "être", "ayant été"], why: "après + infinitif passé → après avoir terminé." },
      { q: "Voici les lettres qu'elle a ___.", a: "écrites", opts: ["écrites", "écrit", "écrits", "écrite"], why: "COD placé avant avoir → accord : lettres (f. pl.) → écrites." },
      { q: "Il est le seul qui ___ compris l'enjeu.", a: "ait", opts: ["ait", "a", "avait", "aura"], why: "Après « le seul qui », on emploie le subjonctif." },
      { q: "En ___ ces mesures, l'État espère réduire les inégalités.", a: "adoptant", opts: ["adoptant", "adopté", "adopter", "adoptait"], why: "Le gérondif : en + participe présent." },
      { q: "Faute ___ moyens, le projet a été abandonné.", a: "de", opts: ["de", "des", "du", "à"], why: "L'expression figée est « faute de + nom »." }
    ]
  };

  App.Grammar = {
    byLevel: GRAMMAR,
    upTo: function (level) {
      var out = [];
      for (var i = 1; i <= level; i++) {
        (GRAMMAR[i] || []).forEach(function (g) { out.push(g); });
      }
      return out;
    },
    deck: function (level) {
      var out = (GRAMMAR[level] || []).slice();
      if (level > 1) out = out.concat(GRAMMAR[level - 1] || []);
      return out;
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Grammar;
})(typeof window !== "undefined" ? window : globalThis);
