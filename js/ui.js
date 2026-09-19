/* Chouette ! — shared widgets: the mascot, the top bar, toasts and modals. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;

  /** The mascot. `mood` swaps the expression: normal / happy / sad / think. */
  function owl(mood, size) {
    var wrap = U.el("div", "owl owl-" + (mood || "normal"));
    wrap.style.width = (size || 96) + "px";
    wrap.innerHTML = [
      '<svg viewBox="0 0 120 120" aria-hidden="true">',
      '  <ellipse cx="60" cy="104" rx="30" ry="7" class="owl-shadow"/>',
      '  <path d="M28 34 L20 10 L44 22 Z" class="owl-tuft"/>',
      '  <path d="M92 34 L100 10 L76 22 Z" class="owl-tuft"/>',
      '  <ellipse cx="60" cy="62" rx="42" ry="44" class="owl-body"/>',
      '  <ellipse cx="60" cy="76" rx="27" ry="28" class="owl-belly"/>',
      '  <g class="owl-eyes">',
      '    <circle cx="43" cy="52" r="17" class="owl-eye-white"/>',
      '    <circle cx="77" cy="52" r="17" class="owl-eye-white"/>',
      '    <circle cx="45" cy="54" r="8" class="owl-pupil"/>',
      '    <circle cx="79" cy="54" r="8" class="owl-pupil"/>',
      '    <circle cx="48" cy="51" r="3" class="owl-glint"/>',
      '    <circle cx="82" cy="51" r="3" class="owl-glint"/>',
      '  </g>',
      '  <path d="M60 62 L52 72 L68 72 Z" class="owl-beak"/>',
      '  <path d="M22 70 q-10 14 4 26" class="owl-wing"/>',
      '  <path d="M98 70 q10 14 -4 26" class="owl-wing"/>',
      '</svg>'
    ].join("");
    return wrap;
  }

  /* The show/hide eye every password field has. Drawn rather than borrowed:
   * 👁 renders as a different creature on every platform and as a full-colour
   * cartoon on some, which is not what a control looks like. These are plain
   * strokes that take their colour from the text around them. */
  var EYE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/>' +
    '<circle cx="12" cy="12" r="3.2"/></svg>';

  var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M9.9 5.7A10.6 10.6 0 0 1 12 5.5c6.2 0 10 6.5 10 6.5a19 19 0 0 1-3.3 4.1"/>' +
    '<path d="M6.3 7.9A18.6 18.6 0 0 0 2 12s3.8 6.5 10 6.5c1.5 0 2.8-.3 4-.8"/>' +
    '<path d="M9.8 9.8a3.2 3.2 0 0 0 4.4 4.4"/>' +
    '<path d="M3.5 3.5l17 17"/></svg>';

  /**
   * A button that reveals or hides something. `onToggle(shown)` does the
   * revealing; this only owns the icon and the label screen readers hear.
   */
  function eyeToggle(onToggle, opts) {
    opts = opts || {};
    var shown = !!opts.shown;
    var b = U.el("button", "eye-btn");
    b.type = "button";
    function paint() {
      b.innerHTML = shown ? EYE_OFF : EYE;
      var label = shown ? (opts.hideLabel || "Masquer") : (opts.showLabel || "Afficher");
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-pressed", shown ? "true" : "false");
      b.title = label;
    }
    paint();
    b.addEventListener("click", function () {
      shown = !shown;
      paint();
      if (App.Sound) App.Sound.click();
      onToggle(shown);
    });
    return b;
  }

  function bigButton(label, opts) {
    opts = opts || {};
    var b = U.el("button", "btn " + (opts.variant ? "btn-" + opts.variant : "btn-primary"));
    if (opts.icon) b.appendChild(U.el("span", "btn-icon", opts.icon));
    b.appendChild(U.el("span", "btn-label", label));
    if (opts.onClick) {
      b.addEventListener("click", function (e) {
        App.Sound.click();
        opts.onClick(e);
      });
    }
    if (opts.disabled) b.disabled = true;
    return b;
  }

  var toastHost = null;

  function toast(message, icon, kind) {
    if (!toastHost) {
      toastHost = U.el("div", "toast-host");
      document.body.appendChild(toastHost);
    }
    var t = U.el("div", "toast " + (kind || ""));
    if (icon) t.appendChild(U.el("span", "toast-icon", icon));
    t.appendChild(U.el("span", "toast-text", message));
    toastHost.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  function modal(build) {
    var back = U.el("div", "modal-back");
    var box = U.el("div", "modal");
    back.appendChild(box);
    document.body.appendChild(back);
    function close() { back.classList.add("out"); setTimeout(function () { back.remove(); }, 220); }
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    build(box, close);
    return close;
  }

  /** The persistent player strip: avatar, rank, XP bar, croissants, streak. */
  function topBar(opts) {
    opts = opts || {};
    var p = App.State.profile;
    var rank = App.rankFor(p.xp);
    var next = App.nextRank(p.xp);
    var bar = U.el("header", "topbar");

    var who = U.el("button", "who");
    var face = U.el("span", "who-avatar", p.avatar);
    if (p.role === "teacher") face.classList.add("is-teacher");
    who.appendChild(face);
    var whoText = U.el("span", "who-text");
    whoText.appendChild(U.el("strong", null, rank.icon + " " + rank.name));
    // The class name already tells you the year; showing both just repeats it.
    var klass = p.classCode && App.School ? App.School.get(p.classCode) : null;
    whoText.appendChild(U.el("small", null,
      klass ? klass.name : App.LEVELS[(p.level || 1) - 1].label));
    who.appendChild(whoText);
    who.addEventListener("click", function () { App.Sound.click(); App.Router.go("profile"); });

    var xpWrap = U.el("div", "xp-wrap");
    var xpBar = U.el("div", "xp-bar");
    var xpFill = U.el("div", "xp-fill");
    xpFill.style.width = (App.rankProgress(p.xp) * 100).toFixed(1) + "%";
    xpBar.appendChild(xpFill);
    xpWrap.appendChild(xpBar);
    xpWrap.appendChild(U.el("small", "xp-text",
      next ? p.xp + " / " + next.xp + " XP → " + next.icon + " " + next.name
           : p.xp + " XP · rang maximum !"));

    var stats = U.el("div", "topstats");
    var coins = U.el("div", "chip chip-coin");
    coins.innerHTML = '<span>🥐</span><b>' + p.coins + "</b>";
    coins.title = "Croissants";
    var streak = U.el("div", "chip chip-streak" + (App.State.streakAlive() && p.streak > 0 ? " hot" : ""));
    streak.innerHTML = '<span>🔥</span><b>' + p.streak + "</b>";
    streak.title = "Série de jours";
    stats.appendChild(coins);
    stats.appendChild(streak);

    bar.appendChild(who);
    bar.appendChild(xpWrap);
    bar.appendChild(stats);
    if (opts.back) {
      var back = U.el("button", "icon-btn back-btn", "←");
      back.setAttribute("aria-label", "Retour");
      back.addEventListener("click", function () { App.Sound.click(); App.Router.go(opts.back); });
      bar.insertBefore(back, bar.firstChild);
    }
    return bar;
  }

  function progressRing(pct, label) {
    var box = U.el("div", "ring");
    box.style.setProperty("--pct", Math.round(pct * 100));
    box.appendChild(U.el("span", "ring-label", label));
    return box;
  }

  /* The same shortcuts on the student home and the teacher dashboard, defined
   * once so a fifth one is added in a single place. */
  var NAV_LINKS = [
    { icon: "🛍️", label: "Boutique", screen: "shop" },
    { icon: "🏅", label: "Badges", screen: "badges" },
    { icon: "📊", label: "Profil", screen: "profile" },
    { icon: "⚙️", label: "Réglages", screen: "settings" }
  ];

  /** The screen a person considers "home": their dashboard, by role. */
  function homeScreen() {
    return App.State.profile.role === "teacher" ? "teacher" : "home";
  }

  /** Pass the screen you are already on to leave it out of the row. */
  function navRow(exclude) {
    var row = U.el("div", "action-row");
    NAV_LINKS.forEach(function (link) {
      if (link.screen === exclude) return;
      var b = U.el("button", "mini-card");
      b.appendChild(U.el("span", "mini-icon", link.icon));
      b.appendChild(U.el("span", "mini-label", link.label));
      b.addEventListener("click", function () {
        App.Sound.click();
        App.Router.go(link.screen);
      });
      row.appendChild(b);
    });
    return row;
  }

  /** Best-effort clipboard copy — falls back to selecting the text for file://
   *  pages and older browsers, where the async clipboard API is unavailable. */
  function copy(text, label) {
    function done() { App.UI.toast((label || "Copié") + " ✓", "📋", "good"); }
    function manual() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      if (ok) done();
      else App.UI.toast("Copie impossible — sélectionne le code à la main.", "📋");
    }
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(text).then(done, manual);
      return;
    }
    manual();
  }

  function applyTheme(id) {
    document.documentElement.setAttribute("data-theme", id || "nuit");
  }

  App.UI = {
    owl: owl,
    eyeToggle: eyeToggle,
    bigButton: bigButton,
    toast: toast,
    modal: modal,
    topBar: topBar,
    navRow: navRow,
    homeScreen: homeScreen,
    navLinks: NAV_LINKS,
    progressRing: progressRing,
    copy: copy,
    applyTheme: applyTheme
  };
})(typeof window !== "undefined" ? window : globalThis);
