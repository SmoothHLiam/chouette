/* Chouette ! — hearing the student, not just speaking at them.
 *
 * The browser's own SpeechRecognition, set to fr-FR. It is free: no key, no
 * service, no bill, nothing sent anywhere by us. What it is not is universal —
 * Chrome and Safari have it behind a prefix, Firefox does not, and Chrome's
 * implementation sends the audio to Google's servers, so it also needs a
 * network. So this module's first job is to answer, honestly, whether it can
 * work at all; the game built on it disappears when the answer is no, exactly
 * as the French voice stays silent rather than read French in an English
 * accent.
 *
 * Nothing that counts for a grade is ever allowed to depend on it.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  function Engine() {
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }

  /** The browser has the API. Says nothing about microphones or permission. */
  function supported() {
    return !!Engine() && !!(global.navigator && global.navigator.mediaDevices);
  }

  /* Chrome's recogniser is a network service. Offline, it fails with an error
   * the student cannot act on, so do not offer it. */
  function ready() {
    if (!supported()) return false;
    if (global.navigator && global.navigator.onLine === false) return false;
    return true;
  }

  /** Why it is not on offer, in one sentence a student can read. */
  function why() {
    if (!Engine()) {
      return "Ce navigateur ne sait pas écouter. Chrome, Edge ou Safari le font.";
    }
    if (global.navigator && global.navigator.onLine === false) {
      return "L'écoute a besoin d'une connexion. Le reste du jeu marche hors ligne.";
    }
    return "";
  }

  var MESSAGES = {
    "not-allowed": "Le micro est bloqué. Autorise-le dans les réglages du navigateur.",
    "service-not-allowed": "Le micro est bloqué. Autorise-le dans les réglages du navigateur.",
    "no-speech": "Je n'ai rien entendu. Approche-toi du micro et réessaie.",
    "audio-capture": "Aucun micro trouvé sur cet appareil.",
    "network": "L'écoute a besoin d'une connexion pour fonctionner.",
    "aborted": ""
  };

  /**
   * Listens once and calls back with everything it thought it heard, best
   * first. Returns a function that stops it.
   */
  function listen(opts) {
    opts = opts || {};
    var Recognition = Engine();
    if (!Recognition) {
      if (opts.onError) opts.onError(why());
      return function () {};
    }

    var rec = new Recognition();
    rec.lang = opts.lang || "fr-FR";
    rec.interimResults = false;
    rec.maxAlternatives = 5;      // French homophones: give the judge options
    rec.continuous = false;

    var done = false;
    function finish() {
      if (done) return true;
      done = true;
      return false;
    }

    rec.onresult = function (event) {
      var heard = [];
      for (var i = 0; i < event.results.length; i++) {
        var result = event.results[i];
        for (var j = 0; j < result.length; j++) {
          if (result[j] && result[j].transcript) heard.push(result[j].transcript);
        }
      }
      if (finish()) return;
      if (opts.onResult) opts.onResult(heard);
    };

    rec.onerror = function (event) {
      var code = event && event.error;
      if (code === "aborted" && done) return;      // we stopped it on purpose
      if (finish()) return;
      var message = MESSAGES.hasOwnProperty(code) ? MESSAGES[code] : "L'écoute a échoué. Réessaie.";
      if (opts.onError) opts.onError(message, code);
    };

    rec.onend = function () {
      if (opts.onEnd) opts.onEnd();
      if (finish()) return;
      /* Ended with nothing at all: same situation as hearing silence. */
      if (opts.onError) opts.onError(MESSAGES["no-speech"], "no-speech");
    };

    try {
      rec.start();
    } catch (e) {
      if (!finish() && opts.onError) opts.onError("L'écoute a échoué. Réessaie.");
      return function () {};
    }

    return function stop() {
      done = true;
      try { rec.abort(); } catch (e) { /* already finished */ }
    };
  }

  /* ---------------------------------------------------------- judging -- */

  var ARTICLE = /^(l'|les|la|le|une|un|des|du|de la|de l')\s*/i;

  /** Down to what actually matters: letters, lowercase, no accents. */
  function bare(text) {
    var flat = App.U ? App.U.normalize(String(text || "")) : String(text || "").toLowerCase();
    return flat.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  /* A final -s or -x is silent in French: "le livre" and "le livres" are the
   * same sound, and the recogniser is choosing a spelling, not judging a
   * pronunciation. Applied to both sides, so the comparison stays fair. */
  function soundalike(text) {
    return text.replace(/(\w)[sx]\b/g, "$1");
  }

  function withoutArticle(text) {
    return String(text || "").replace(ARTICLE, "").trim();
  }

  function distance(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [], row = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      row[0] = i;
      for (j = 1; j <= b.length; j++) {
        row[j] = Math.min(
          prev[j] + 1,
          row[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
      }
      prev = row.slice();
    }
    return prev[b.length];
  }

  /**
   * Did any of those transcripts count as saying `target`?
   *
   * Two deliberate kindnesses. The article is optional: a recogniser drops "le"
   * as often as a student does, and neither is a pronunciation mistake. And one
   * letter's worth of slip in a long word is "close" rather than wrong, because
   * the recogniser is guessing too — it is not an examiner.
   */
  function judge(heard, target) {
    var wanted = soundalike(bare(target));
    var wantedBare = soundalike(bare(withoutArticle(target)));
    var best = { ok: false, near: false, heard: "", distance: Infinity };

    (heard || []).forEach(function (line) {
      [soundalike(bare(line)), soundalike(bare(withoutArticle(line)))].forEach(function (said) {
        if (!said) return;
        [wanted, wantedBare].forEach(function (goal) {
          if (!goal) return;
          var d = distance(said, goal);
          if (d < best.distance) {
            best.distance = d;
            best.heard = String(line).trim();
          }
        });
      });
    });

    if (best.distance === 0) { best.ok = true; return best; }
    /* Tolerance grows with the word, because so does the recogniser's room to
     * mishear one syllable. A short word gets none: "vert" and "vent" differ by
     * one letter and are two different words. */
    var allowance = Math.min(Math.floor(wantedBare.length / 6), 2);
    if (best.distance <= allowance) { best.ok = true; best.near = true; }
    else if (best.distance <= allowance + 2) best.near = true;
    return best;
  }

  App.Ear = {
    supported: supported,
    ready: ready,
    why: why,
    listen: listen,
    judge: judge,
    bare: bare,
    soundalike: soundalike,
    distance: distance
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Ear;
})(typeof window !== "undefined" ? window : globalThis);
