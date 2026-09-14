/* Le mur des badges. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("badges", function (host) {
    var p = App.State.profile;
    host.appendChild(App.UI.topBar({ back: App.UI.homeScreen() }));

    var wrap = U.el("div", "badges-page");
    wrap.appendChild(U.el("h2", "page-title", "🏅 Tes badges"));
    var earned = App.Achievements.earnedCount();
    wrap.appendChild(U.el("p", "page-sub", earned + " sur " + App.Achievements.list.length + " débloqués."));

    var grid = U.el("div", "badge-grid");
    App.Achievements.list.forEach(function (a) {
      var got = !!p.achievements[a.id];
      var card = U.el("div", "badge" + (got ? " earned" : " locked"));
      card.appendChild(U.el("span", "badge-icon", got ? a.icon : "🔒"));
      card.appendChild(U.el("strong", null, a.name));
      card.appendChild(U.el("small", null, a.desc));
      if (got) {
        var d = new Date(p.achievements[a.id]);
        card.appendChild(U.el("em", "badge-date", d.toLocaleDateString("fr-FR")));
      }
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    host.appendChild(wrap);
  });
})(typeof window !== "undefined" ? window : globalThis);
