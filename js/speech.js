/* Chouette ! — French text-to-speech.
 *
 * The rule this file exists to enforce: French is NEVER read by an English
 * voice. A default voice pronouncing "Je m'appelle" as English teaches the
 * wrong sounds, so when no French voice is installed the app says so and shows
 * the text instead of faking it. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var synth = global.speechSynthesis;

  var frenchVoices = [];
  var resolved = false;
  var listeners = [];
  var warned = false;

  /* Voice names that are French even when the reported lang is odd. */
  var FRENCH_NAME = /fran[çc]ais|french|\bfr[-_]/i;
  /* Well-known French system voices, by platform. */
  var KNOWN_FRENCH = /(thomas|am[ée]lie|audrey|aur[ée]lie|marie|hortense|virginie|nicolas|chantal|c[ée]line|julie|paul|jacques|denise|henri|alice)/i;

  function langOf(v) {
    return (v.lang || "").toLowerCase().replace("_", "-");
  }

  function isFrench(v) {
    return langOf(v).indexOf("fr") === 0 || FRENCH_NAME.test(v.name || "");
  }

  /** Higher is better: metropolitan French first, then other francophone
   *  regions; offline voices tend to be faster and better than novelty ones. */
  function score(v) {
    var lang = langOf(v);
    var s = 0;
    if (lang === "fr-fr") s += 100;
    else if (lang.indexOf("fr-") === 0) s += 70;      // fr-CA, fr-BE, fr-CH
    else if (lang.indexOf("fr") === 0) s += 60;
    else s += 20;                                     // matched on the name only
    if (/google/i.test(v.name || "")) s += 25;
    if (KNOWN_FRENCH.test(v.name || "")) s += 15;
    if (v.localService) s += 10;
    if (/compact|eloquence|novelty|whisper|bells|organ/i.test(v.name || "")) s -= 40;
    return s;
  }

  function collect() {
    if (!synth) return;
    var all = [];
    try { all = synth.getVoices() || []; } catch (e) { all = []; }
    if (!all.length) return;                          // voices are still loading
    frenchVoices = all.filter(isFrench).sort(function (a, b) { return score(b) - score(a); });
    resolved = true;
    var fns = listeners.slice();
    listeners.length = 0;
    fns.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
  }

  if (synth) {
    collect();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", collect);
    } else {
      synth.onvoiceschanged = collect;
    }
    // Safari and some Android builds never fire voiceschanged; poll briefly.
    var tries = 0;
    var poll = setInterval(function () {
      tries++;
      if (frenchVoices.length || tries > 20) { clearInterval(poll); return; }
      collect();
    }, 250);
  }

  /** The voice we will actually speak with: the teacher's pick, else the best. */
  function chosen() {
    if (!frenchVoices.length) return null;
    var wanted = App.State && App.State.profile ? App.State.profile.voiceURI : null;
    if (wanted) {
      for (var i = 0; i < frenchVoices.length; i++) {
        if (frenchVoices[i].voiceURI === wanted) return frenchVoices[i];
      }
    }
    return frenchVoices[0];
  }

  App.Speech = {
    /** The browser has a speech engine at all. */
    supported: function () { return !!synth; },
    /** A French voice is installed — the only case where we speak. */
    ready: function () { return !!chosen(); },
    /** Voices have finished loading (they arrive asynchronously). */
    resolved: function () { return resolved; },
    /** Every French voice on this device, best first. */
    voices: function () { return frenchVoices.slice(); },
    current: function () { return chosen(); },
    /** Run `fn` once the voice list is known (or immediately if it already is). */
    onReady: function (fn) {
      if (resolved) { fn(); return; }
      listeners.push(fn);
    },
    setVoice: function (uri) {
      if (!App.State || !App.State.profile) return;
      App.State.profile.voiceURI = uri || null;
      App.State.save();
    },
    warm: collect,

    /** Speaks French, or returns false and explains why it stayed quiet. */
    say: function (text, opts) {
      if (!synth) return false;
      if (App.State && App.State.profile && App.State.profile.voice === false) return false;
      var voice = chosen();
      if (!voice) {
        // Deliberately silent: an English voice would teach the wrong sounds.
        if (!warned && App.UI && resolved) {
          warned = true;
          App.UI.toast("Aucune voix française installée — le texte s'affiche à la place.", "🔇");
        }
        return false;
      }
      opts = opts || {};
      try { synth.cancel(); } catch (e) { /* ignore */ }
      var u = new global.SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang || "fr-FR";
      u.rate = opts.rate || 0.9;
      u.pitch = opts.pitch || 1;
      try { synth.speak(u); } catch (e) { return false; }
      return true;
    },

    stop: function () {
      if (!synth) return;
      try { synth.cancel(); } catch (e) { /* ignore */ }
    },

    /** Human-readable label for the settings screen. */
    describe: function () {
      var v = chosen();
      if (!synth) return "Cet appareil n'a pas de synthèse vocale.";
      if (!resolved) return "Recherche des voix…";
      if (!v) return "Aucune voix française installée sur cet appareil.";
      return v.name + " (" + (v.lang || "fr") + ")";
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
