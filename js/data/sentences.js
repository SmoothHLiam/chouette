/* Chouette ! — Sentences for Construis la Phrase and the listening lab. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var SENTENCES = {
    1: [
      { en: "I have a black dog.", fr: "J'ai un chien noir." },
      { en: "She is my sister.", fr: "Elle est ma sœur." },
      { en: "We eat bread at school.", fr: "Nous mangeons du pain à l'école." },
      { en: "The book is on the table.", fr: "Le livre est sur la table." },
      { en: "I like the red car.", fr: "J'aime la voiture rouge." },
      { en: "He speaks French with his father.", fr: "Il parle français avec son père." },
      { en: "There is a cat in the garden.", fr: "Il y a un chat dans le jardin." },
      { en: "We are tired today.", fr: "Nous sommes fatigués aujourd'hui." },
      { en: "I go to school every day.", fr: "Je vais à l'école tous les jours." },
      { en: "The teacher is very nice.", fr: "Le professeur est très sympa." },
      { en: "My brother listens to music.", fr: "Mon frère écoute de la musique." },
      { en: "The window is small.", fr: "La fenêtre est petite." }
    ],
    2: [
      { en: "Yesterday I went to the bakery.", fr: "Hier je suis allé à la boulangerie." },
      { en: "We took the train to Paris.", fr: "Nous avons pris le train pour Paris." },
      { en: "She put on her coat because it is cold.", fr: "Elle a mis son manteau parce qu'il fait froid." },
      { en: "I woke up at seven o'clock.", fr: "Je me suis réveillé à sept heures." },
      { en: "They left before the storm.", fr: "Ils sont partis avant l'orage." },
      { en: "The store is across from the station.", fr: "Le magasin est en face de la gare." },
      { en: "I had to wait for the bus.", fr: "J'ai dû attendre le bus." },
      { en: "He did not sleep well last night.", fr: "Il n'a pas bien dormi la nuit dernière." },
      { en: "She wrote a letter to her brother.", fr: "Elle a écrit une lettre à son frère." },
      { en: "It rained all weekend.", fr: "Il a plu tout le week-end." },
      { en: "I bought two tickets for the show.", fr: "J'ai acheté deux billets pour le spectacle." },
      { en: "We visited the market on Sunday.", fr: "Nous avons visité le marché dimanche." }
    ],
    3: [
      { en: "When I was young, I lived in Lyon.", fr: "Quand j'étais jeune, j'habitais à Lyon." },
      { en: "We will protect the forest.", fr: "Nous protégerons la forêt." },
      { en: "He was afraid of failing.", fr: "Il avait peur d'échouer." },
      { en: "Everyone must recycle more.", fr: "Tout le monde doit recycler davantage." },
      { en: "In my opinion, we waste too much water.", fr: "À mon avis, nous gaspillons trop d'eau." },
      { en: "She will find a better job.", fr: "Elle trouvera un meilleur emploi." },
      { en: "Screens are everywhere in our daily life.", fr: "Les écrans sont partout dans notre vie quotidienne." },
      { en: "I used to watch television every evening.", fr: "Je regardais la télévision tous les soirs." },
      { en: "If it rains, we will stay home.", fr: "S'il pleut, nous resterons à la maison." },
      { en: "Pollution is more and more serious.", fr: "La pollution est de plus en plus grave." },
      { en: "This app helps students learn.", fr: "Cette application aide les élèves à apprendre." },
      { en: "He wanted to improve his résumé.", fr: "Il voulait améliorer son curriculum vitae." }
    ],
    4: [
      { en: "I would like to support this cause.", fr: "Je voudrais soutenir cette cause." },
      { en: "Everyone has to vote.", fr: "Il faut que tout le monde vote." },
      { en: "Although the film is long, it is fascinating.", fr: "Bien que le film soit long, il est passionnant." },
      { en: "The press must verify its sources.", fr: "La presse doit vérifier ses sources." },
      { en: "If I were president, I would change the law.", fr: "Si j'étais président, je changerais la loi." },
      { en: "This novel deals with freedom of expression.", fr: "Ce roman aborde la liberté d'expression." },
      { en: "Many people protested against the reform.", fr: "Beaucoup de gens ont manifesté contre la réforme." },
      { en: "I doubt that he is telling the truth.", fr: "Je doute qu'il dise la vérité." },
      { en: "However, the situation remains complicated.", fr: "Cependant, la situation reste compliquée." },
      { en: "The director wanted to highlight this injustice.", fr: "Le réalisateur voulait mettre en valeur cette injustice." },
      { en: "We should read the article before judging.", fr: "Nous devrions lire l'article avant de juger." },
      { en: "This painting moved the whole audience.", fr: "Ce tableau a bouleversé tout le public." }
    ],
    5: [
      { en: "Globalization has transformed our identities.", fr: "La mondialisation a transformé nos identités." },
      { en: "It is a matter of raising young people's awareness.", fr: "Il s'agit de sensibiliser les jeunes." },
      { en: "For lack of resources, the project failed.", fr: "Faute de moyens, le projet a échoué." },
      { en: "Artificial intelligence raises ethical questions.", fr: "L'intelligence artificielle soulève des questions éthiques." },
      { en: "One must admit that inequalities are increasing.", fr: "Force est de constater que les inégalités s'accroissent." },
      { en: "Whatever happens, we must protect privacy.", fr: "Quoi qu'il arrive, il faut protéger la vie privée." },
      { en: "This heritage bears witness to a shared history.", fr: "Ce patrimoine témoigne d'une histoire partagée." },
      { en: "The more time passes, the wider the gap grows.", fr: "Plus le temps passe, plus l'écart se creuse." },
      { en: "Had I known, I would have acted differently.", fr: "Si j'avais su, j'aurais agi différemment." },
      { en: "Volunteering allows young people to flourish.", fr: "Le bénévolat permet aux jeunes de s'épanouir." },
      { en: "In the long run, this approach will bear fruit.", fr: "À long terme, cette démarche portera ses fruits." },
      { en: "The author brings a forgotten reality to light.", fr: "L'auteur met en lumière une réalité oubliée." }
    ]
  };

  /** ["J'ai", "un", "chien", "noir"] — the tiles the player has to order. */
  function tokens(fr) {
    return fr.replace(/\s*[.?!]+$/, "").split(/\s+/);
  }

  /** The trailing punctuation, kept out of the tiles but shown in the answer. */
  function tail(fr) {
    var m = fr.match(/\s*([.?!]+)$/);
    return m ? m[1] : "";
  }

  App.Sentences = {
    byLevel: SENTENCES,
    tokens: tokens,
    tail: tail,
    upTo: function (level) {
      var out = [];
      for (var i = 1; i <= level; i++) {
        (SENTENCES[i] || []).forEach(function (s) { out.push(s); });
      }
      return out;
    },
    /** Current level first, one tier back for variety. */
    deck: function (level) {
      var out = (SENTENCES[level] || []).slice();
      if (level > 1) out = out.concat(SENTENCES[level - 1] || []);
      return out;
    },
    /** Every distinct word at this level — used to build decoy tiles. */
    wordPool: function (level) {
      var seen = {};
      var pool = [];
      App.Sentences.upTo(level).forEach(function (s) {
        tokens(s.fr).forEach(function (w) {
          var k = w.toLowerCase();
          if (!seen[k] && w.length > 1) { seen[k] = 1; pool.push(w.toLowerCase()); }
        });
      });
      return pool;
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Sentences;
})(typeof window !== "undefined" ? window : globalThis);
