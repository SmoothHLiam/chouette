/* Chouette ! — every sound is synthesised, so the game ships with zero assets. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var ctx = null;

  function context() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function enabled() {
    return App.State && App.State.profile.sound !== false;
  }

  /** One shaped note. type/from/to/dur/vol are all optional. */
  function note(opts) {
    if (!enabled()) return;
    var c = context();
    if (!c) return;
    var t0 = c.currentTime + (opts.delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    var dur = opts.dur || 0.14;
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.vol || 0.18, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function chord(freqs, opts) {
    freqs.forEach(function (f, i) {
      note({ from: f, dur: (opts && opts.dur) || 0.22, type: (opts && opts.type) || "triangle", vol: 0.12, delay: i * ((opts && opts.stagger) || 0.05) });
    });
  }

  function noise(dur, vol) {
    if (!enabled()) return;
    var c = context();
    if (!c) return;
    var frames = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, frames, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    var src = c.createBufferSource();
    var gain = c.createGain();
    gain.gain.value = vol || 0.08;
    src.buffer = buf;
    src.connect(gain).connect(c.destination);
    src.start();
  }

  App.Sound = {
    unlock: function () { context(); },
    click: function () { note({ from: 520, to: 700, dur: 0.06, type: "square", vol: 0.06 }); },
    correct: function (combo) {
      var step = Math.min(combo || 0, 10);
      note({ from: 520 * Math.pow(1.06, step), to: 900 * Math.pow(1.04, step), dur: 0.13, type: "triangle", vol: 0.16 });
      note({ from: 780 * Math.pow(1.06, step), dur: 0.1, type: "sine", vol: 0.08, delay: 0.05 });
    },
    wrong: function () {
      note({ from: 220, to: 120, dur: 0.24, type: "sawtooth", vol: 0.13 });
      noise(0.12, 0.05);
    },
    coin: function () {
      note({ from: 1100, dur: 0.07, type: "square", vol: 0.09 });
      note({ from: 1650, dur: 0.12, type: "square", vol: 0.09, delay: 0.06 });
    },
    tick: function () { note({ from: 900, dur: 0.04, type: "square", vol: 0.05 }); },
    start: function () { chord([392, 523, 659], { stagger: 0.06 }); },
    win: function () { chord([523, 659, 784, 1046], { stagger: 0.08, dur: 0.3 }); },
    lose: function () { chord([330, 262, 196], { stagger: 0.11, dur: 0.3, type: "sawtooth" }); },
    levelUp: function () { chord([523, 659, 784, 1046, 1318], { stagger: 0.07, dur: 0.35 }); },
    hit: function () { note({ from: 160, to: 60, dur: 0.18, type: "square", vol: 0.14 }); noise(0.16, 0.07); },
    hurt: function () { note({ from: 300, to: 90, dur: 0.3, type: "sawtooth", vol: 0.15 }); }
  };
})(typeof window !== "undefined" ? window : globalThis);
