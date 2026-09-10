/* Chouette ! — three daily missions, rerolled every morning. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  var POOL = [
    { id: "correct25", text: "Réponds correctement 25 fois", goal: 25, metric: "correct", coins: 60, xp: 40, icon: "✅" },
    { id: "correct40", text: "Réponds correctement 40 fois", goal: 40, metric: "correct", coins: 90, xp: 60, icon: "✅" },
    { id: "play3", text: "Joue 3 parties", goal: 3, metric: "sessions", coins: 50, xp: 30, icon: "🎲" },
    { id: "combo8", text: "Atteins un combo de 8", goal: 8, metric: "bestCombo", coins: 70, xp: 40, icon: "🔥" },
    { id: "combo15", text: "Atteins un combo de 15", goal: 15, metric: "bestCombo", coins: 110, xp: 70, icon: "☄️" },
    { id: "xp250", text: "Gagne 250 XP aujourd'hui", goal: 250, metric: "xp", coins: 80, xp: 0, icon: "⭐" },
    { id: "games2", text: "Essaie 2 jeux différents", goal: 2, metric: "distinct", coins: 60, xp: 40, icon: "🕹️" },
    { id: "boss1", text: "Bats un boss", goal: 1, metric: "bosses", coins: 120, xp: 80, icon: "🐲" },
    { id: "perfect1", text: "Termine une partie sans faute", goal: 1, metric: "perfects", coins: 100, xp: 60, icon: "🎯" },
    { id: "revision1", text: "Fais une session de révision", goal: 1, metric: "reviews", coins: 80, xp: 50, icon: "🔁" }
  ];

  function byId(id) {
    for (var i = 0; i < POOL.length; i++) if (POOL[i].id === id) return POOL[i];
    return null;
  }

  /** Deterministic pick of the day, so the three missions feel "assigned". */
  function rollFor(dateStr) {
    var seed = 0, i;
    for (i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) % 100003;
    var picked = [], used = {};
    while (picked.length < 3) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      var idx = seed % POOL.length;
      if (used[idx]) { seed += 7; continue; }
      used[idx] = 1;
      picked.push({ id: POOL[idx].id, progress: 0, done: false });
    }
    return picked;
  }

  function ensureToday() {
    var p = App.State.profile;
    var t = U.today();
    if (!p.quests || p.quests.date !== t) {
      p.quests = { date: t, items: rollFor(t), seenGames: [] };
      App.State.save();
    }
    if (!p.quests.seenGames) p.quests.seenGames = [];
    return p.quests;
  }

  /** Folds one finished session into today's missions.
   *  Returns the quests completed by this session. */
  function apply(session) {
    var q = ensureToday();
    var p = App.State.profile;
    if (q.seenGames.indexOf(session.gameId) === -1) q.seenGames.push(session.gameId);

    var completed = [];
    q.items.forEach(function (item) {
      if (item.done) return;
      var def = byId(item.id);
      if (!def) return;
      switch (def.metric) {
        case "correct": item.progress += session.correct; break;
        case "sessions": item.progress += 1; break;
        case "bestCombo": item.progress = Math.max(item.progress, session.bestCombo); break;
        case "xp": item.progress += session.xp; break;
        case "distinct": item.progress = q.seenGames.length; break;
        case "bosses": item.progress += session.bossBeaten ? 1 : 0; break;
        case "perfects": item.progress += session.perfect && session.total >= 6 ? 1 : 0; break;
        case "reviews": item.progress += session.gameId === "revision" ? 1 : 0; break;
      }
      if (item.progress >= def.goal) {
        item.done = true;
        item.progress = def.goal;
        p.coins += def.coins;
        p.xp += def.xp;
        completed.push(def);
      }
    });
    App.State.save();
    return completed;
  }

  App.Quests = {
    pool: POOL,
    byId: byId,
    ensureToday: ensureToday,
    apply: apply,
    /** Today's missions, joined with their definitions for rendering. */
    today: function () {
      var q = ensureToday();
      return q.items.map(function (item) {
        var def = byId(item.id) || {};
        return {
          id: item.id, text: def.text, icon: def.icon, goal: def.goal,
          coins: def.coins, xp: def.xp,
          progress: Math.min(item.progress, def.goal || 1), done: item.done
        };
      });
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
