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
    who.appendChild(U.el("span", "who-avatar", p.avatar));
    var whoText = U.el("span", "who-text");
    whoText.appendChild(U.el("strong", null, rank.icon + " " + rank.name));
    whoText.appendChild(U.el("small", null, App.LEVELS[(p.level || 1) - 1].label));
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

  function applyTheme(id) {
    document.documentElement.setAttribute("data-theme", id || "nuit");
  }

  App.UI = {
    owl: owl,
    bigButton: bigButton,
    toast: toast,
    modal: modal,
    topBar: topBar,
    progressRing: progressRing,
    applyTheme: applyTheme
  };
})(typeof window !== "undefined" ? window : globalThis);
