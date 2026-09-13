/* Chouette ! — confetti, floating score pops and screen shake. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var canvas = null, ctx = null, parts = [], raf = null, resizeBound = false;

  function ensureCanvas() {
    // Checking isConnected rather than just the reference: a canvas detached
    // from the document would otherwise leave effects silently dead forever.
    if (canvas && canvas.isConnected) return;
    canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    if (!resizeBound) {
      global.addEventListener("resize", resize);
      resizeBound = true;
    }
  }

  function resize() {
    if (!canvas) return;
    var dpr = global.devicePixelRatio || 1;
    canvas.width = global.innerWidth * dpr;
    canvas.height = global.innerHeight * dpr;
    canvas.style.width = global.innerWidth + "px";
    canvas.style.height = global.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var PALETTE = ["#4f7bff", "#ffc857", "#ff4d6d", "#2ee6a8", "#b58bff", "#ffffff"];

  /* "Calmes" in the settings suppresses the decorative effects. Score pops and
   * the shake on a wrong answer stay: those carry information, not confetti. */
  function calm() {
    return document.documentElement.getAttribute("data-motion") === "calm";
  }

  function burst(x, y, count, power) {
    if (calm()) return;
    ensureCanvas();
    count = count || 26;
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = (0.6 + Math.random()) * (power || 6);
      parts.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        life: 1
      });
    }
    if (!raf) raf = requestAnimationFrame(step);
  }

  function step() {
    ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += 0.28;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.011;
      if (p.life <= 0 || p.y > global.innerHeight + 40) { parts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(step);
    else { raf = null; ctx.clearRect(0, 0, global.innerWidth, global.innerHeight); }
  }

  App.FX = {
    burstAt: function (node, count) {
      if (!node) return;
      var r = node.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, count);
    },
    burstXY: burst,
    rain: function (count) {
      if (calm()) return;
      ensureCanvas();
      for (var i = 0; i < (count || 60); i++) {
        parts.push({
          x: Math.random() * global.innerWidth,
          y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 2,
          vy: 1 + Math.random() * 3,
          size: 5 + Math.random() * 7,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.25,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          life: 1.6
        });
      }
      if (!raf) raf = requestAnimationFrame(step);
    },
    /** A "+40 XP" style label that floats up and fades. */
    pop: function (node, text, kind) {
      if (!node) return;
      var span = document.createElement("span");
      span.className = "fx-pop " + (kind || "");
      span.textContent = text;
      var r = node.getBoundingClientRect();
      span.style.left = (r.left + r.width / 2) + "px";
      span.style.top = (r.top + r.height / 2) + "px";
      document.body.appendChild(span);
      setTimeout(function () { span.remove(); }, 900);
    },
    shake: function (node, strong) {
      if (!node) return;
      var cls = strong ? "shake-hard" : "shake";
      node.classList.remove(cls);
      void node.offsetWidth;
      node.classList.add(cls);
      setTimeout(function () { node.classList.remove(cls); }, 500);
    },
    flash: function (kind) {
      if (calm()) return;
      var f = document.createElement("div");
      f.className = "fx-flash fx-flash-" + kind;
      document.body.appendChild(f);
      setTimeout(function () { f.remove(); }, 380);
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
