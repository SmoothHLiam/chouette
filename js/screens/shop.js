/* La Boutique — croissants buy themes and avatars. Pure cosmetics, pure motive. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  App.Router.register("shop", function (host) {
    var p = App.State.profile;
    host.appendChild(App.UI.topBar({ back: App.UI.homeScreen() }));

    var wrap = U.el("div", "shop");
    wrap.appendChild(U.el("h2", "page-title", "🛍️ La Boutique"));
    wrap.appendChild(U.el("p", "page-sub",
      "Gagne des croissants en jouant, dépense-les en style. Rien ici ne rend le jeu plus facile — juste plus beau."));

    /* ----------------------------------------------------------- themes -- */
    wrap.appendChild(U.el("h3", "shop-head", "Thèmes"));
    if (App.Skin.get("skin") !== "colorful") {
      wrap.appendChild(U.el("p", "class-hint",
        "Tu es en mode minimal, qui a sa propre palette claire : les thèmes " +
        "s'appliqueront dès que tu repasseras en mode coloré (Réglages → Apparence)."));
    }
    var themeGrid = U.el("div", "shop-grid");
    App.THEMES.forEach(function (t) {
      var owned = App.State.owns("themes", t.id);
      var active = p.theme === t.id;
      var card = U.el("button", "shop-card" + (active ? " active" : "") + (owned ? " owned" : ""));
      var strip = U.el("div", "swatch");
      t.swatch.forEach(function (c) {
        var s = U.el("span");
        s.style.background = c;
        strip.appendChild(s);
      });
      card.appendChild(strip);
      card.appendChild(U.el("strong", null, t.name));
      card.appendChild(U.el("small", null, active ? "Utilisé" : owned ? "Débloqué" : "🥐 " + t.cost));
      card.addEventListener("click", function () {
        if (!owned) {
          var res = App.State.buy("themes", t.id, t.cost);
          if (res === "poor") { App.UI.toast("Pas assez de croissants — il t'en manque " + (t.cost - p.coins) + ".", "🥐"); return; }
          App.Sound.coin();
          App.UI.toast("Thème débloqué : " + t.name, "🎨", "good");
        } else {
          App.Sound.click();
        }
        p.theme = t.id;
        App.UI.applyTheme(t.id);
        App.State.save();
        App.Router.go("shop");
      });
      themeGrid.appendChild(card);
    });
    wrap.appendChild(themeGrid);

    /* ---------------------------------------------------------- avatars -- */
    wrap.appendChild(U.el("h3", "shop-head", "Avatars"));
    var avatarGrid = U.el("div", "avatar-grid");
    App.AVATARS.forEach(function (a) {
      var owned = App.State.owns("avatars", a.id);
      var active = p.avatar === a.id;
      var card = U.el("button", "avatar-card" + (active ? " active" : "") + (owned ? " owned" : ""));
      card.appendChild(U.el("span", "avatar-face", a.id));
      card.appendChild(U.el("small", null, active ? "Utilisé" : owned ? "✓" : "🥐 " + a.cost));
      card.addEventListener("click", function () {
        if (!owned) {
          var res = App.State.buy("avatars", a.id, a.cost);
          if (res === "poor") { App.UI.toast("Pas assez de croissants — il t'en manque " + (a.cost - p.coins) + ".", "🥐"); return; }
          App.Sound.coin();
          App.FX.burstAt(card, 24);
        } else {
          App.Sound.click();
        }
        p.avatar = a.id;
        App.State.save();
        App.Router.go("shop");
      });
      avatarGrid.appendChild(card);
    });
    wrap.appendChild(avatarGrid);

    host.appendChild(wrap);
  });
})(typeof window !== "undefined" ? window : globalThis);
