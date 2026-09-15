/* Chouette ! — Vocabulary bank
 * Each entry: { fr, en, g: "m"|"f"|null, t: type, c: category, pl? }
 *   pl: plural-only in French ("les devoirs") — it takes "les" whatever its
 *       gender, so it never appears in the le/la game.
 *   t: "n" noun · "v" verb (infinitive) · "a" adjective · "e" expression
 * Nouns are stored WITHOUT their article so the gender games can hide it.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var VOCAB = {
    1: [
      // --- La salle de classe ---
      { fr: "livre", en: "book", g: "m", t: "n", c: "classe" },
      { fr: "stylo", en: "pen", g: "m", t: "n", c: "classe" },
      { fr: "crayon", en: "pencil", g: "m", t: "n", c: "classe" },
      { fr: "trousse", en: "pencil case", g: "f", t: "n", c: "classe" },
      { fr: "cahier", en: "notebook", g: "m", t: "n", c: "classe" },
      { fr: "gomme", en: "eraser", g: "f", t: "n", c: "classe" },
      { fr: "porte", en: "door", g: "f", t: "n", c: "classe" },
      { fr: "fenêtre", en: "window", g: "f", t: "n", c: "classe" },
      { fr: "chaise", en: "chair", g: "f", t: "n", c: "classe" },
      { fr: "table", en: "table", g: "f", t: "n", c: "classe" },
      { fr: "sac à dos", en: "backpack", g: "m", t: "n", c: "classe" },
      { fr: "ordinateur", en: "computer", g: "m", t: "n", c: "classe" },
      { fr: "école", en: "school", g: "f", t: "n", c: "classe" },
      { fr: "devoirs", en: "homework", g: "m", pl: true, t: "n", c: "classe" },
      // --- La famille ---
      { fr: "famille", en: "family", g: "f", t: "n", c: "famille" },
      { fr: "père", en: "father", g: "m", t: "n", c: "famille" },
      { fr: "mère", en: "mother", g: "f", t: "n", c: "famille" },
      { fr: "frère", en: "brother", g: "m", t: "n", c: "famille" },
      { fr: "sœur", en: "sister", g: "f", t: "n", c: "famille" },
      { fr: "fille", en: "girl / daughter", g: "f", t: "n", c: "famille" },
      { fr: "garçon", en: "boy", g: "m", t: "n", c: "famille" },
      { fr: "ami", en: "friend", g: "m", t: "n", c: "famille" },
      { fr: "chien", en: "dog", g: "m", t: "n", c: "famille" },
      { fr: "chat", en: "cat", g: "m", t: "n", c: "famille" },
      // --- La nourriture ---
      { fr: "pain", en: "bread", g: "m", t: "n", c: "nourriture" },
      { fr: "fromage", en: "cheese", g: "m", t: "n", c: "nourriture" },
      { fr: "pomme", en: "apple", g: "f", t: "n", c: "nourriture" },
      { fr: "eau", en: "water", g: "f", t: "n", c: "nourriture" },
      { fr: "lait", en: "milk", g: "m", t: "n", c: "nourriture" },
      { fr: "gâteau", en: "cake", g: "m", t: "n", c: "nourriture" },
      { fr: "glace", en: "ice cream", g: "f", t: "n", c: "nourriture" },
      { fr: "jus", en: "juice", g: "m", t: "n", c: "nourriture" },
      { fr: "poulet", en: "chicken", g: "m", t: "n", c: "nourriture" },
      { fr: "salade", en: "salad", g: "f", t: "n", c: "nourriture" },
      // --- Le temps qui passe ---
      { fr: "matin", en: "morning", g: "m", t: "n", c: "temps" },
      { fr: "soir", en: "evening", g: "m", t: "n", c: "temps" },
      { fr: "nuit", en: "night", g: "f", t: "n", c: "temps" },
      { fr: "jour", en: "day", g: "m", t: "n", c: "temps" },
      { fr: "semaine", en: "week", g: "f", t: "n", c: "temps" },
      { fr: "mois", en: "month", g: "m", t: "n", c: "temps" },
      { fr: "année", en: "year", g: "f", t: "n", c: "temps" },
      { fr: "heure", en: "hour", g: "f", t: "n", c: "temps" },
      // --- Autour de moi ---
      { fr: "maison", en: "house", g: "f", t: "n", c: "lieux" },
      { fr: "voiture", en: "car", g: "f", t: "n", c: "lieux" },
      { fr: "ville", en: "city", g: "f", t: "n", c: "lieux" },
      { fr: "pays", en: "country", g: "m", t: "n", c: "lieux" },
      // --- Adjectifs ---
      { fr: "grand", en: "big / tall", g: null, t: "a", c: "adjectifs" },
      { fr: "petit", en: "small", g: null, t: "a", c: "adjectifs" },
      { fr: "rouge", en: "red", g: null, t: "a", c: "couleurs" },
      { fr: "bleu", en: "blue", g: null, t: "a", c: "couleurs" },
      { fr: "vert", en: "green", g: null, t: "a", c: "couleurs" },
      { fr: "jaune", en: "yellow", g: null, t: "a", c: "couleurs" },
      { fr: "noir", en: "black", g: null, t: "a", c: "couleurs" },
      { fr: "blanc", en: "white", g: null, t: "a", c: "couleurs" },
      { fr: "content", en: "happy", g: null, t: "a", c: "adjectifs" },
      { fr: "fatigué", en: "tired", g: null, t: "a", c: "adjectifs" },
      { fr: "sympa", en: "nice / friendly", g: null, t: "a", c: "adjectifs" },
      { fr: "difficile", en: "difficult", g: null, t: "a", c: "adjectifs" },
      { fr: "facile", en: "easy", g: null, t: "a", c: "adjectifs" },
      // --- Verbes ---
      { fr: "parler", en: "to speak", g: null, t: "v", c: "verbes" },
      { fr: "manger", en: "to eat", g: null, t: "v", c: "verbes" },
      { fr: "aimer", en: "to like / to love", g: null, t: "v", c: "verbes" },
      { fr: "habiter", en: "to live (somewhere)", g: null, t: "v", c: "verbes" },
      { fr: "écouter", en: "to listen", g: null, t: "v", c: "verbes" },
      { fr: "regarder", en: "to watch", g: null, t: "v", c: "verbes" },
      { fr: "être", en: "to be", g: null, t: "v", c: "verbes" },
      { fr: "avoir", en: "to have", g: null, t: "v", c: "verbes" },
      { fr: "aller", en: "to go", g: null, t: "v", c: "verbes" },
      { fr: "faire", en: "to do / to make", g: null, t: "v", c: "verbes" },
      // --- Expressions ---
      { fr: "bonjour", en: "hello", g: null, t: "e", c: "salutations" },
      { fr: "salut", en: "hi / bye", g: null, t: "e", c: "salutations" },
      { fr: "au revoir", en: "goodbye", g: null, t: "e", c: "salutations" },
      { fr: "merci beaucoup", en: "thank you very much", g: null, t: "e", c: "salutations" },
      { fr: "s'il vous plaît", en: "please", g: null, t: "e", c: "salutations" },
      { fr: "je m'appelle", en: "my name is", g: null, t: "e", c: "salutations" },
      { fr: "enchanté", en: "nice to meet you", g: null, t: "e", c: "salutations" },
      { fr: "à bientôt", en: "see you soon", g: null, t: "e", c: "salutations" },
      { fr: "ça va bien", en: "I'm doing well", g: null, t: "e", c: "salutations" }
    ],

    2: [
      // --- La maison ---
      { fr: "chambre", en: "bedroom", g: "f", t: "n", c: "maison" },
      { fr: "cuisine", en: "kitchen", g: "f", t: "n", c: "maison" },
      { fr: "salon", en: "living room", g: "m", t: "n", c: "maison" },
      { fr: "jardin", en: "garden / yard", g: "m", t: "n", c: "maison" },
      { fr: "escalier", en: "staircase", g: "m", t: "n", c: "maison" },
      { fr: "immeuble", en: "apartment building", g: "m", t: "n", c: "maison" },
      { fr: "appartement", en: "apartment", g: "m", t: "n", c: "maison" },
      { fr: "meuble", en: "piece of furniture", g: "m", t: "n", c: "maison" },
      // --- En ville ---
      { fr: "quartier", en: "neighborhood", g: "m", t: "n", c: "ville" },
      { fr: "rue", en: "street", g: "f", t: "n", c: "ville" },
      { fr: "magasin", en: "store", g: "m", t: "n", c: "ville" },
      { fr: "boulangerie", en: "bakery", g: "f", t: "n", c: "ville" },
      { fr: "marché", en: "market", g: "m", t: "n", c: "ville" },
      { fr: "église", en: "church", g: "f", t: "n", c: "ville" },
      { fr: "banque", en: "bank", g: "f", t: "n", c: "ville" },
      { fr: "bibliothèque", en: "library", g: "f", t: "n", c: "ville" },
      // --- Les voyages ---
      { fr: "gare", en: "train station", g: "f", t: "n", c: "voyages" },
      { fr: "aéroport", en: "airport", g: "m", t: "n", c: "voyages" },
      { fr: "plage", en: "beach", g: "f", t: "n", c: "voyages" },
      { fr: "montagne", en: "mountain", g: "f", t: "n", c: "voyages" },
      { fr: "train", en: "train", g: "m", t: "n", c: "voyages" },
      { fr: "avion", en: "plane", g: "m", t: "n", c: "voyages" },
      { fr: "valise", en: "suitcase", g: "f", t: "n", c: "voyages" },
      { fr: "billet", en: "ticket", g: "m", t: "n", c: "voyages" },
      { fr: "séjour", en: "stay / trip", g: "m", t: "n", c: "voyages" },
      // --- Les vêtements ---
      { fr: "chemise", en: "shirt", g: "f", t: "n", c: "vêtements" },
      { fr: "pantalon", en: "pants", g: "m", t: "n", c: "vêtements" },
      { fr: "robe", en: "dress", g: "f", t: "n", c: "vêtements" },
      { fr: "chaussure", en: "shoe", g: "f", t: "n", c: "vêtements" },
      { fr: "manteau", en: "coat", g: "m", t: "n", c: "vêtements" },
      { fr: "chapeau", en: "hat", g: "m", t: "n", c: "vêtements" },
      { fr: "écharpe", en: "scarf", g: "f", t: "n", c: "vêtements" },
      // --- Le corps et la santé ---
      { fr: "tête", en: "head", g: "f", t: "n", c: "santé" },
      { fr: "main", en: "hand", g: "f", t: "n", c: "santé" },
      { fr: "bras", en: "arm", g: "m", t: "n", c: "santé" },
      { fr: "jambe", en: "leg", g: "f", t: "n", c: "santé" },
      { fr: "dos", en: "back", g: "m", t: "n", c: "santé" },
      { fr: "cœur", en: "heart", g: "m", t: "n", c: "santé" },
      { fr: "santé", en: "health", g: "f", t: "n", c: "santé" },
      { fr: "médecin", en: "doctor", g: "m", t: "n", c: "santé" },
      { fr: "pharmacie", en: "pharmacy", g: "f", t: "n", c: "santé" },
      // --- Le temps qu'il fait ---
      { fr: "pluie", en: "rain", g: "f", t: "n", c: "météo" },
      { fr: "neige", en: "snow", g: "f", t: "n", c: "météo" },
      { fr: "soleil", en: "sun", g: "m", t: "n", c: "météo" },
      { fr: "vent", en: "wind", g: "m", t: "n", c: "météo" },
      { fr: "nuage", en: "cloud", g: "m", t: "n", c: "météo" },
      { fr: "orage", en: "thunderstorm", g: "m", t: "n", c: "météo" },
      // --- Adjectifs ---
      { fr: "cher", en: "expensive / dear", g: null, t: "a", c: "adjectifs" },
      { fr: "propre", en: "clean", g: null, t: "a", c: "adjectifs" },
      { fr: "sale", en: "dirty", g: null, t: "a", c: "adjectifs" },
      { fr: "pratique", en: "convenient", g: null, t: "a", c: "adjectifs" },
      { fr: "ensoleillé", en: "sunny", g: null, t: "a", c: "adjectifs" },
      { fr: "froid", en: "cold", g: null, t: "a", c: "adjectifs" },
      { fr: "chaud", en: "hot", g: null, t: "a", c: "adjectifs" },
      { fr: "bruyant", en: "noisy", g: null, t: "a", c: "adjectifs" },
      // --- Verbes ---
      { fr: "prendre", en: "to take", g: null, t: "v", c: "verbes" },
      { fr: "venir", en: "to come", g: null, t: "v", c: "verbes" },
      { fr: "partir", en: "to leave", g: null, t: "v", c: "verbes" },
      { fr: "sortir", en: "to go out", g: null, t: "v", c: "verbes" },
      { fr: "dormir", en: "to sleep", g: null, t: "v", c: "verbes" },
      { fr: "mettre", en: "to put / to put on", g: null, t: "v", c: "verbes" },
      { fr: "pouvoir", en: "to be able to", g: null, t: "v", c: "verbes" },
      { fr: "vouloir", en: "to want", g: null, t: "v", c: "verbes" },
      { fr: "devoir", en: "to have to", g: null, t: "v", c: "verbes" },
      { fr: "savoir", en: "to know (a fact)", g: null, t: "v", c: "verbes" },
      { fr: "attendre", en: "to wait for", g: null, t: "v", c: "verbes" },
      { fr: "choisir", en: "to choose", g: null, t: "v", c: "verbes" },
      // --- Expressions ---
      { fr: "il fait beau", en: "the weather is nice", g: null, t: "e", c: "expressions" },
      { fr: "il pleut", en: "it's raining", g: null, t: "e", c: "expressions" },
      { fr: "j'ai faim", en: "I'm hungry", g: null, t: "e", c: "expressions" },
      { fr: "j'ai soif", en: "I'm thirsty", g: null, t: "e", c: "expressions" },
      { fr: "tout droit", en: "straight ahead", g: null, t: "e", c: "expressions" },
      { fr: "à côté de", en: "next to", g: null, t: "e", c: "expressions" },
      { fr: "en face de", en: "across from", g: null, t: "e", c: "expressions" }
    ],

    3: [
      // --- Le monde du travail ---
      { fr: "travail", en: "work", g: "m", t: "n", c: "travail" },
      { fr: "entreprise", en: "company", g: "f", t: "n", c: "travail" },
      { fr: "bureau", en: "office / desk", g: "m", t: "n", c: "travail" },
      { fr: "emploi", en: "job", g: "m", t: "n", c: "travail" },
      { fr: "salaire", en: "salary", g: "m", t: "n", c: "travail" },
      { fr: "entretien", en: "interview", g: "m", t: "n", c: "travail" },
      { fr: "stage", en: "internship", g: "m", t: "n", c: "travail" },
      { fr: "métier", en: "profession / trade", g: "m", t: "n", c: "travail" },
      { fr: "réunion", en: "meeting", g: "f", t: "n", c: "travail" },
      { fr: "avocat", en: "lawyer", g: "m", t: "n", c: "travail" },
      { fr: "ingénieur", en: "engineer", g: "m", t: "n", c: "travail" },
      { fr: "chercheur", en: "researcher", g: "m", t: "n", c: "travail" },
      // --- L'environnement ---
      { fr: "environnement", en: "environment", g: "m", t: "n", c: "environnement" },
      { fr: "pollution", en: "pollution", g: "f", t: "n", c: "environnement" },
      { fr: "réchauffement", en: "warming (climate)", g: "m", t: "n", c: "environnement" },
      { fr: "déchet", en: "piece of waste / trash", g: "m", t: "n", c: "environnement" },
      { fr: "recyclage", en: "recycling", g: "m", t: "n", c: "environnement" },
      { fr: "planète", en: "planet", g: "f", t: "n", c: "environnement" },
      { fr: "forêt", en: "forest", g: "f", t: "n", c: "environnement" },
      { fr: "énergie", en: "energy", g: "f", t: "n", c: "environnement" },
      { fr: "espèce", en: "species", g: "f", t: "n", c: "environnement" },
      { fr: "sécheresse", en: "drought", g: "f", t: "n", c: "environnement" },
      // --- La technologie ---
      { fr: "écran", en: "screen", g: "m", t: "n", c: "technologie" },
      { fr: "logiciel", en: "software", g: "m", t: "n", c: "technologie" },
      { fr: "publicité", en: "advertisement", g: "f", t: "n", c: "technologie" },
      { fr: "application", en: "app", g: "f", t: "n", c: "technologie" },
      { fr: "portable", en: "cell phone", g: "m", t: "n", c: "technologie" },
      { fr: "réseau", en: "network", g: "m", t: "n", c: "technologie" },
      { fr: "utilisateur", en: "user", g: "m", t: "n", c: "technologie" },
      { fr: "clavier", en: "keyboard", g: "m", t: "n", c: "technologie" },
      // --- Les sentiments ---
      { fr: "colère", en: "anger", g: "f", t: "n", c: "sentiments" },
      { fr: "peur", en: "fear", g: "f", t: "n", c: "sentiments" },
      { fr: "joie", en: "joy", g: "f", t: "n", c: "sentiments" },
      { fr: "tristesse", en: "sadness", g: "f", t: "n", c: "sentiments" },
      { fr: "inquiétude", en: "worry", g: "f", t: "n", c: "sentiments" },
      { fr: "espoir", en: "hope", g: "m", t: "n", c: "sentiments" },
      { fr: "fierté", en: "pride", g: "f", t: "n", c: "sentiments" },
      { fr: "souvenir", en: "memory", g: "m", t: "n", c: "sentiments" },
      { fr: "rêve", en: "dream", g: "m", t: "n", c: "sentiments" },
      // --- Adjectifs ---
      { fr: "inquiet", en: "worried", g: null, t: "a", c: "adjectifs" },
      { fr: "déçu", en: "disappointed", g: null, t: "a", c: "adjectifs" },
      { fr: "étonné", en: "surprised", g: null, t: "a", c: "adjectifs" },
      { fr: "fier", en: "proud", g: null, t: "a", c: "adjectifs" },
      { fr: "responsable", en: "responsible", g: null, t: "a", c: "adjectifs" },
      { fr: "quotidien", en: "daily", g: null, t: "a", c: "adjectifs" },
      { fr: "efficace", en: "effective / efficient", g: null, t: "a", c: "adjectifs" },
      { fr: "gratuit", en: "free (of charge)", g: null, t: "a", c: "adjectifs" },
      // --- Verbes ---
      { fr: "gaspiller", en: "to waste", g: null, t: "v", c: "verbes" },
      { fr: "protéger", en: "to protect", g: null, t: "v", c: "verbes" },
      { fr: "réussir", en: "to succeed", g: null, t: "v", c: "verbes" },
      { fr: "échouer", en: "to fail", g: null, t: "v", c: "verbes" },
      { fr: "améliorer", en: "to improve", g: null, t: "v", c: "verbes" },
      { fr: "gérer", en: "to manage", g: null, t: "v", c: "verbes" },
      { fr: "s'inquiéter", en: "to worry", g: null, t: "v", c: "verbes" },
      { fr: "se rendre compte", en: "to realize", g: null, t: "v", c: "verbes" },
      { fr: "économiser", en: "to save (money)", g: null, t: "v", c: "verbes" },
      { fr: "traduire", en: "to translate", g: null, t: "v", c: "verbes" },
      // --- Expressions ---
      { fr: "à mon avis", en: "in my opinion", g: null, t: "e", c: "expressions" },
      { fr: "il vaut mieux", en: "it is better to", g: null, t: "e", c: "expressions" },
      { fr: "avoir besoin de", en: "to need", g: null, t: "e", c: "expressions" },
      { fr: "se débrouiller", en: "to manage / get by", g: null, t: "e", c: "expressions" },
      { fr: "faire attention", en: "to pay attention / be careful", g: null, t: "e", c: "expressions" },
      { fr: "de plus en plus", en: "more and more", g: null, t: "e", c: "expressions" },
      { fr: "avoir envie de", en: "to feel like", g: null, t: "e", c: "expressions" }
    ],

    4: [
      // --- La société ---
      { fr: "société", en: "society", g: "f", t: "n", c: "société" },
      { fr: "citoyen", en: "citizen", g: "m", t: "n", c: "société" },
      { fr: "droit", en: "right / law", g: "m", t: "n", c: "société" },
      { fr: "loi", en: "law (statute)", g: "f", t: "n", c: "société" },
      { fr: "égalité", en: "equality", g: "f", t: "n", c: "société" },
      { fr: "liberté", en: "freedom", g: "f", t: "n", c: "société" },
      { fr: "justice", en: "justice", g: "f", t: "n", c: "société" },
      { fr: "manifestation", en: "protest / demonstration", g: "f", t: "n", c: "société" },
      { fr: "gouvernement", en: "government", g: "m", t: "n", c: "société" },
      { fr: "grève", en: "strike", g: "f", t: "n", c: "société" },
      { fr: "impôt", en: "tax", g: "m", t: "n", c: "société" },
      { fr: "frontière", en: "border", g: "f", t: "n", c: "société" },
      // --- Les médias ---
      { fr: "presse", en: "the press", g: "f", t: "n", c: "médias" },
      { fr: "journal", en: "newspaper", g: "m", t: "n", c: "médias" },
      { fr: "actualité", en: "current events", g: "f", t: "n", c: "médias" },
      { fr: "reportage", en: "news report", g: "m", t: "n", c: "médias" },
      { fr: "témoin", en: "witness", g: "m", t: "n", c: "médias" },
      { fr: "source", en: "source", g: "f", t: "n", c: "médias" },
      { fr: "rumeur", en: "rumor", g: "f", t: "n", c: "médias" },
      { fr: "chaîne", en: "channel", g: "f", t: "n", c: "médias" },
      // --- Les arts ---
      { fr: "œuvre", en: "work (of art)", g: "f", t: "n", c: "arts" },
      { fr: "tableau", en: "painting", g: "m", t: "n", c: "arts" },
      { fr: "roman", en: "novel", g: "m", t: "n", c: "arts" },
      { fr: "écrivain", en: "writer", g: "m", t: "n", c: "arts" },
      { fr: "réalisateur", en: "film director", g: "m", t: "n", c: "arts" },
      { fr: "scène", en: "stage / scene", g: "f", t: "n", c: "arts" },
      { fr: "spectacle", en: "show / performance", g: "m", t: "n", c: "arts" },
      { fr: "intrigue", en: "plot", g: "f", t: "n", c: "arts" },
      { fr: "personnage", en: "character", g: "m", t: "n", c: "arts" },
      { fr: "peinture", en: "painting (art form)", g: "f", t: "n", c: "arts" },
      // --- Adjectifs ---
      { fr: "engagé", en: "committed / activist", g: null, t: "a", c: "adjectifs" },
      { fr: "méfiant", en: "distrustful", g: null, t: "a", c: "adjectifs" },
      { fr: "marquant", en: "striking / memorable", g: null, t: "a", c: "adjectifs" },
      { fr: "bouleversant", en: "deeply moving", g: null, t: "a", c: "adjectifs" },
      { fr: "controversé", en: "controversial", g: null, t: "a", c: "adjectifs" },
      { fr: "incontournable", en: "not to be missed", g: null, t: "a", c: "adjectifs" },
      { fr: "convaincant", en: "convincing", g: null, t: "a", c: "adjectifs" },
      { fr: "invraisemblable", en: "implausible", g: null, t: "a", c: "adjectifs" },
      // --- Verbes ---
      { fr: "soutenir", en: "to support", g: null, t: "v", c: "verbes" },
      { fr: "dénoncer", en: "to denounce", g: null, t: "v", c: "verbes" },
      { fr: "revendiquer", en: "to demand / to claim", g: null, t: "v", c: "verbes" },
      { fr: "s'engager", en: "to get involved", g: null, t: "v", c: "verbes" },
      { fr: "aborder", en: "to address (a topic)", g: null, t: "v", c: "verbes" },
      { fr: "mettre en valeur", en: "to highlight", g: null, t: "v", c: "verbes" },
      { fr: "remettre en question", en: "to call into question", g: null, t: "v", c: "verbes" },
      { fr: "élire", en: "to elect", g: null, t: "v", c: "verbes" },
      { fr: "atteindre", en: "to reach / to achieve", g: null, t: "v", c: "verbes" },
      { fr: "convaincre", en: "to convince", g: null, t: "v", c: "verbes" },
      // --- Connecteurs logiques ---
      { fr: "cependant", en: "however", g: null, t: "e", c: "connecteurs" },
      { fr: "en revanche", en: "on the other hand", g: null, t: "e", c: "connecteurs" },
      { fr: "néanmoins", en: "nevertheless", g: null, t: "e", c: "connecteurs" },
      { fr: "par conséquent", en: "consequently", g: null, t: "e", c: "connecteurs" },
      { fr: "d'une part", en: "on the one hand", g: null, t: "e", c: "connecteurs" },
      { fr: "d'autre part", en: "on the other hand", g: null, t: "e", c: "connecteurs" },
      { fr: "en effet", en: "indeed", g: null, t: "e", c: "connecteurs" },
      { fr: "autrement dit", en: "in other words", g: null, t: "e", c: "connecteurs" },
      { fr: "dans la mesure où", en: "insofar as", g: null, t: "e", c: "connecteurs" },
      { fr: "au lieu de", en: "instead of", g: null, t: "e", c: "connecteurs" }
    ],

    5: [
      // --- Défis mondiaux ---
      { fr: "mondialisation", en: "globalization", g: "f", t: "n", c: "défis mondiaux" },
      { fr: "enjeu", en: "issue at stake", g: "m", t: "n", c: "défis mondiaux" },
      { fr: "défi", en: "challenge", g: "m", t: "n", c: "défis mondiaux" },
      { fr: "précarité", en: "insecurity / precariousness", g: "f", t: "n", c: "défis mondiaux" },
      { fr: "inégalité", en: "inequality", g: "f", t: "n", c: "défis mondiaux" },
      { fr: "pénurie", en: "shortage", g: "f", t: "n", c: "défis mondiaux" },
      { fr: "bien-être", en: "well-being", g: "m", t: "n", c: "défis mondiaux" },
      { fr: "bénévolat", en: "volunteering", g: "m", t: "n", c: "défis mondiaux" },
      // --- Identités ---
      { fr: "citoyenneté", en: "citizenship", g: "f", t: "n", c: "identités" },
      { fr: "patrimoine", en: "heritage", g: "m", t: "n", c: "identités" },
      { fr: "francophonie", en: "the French-speaking world", g: "f", t: "n", c: "identités" },
      { fr: "métissage", en: "cultural blending", g: "m", t: "n", c: "identités" },
      { fr: "identité", en: "identity", g: "f", t: "n", c: "identités" },
      { fr: "appartenance", en: "belonging", g: "f", t: "n", c: "identités" },
      { fr: "préjugé", en: "prejudice", g: "m", t: "n", c: "identités" },
      { fr: "stéréotype", en: "stereotype", g: "m", t: "n", c: "identités" },
      { fr: "laïcité", en: "secularism", g: "f", t: "n", c: "identités" },
      { fr: "banlieue", en: "suburb / outskirts", g: "f", t: "n", c: "identités" },
      // --- Science et technologie ---
      { fr: "recherche", en: "research", g: "f", t: "n", c: "science" },
      { fr: "découverte", en: "discovery", g: "f", t: "n", c: "science" },
      { fr: "intelligence artificielle", en: "artificial intelligence", g: "f", t: "n", c: "science" },
      { fr: "vaccin", en: "vaccine", g: "m", t: "n", c: "science" },
      { fr: "donnée", en: "piece of data", g: "f", t: "n", c: "science" },
      { fr: "vie privée", en: "privacy", g: "f", t: "n", c: "science" },
      { fr: "essor", en: "rapid growth / boom", g: "m", t: "n", c: "science" },
      { fr: "démarche", en: "approach / process", g: "f", t: "n", c: "science" },
      { fr: "constat", en: "finding / observation", g: "m", t: "n", c: "science" },
      { fr: "prise de conscience", en: "growing awareness", g: "f", t: "n", c: "science" },
      // --- Esthétique ---
      { fr: "esthétique", en: "aesthetics", g: "f", t: "n", c: "esthétique" },
      { fr: "beauté", en: "beauty", g: "f", t: "n", c: "esthétique" },
      { fr: "chef-d'œuvre", en: "masterpiece", g: "m", t: "n", c: "esthétique" },
      { fr: "goût", en: "taste", g: "m", t: "n", c: "esthétique" },
      { fr: "mise en scène", en: "staging / direction", g: "f", t: "n", c: "esthétique" },
      // --- Adjectifs ---
      { fr: "primordial", en: "of the utmost importance", g: null, t: "a", c: "adjectifs" },
      { fr: "durable", en: "sustainable / lasting", g: null, t: "a", c: "adjectifs" },
      { fr: "épanoui", en: "fulfilled / flourishing", g: null, t: "a", c: "adjectifs" },
      { fr: "nuancé", en: "nuanced", g: null, t: "a", c: "adjectifs" },
      { fr: "révélateur", en: "revealing / telling", g: null, t: "a", c: "adjectifs" },
      { fr: "accablant", en: "overwhelming / damning", g: null, t: "a", c: "adjectifs" },
      { fr: "répandu", en: "widespread", g: null, t: "a", c: "adjectifs" },
      // --- Verbes ---
      { fr: "s'épanouir", en: "to flourish / thrive", g: null, t: "v", c: "verbes" },
      { fr: "sensibiliser", en: "to raise awareness", g: null, t: "v", c: "verbes" },
      { fr: "nuire à", en: "to harm", g: null, t: "v", c: "verbes" },
      { fr: "favoriser", en: "to promote / encourage", g: null, t: "v", c: "verbes" },
      { fr: "entraîner", en: "to bring about", g: null, t: "v", c: "verbes" },
      { fr: "s'accroître", en: "to increase", g: null, t: "v", c: "verbes" },
      { fr: "remédier à", en: "to remedy", g: null, t: "v", c: "verbes" },
      { fr: "tirer parti de", en: "to make the most of", g: null, t: "v", c: "verbes" },
      { fr: "mettre en lumière", en: "to bring to light", g: null, t: "v", c: "verbes" },
      { fr: "témoigner de", en: "to bear witness to", g: null, t: "v", c: "verbes" },
      // --- Expressions de dissertation ---
      { fr: "il s'agit de", en: "it is a matter of", g: null, t: "e", c: "dissertation" },
      { fr: "à l'heure actuelle", en: "at the present time", g: null, t: "e", c: "dissertation" },
      { fr: "quoi qu'il en soit", en: "be that as it may", g: null, t: "e", c: "dissertation" },
      { fr: "au fur et à mesure", en: "gradually / as things progress", g: null, t: "e", c: "dissertation" },
      { fr: "faute de", en: "for lack of", g: null, t: "e", c: "dissertation" },
      { fr: "force est de constater", en: "one must admit", g: null, t: "e", c: "dissertation" },
      { fr: "tant bien que mal", en: "somehow or other", g: null, t: "e", c: "dissertation" },
      { fr: "avoir beau", en: "however much one may...", g: null, t: "e", c: "dissertation" },
      { fr: "à long terme", en: "in the long run", g: null, t: "e", c: "dissertation" },
      { fr: "en fin de compte", en: "ultimately", g: null, t: "e", c: "dissertation" }
    ]
  };

  var VOWELS = "aeiouâàéèêëîïôûùü";

  /** "livre" (m) -> "le livre" · "eau" (f) -> "l'eau" · "devoirs" -> "les devoirs" */
  function withArticle(item) {
    if (!item || item.t !== "n" || !item.g) return item ? item.fr : "";
    if (item.pl) return "les " + item.fr;
    var first = item.fr.charAt(0).toLowerCase();
    if (VOWELS.indexOf(first) !== -1) return "l'" + item.fr;
    return (item.g === "m" ? "le " : "la ") + item.fr;
  }

  /** Display form used everywhere a French word is shown. */
  function display(item) {
    return item.t === "n" ? withArticle(item) : item.fr;
  }

  /** True when the article would elide, i.e. the gender is invisible. */
  function elides(item) {
    return item.t === "n" && VOWELS.indexOf(item.fr.charAt(0).toLowerCase()) !== -1;
  }

  /* Same word for everyone on the same day, at the same level — so a class can
   * talk about it — and a different one tomorrow. */
  function wordOfTheDay(level, dateStr) {
    var pool = [];
    for (var i = 1; i <= level; i++) {
      (VOCAB[i] || []).forEach(function (item) { pool.push(item); });
    }
    if (!pool.length) return null;
    var key = (dateStr || (App.U ? App.U.today() : "")) + ":" + level;
    var seed = 7;
    for (var c = 0; c < key.length; c++) seed = (seed * 31 + key.charCodeAt(c)) % 100003;
    return pool[seed % pool.length];
  }

  App.Vocab = {
    byLevel: VOCAB,
    wordOfTheDay: wordOfTheDay,
    withArticle: withArticle,
    display: display,
    elides: elides,
    /** Everything a student at `level` has met so far (levels 1..level). */
    upTo: function (level) {
      var out = [];
      for (var i = 1; i <= level; i++) {
        (VOCAB[i] || []).forEach(function (item) {
          out.push(item);
        });
      }
      return out;
    },
    /** Weighted deck: current level appears most, earlier levels stay in rotation. */
    deck: function (level, opts) {
      opts = opts || {};
      var out = [];
      for (var i = 1; i <= level; i++) {
        var weight = i === level ? 3 : i === level - 1 ? 2 : 1;
        (VOCAB[i] || []).forEach(function (item) {
          if (opts.type && item.t !== opts.type) return;
          /* A plural-only noun takes "les" whichever gender it is, so asking
           * le or la about it has no right answer. */
          if (opts.nounsOnly && (item.t !== "n" || item.pl)) return;
          for (var w = 0; w < weight; w++) out.push(item);
        });
      }
      return out;
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Vocab;
})(typeof window !== "undefined" ? window : globalThis);
