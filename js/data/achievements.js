/* Chouette ! — badges. Each `test` gets the profile and the session that just
 * ended, and returns true the moment the badge should unlock. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var LIST = [
    { id: "premiers-pas", icon: "🐣", name: "Premiers Pas", desc: "Termine ta première partie.",
      test: function (p) { return p.stats.sessions >= 1; } },
    { id: "cent-bonnes", icon: "💯", name: "Cent Fois Bravo", desc: "100 bonnes réponses au total.",
      test: function (p) { return p.stats.correct >= 100; } },
    { id: "mille-xp", icon: "⭐", name: "Mille et Un XP", desc: "Accumule 1 000 XP.",
      test: function (p) { return p.xp >= 1000; } },
    { id: "combo-10", icon: "🔥", name: "En Feu", desc: "Atteins un combo de 10.",
      test: function (p, s) { return s && s.bestCombo >= 10; } },
    { id: "combo-20", icon: "☄️", name: "Comète", desc: "Atteins un combo de 20.",
      test: function (p, s) { return s && s.bestCombo >= 20; } },
    { id: "sans-faute", icon: "🎯", name: "Sans Faute", desc: "Une partie parfaite (10 réponses ou plus).",
      test: function (p, s) { return s && s.perfect && s.total >= 10; } },
    { id: "premier-boss", icon: "🐲", name: "Tombeur de Boss", desc: "Bats ton premier boss.",
      test: function (p) { return p.stats.bosses >= 1; } },
    { id: "cinq-boss", icon: "🏆", name: "Chasseur de Boss", desc: "Bats 5 boss.",
      test: function (p) { return p.stats.bosses >= 5; } },
    { id: "streak-3", icon: "📅", name: "Trois Jours", desc: "Une série de 3 jours.",
      test: function (p) { return p.streak >= 3; } },
    { id: "streak-7", icon: "🗓️", name: "Semaine Complète", desc: "Une série de 7 jours.",
      test: function (p) { return p.streak >= 7; } },
    { id: "streak-30", icon: "🌙", name: "Un Mois de Français", desc: "Une série de 30 jours.",
      test: function (p) { return p.streak >= 30; } },
    { id: "touche-a-tout", icon: "🎮", name: "Touche-à-Tout", desc: "Essaie tous les jeux.",
      test: function (p) {
        var played = App.Games.playable().filter(function (g) { return p.games[g.id]; });
        return played.length >= App.Games.playable().length;
      } },
    { id: "noctambule", icon: "🌜", name: "Noctambule", desc: "Joue après 23 h.",
      test: function () { return new Date().getHours() >= 23; } },
    { id: "leve-tot", icon: "🌅", name: "Lève-Tôt", desc: "Joue avant 7 h du matin.",
      test: function () { return new Date().getHours() < 7; } },
    { id: "reviseur", icon: "🔁", name: "Réviseur", desc: "Termine une session de révision.",
      test: function (p, s) { return s && s.gameId === "revision"; } },
    { id: "shopping", icon: "🛍️", name: "Shopping à Paris", desc: "Achète un thème ou un avatar.",
      test: function (p) { return p.unlocked.themes.length + p.unlocked.avatars.length > 2; } },
    { id: "eclair", icon: "⚡", name: "Éclair", desc: "20 bonnes réponses en une partie d'Éclair Rapide.",
      test: function (p, s) { return s && s.gameId === "eclair" && s.correct >= 20; } },
    { id: "ap-pret", icon: "🎓", name: "Prêt pour l'AP", desc: "Deviens Chouette Savante en French 5.",
      test: function (p) { return p.level === 5 && App.rankIndex(p.xp) >= 6; } }
  ];

  App.Achievements = {
    list: LIST,
    /** Unlocks anything newly earned and returns those badges. */
    check: function (session) {
      var p = App.State.profile;
      var earned = [];
      LIST.forEach(function (a) {
        if (p.achievements[a.id]) return;
        var ok = false;
        try { ok = a.test(p, session); } catch (e) { ok = false; }
        if (ok) {
          p.achievements[a.id] = new Date().toISOString();
          earned.push(a);
        }
      });
      return earned;
    },
    earnedCount: function () {
      return Object.keys(App.State.profile.achievements).length;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
