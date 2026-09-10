/* Chouette ! — French text-to-speech through the browser's own voices. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var synth = global.speechSynthesis;
  var cached = null;

  function frenchVoice() {
    if (!synth) return null;
    if (cached) return cached;
    var voices = synth.getVoices() || [];
    var best = null;
    voices.forEach(function (v) {
      var lang = (v.lang || "").toLowerCase().replace("_", "-");
      if (lang.indexOf("fr") !== 0) return;
      if (!best) best = v;
      if (lang === "fr-fr" && (!best || (best.lang || "").toLowerCase() !== "fr-fr")) best = v;
    });
    cached = best;
    return best;
  }

  if (synth && typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", function () { cached = null; frenchVoice(); });
  }

  App.Speech = {
    /** True when the device has a French voice installed. */
    ready: function () { return !!(synth && frenchVoice()); },
    supported: function () { return !!synth; },
    warm: function () { frenchVoice(); },
    say: function (text, opts) {
      if (!synth) return false;
      if (App.State && App.State.profile.voice === false) return false;
      opts = opts || {};
      try { synth.cancel(); } catch (e) { /* ignore */ }
      var u = new global.SpeechSynthesisUtterance(text);
      var v = frenchVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : "fr-FR";
      u.rate = opts.rate || 0.92;
      u.pitch = opts.pitch || 1;
      synth.speak(u);
      return true;
    },
    stop: function () { if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } } }
  };
})(typeof window !== "undefined" ? window : globalThis);
