/* Chouette ! — talking to the class-sync API.
 *
 * Every call is optional. If there is no server, or it is unreachable, or the
 * laptop is on a train, the app carries on exactly as it did before and the
 * invite/progress codes remain the fallback. Nothing here is ever on the
 * critical path of playing a game.
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var TIMEOUT = 7000;
  var PENDING_KEY = "chouette.sync.pending.v1";
  var LAST_PUSH_KEY = "chouette.sync.lastpush.v1";
  /* Cloudflare's free KV tier allows 1,000 writes a day. Finishing a piece of
   * homework always writes immediately; a plain game of practice waits, so a
   * keen student cannot burn a class's daily budget on their own. */
  var QUIET_GAP = 10 * 60 * 1000;
  var state = { checked: false, online: false, base: null, configured: false };

  var LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/;

  function base() {
    if (state.base !== null) return state.base;
    var configured = (App.CONFIG && App.CONFIG.syncUrl) || "";
    var loc = global.location;
    // Running from localhost means `npm start`, which serves its own API.
    // Honouring a production syncUrl there would send development traffic to
    // the live class data, so same-origin always wins locally.
    var onLocalhost = !!(loc && LOCAL_HOST.test(loc.hostname));

    if (configured && !onLocalhost) {
      state.base = configured.replace(/\/+$/, "");
      state.configured = true;
    } else if (loc && /^https?:$/.test(loc.protocol)) {
      state.base = loc.origin;
      state.configured = false;
    } else {
      state.base = "";     // file:// — offline by nature
      state.configured = false;
    }
    return state.base;
  }

  function available() {
    return !!base();
  }

  function request(method, path, body) {
    if (!available()) return Promise.resolve({ ok: false, error: "offline", offline: true });
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, TIMEOUT);
    var opts = { method: method, headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    if (controller) opts.signal = controller.signal;

    return global.fetch(base() + path, opts)
      .then(function (res) {
        // Read as text first: when the API is not wired up, what comes back is
        // a web page, and saying so is far more useful than "unreadable".
        return res.text().then(function (raw) {
          state.online = true;
          var data = null;
          try { data = JSON.parse(raw); } catch (e) { data = null; }

          if (data === null) {
            var looksLikePage = /^\s*(<|\uFEFF<)/.test(raw);
            // The commonest cause by far: the game is hosted somewhere that has
            // no API, and syncUrl was never pointed at the Worker. Say so.
            // What matters is the address actually in use, not what the file
            // says: on localhost a configured URL is deliberately ignored.
            base();
            var unset = !state.configured;
            var hint = unset
              ? " Cette adresse n'héberge pas l'API : indique l'adresse de ton" +
                " Worker dans js/config.js (SYNC_URL)."
              : "";
            return {
              ok: false,
              status: res.status,
              notJson: true,
              error: (looksLikePage
                ? "Cette adresse renvoie une page web au lieu de données (HTTP " + res.status + ")."
                : "Réponse illisible du serveur (HTTP " + res.status + ").") + hint
            };
          }
          if (!res.ok) {
            return { ok: false, error: data.error || ("Erreur " + res.status), status: res.status };
          }
          return data;
        });
      })
      .catch(function () {
        state.online = false;
        return { ok: false, error: "Serveur injoignable.", offline: true };
      })
      .then(function (result) {
        clearTimeout(timer);
        return result;
      });
  }

  /* ------------------------------------------------------ pending pushes -- */

  function pending() {
    return App.State._read(PENDING_KEY) || {};
  }

  function markPending(code, payload) {
    var queue = pending();
    queue[code] = payload;
    App.State._write(PENDING_KEY, queue);
  }

  function clearPending(code) {
    var queue = pending();
    delete queue[code];
    App.State._write(PENDING_KEY, queue);
  }

  /** Retries anything that could not be sent earlier. Safe to call any time. */
  function flush() {
    if (!available()) return Promise.resolve(0);
    var queue = pending();
    var codes = Object.keys(queue);
    if (!codes.length) return Promise.resolve(0);
    var sent = 0;
    return codes.reduce(function (chain, code) {
      return chain.then(function () {
        return request("POST", "/api/classes/" + code + "/progress", queue[code])
          .then(function (res) { if (res.ok) { clearPending(code); sent++; } });
      });
    }, Promise.resolve()).then(function () { return sent; });
  }

  App.Sync = {
    available: available,
    get online() { return state.online; },
    get checked() { return state.checked; },
    endpoint: base,

    /** One cheap call on boot so the UI can say whether sync is live. */
    probe: function () {
      if (!available()) {
        state.checked = true;
        state.online = false;
        return Promise.resolve(false);
      }
      return request("GET", "/api/health").then(function (res) {
        state.checked = true;
        state.online = !!res.ok;
        return state.online;
      });
    },

    createClass: function (klass) {
      return request("POST", "/api/classes", {
        preferred: klass.code,
        name: klass.name,
        teacher: klass.teacher,
        level: klass.level,
        assignments: klass.assignments || [],
        lists: klass.lists || [],
        pick: klass.pick || null
      });
    },

    updateClass: function (klass) {
      if (!klass || !klass.token) return Promise.resolve({ ok: false, error: "local" });
      return request("PUT", "/api/classes/" + App.School.normalizeCode(klass.code), {
        token: klass.token,
        name: klass.name,
        teacher: klass.teacher,
        level: klass.level,
        assignments: klass.assignments || [],
        lists: klass.lists || [],
        pick: klass.pick || null
      });
    },

    deleteClass: function (klass) {
      if (!klass || !klass.token) return Promise.resolve({ ok: false, error: "local" });
      return request("DELETE", "/api/classes/" + App.School.normalizeCode(klass.code), { token: klass.token });
    },

    fetchClass: function (code) {
      return request("GET", "/api/classes/" + App.School.normalizeCode(code));
    },

    /** "Am I still in this class?" — answered about this student only. */
    checkMembership: function (profile) {
      if (!profile || !profile.classCode) return Promise.resolve({ ok: false, error: "no class" });
      var klass = App.School.get(profile.classCode);
      if (!klass || !klass.cloud) return Promise.resolve({ ok: false, error: "local class" });
      return request("GET", "/api/classes/" + App.School.normalizeCode(profile.classCode) +
        "/membership?studentId=" + encodeURIComponent(App.State.syncId()));
    },

    /** Re-reads the student's class, so assignments set after they joined
     *  actually arrive, and notices if the teacher has removed them. */
    refreshClass: function (profile) {
      if (!profile || !profile.classCode) return Promise.resolve({ ok: false, error: "no class" });
      var klass = App.School.get(profile.classCode);
      if (!klass || !klass.cloud) return Promise.resolve({ ok: false, error: "local class" });
      var before = App.School.signature(klass);
      var pickBefore = App.School.pickSignature(klass);

      return App.Sync.checkMembership(profile).then(function (seat) {
        // Only an explicit removal ejects anyone. A missing row could just mean
        // a first sync that never landed, and must never cost a student a class.
        if (seat.ok && seat.removed) {
          return { ok: true, removed: true, klass: App.School.get(profile.classCode) };
        }
        return App.Sync.fetchClass(profile.classCode).then(function (res) {
          if (!res.ok) return res;
          var updated = App.School.adoptCloud(res.class);
          var pickAfter = App.School.pickSignature(updated);
          return {
            ok: true,
            changed: App.School.signature(updated) !== before,
            pickChanged: pickAfter !== pickBefore && !!pickAfter,
            klass: updated
          };
        });
      });
    },

    /** Removes one student's row from the shared roster. */
    removeStudent: function (klass, studentId) {
      if (!klass || !klass.token) return Promise.resolve({ ok: false, error: "local class" });
      return request("DELETE", "/api/classes/" + App.School.normalizeCode(klass.code) +
        "/students/" + encodeURIComponent(studentId), { token: klass.token });
    },

    fetchRoster: function (klass) {
      if (!klass || !klass.token) return Promise.resolve({ ok: false, error: "local" });
      return request("GET", "/api/classes/" + App.School.normalizeCode(klass.code) +
        "/roster?token=" + encodeURIComponent(klass.token));
    },

    /** Sends where this student is up to. Queues it if the network is down.
     *  Pass { force: true } for anything the teacher should see at once —
     *  joining the class, or finishing a piece of homework. */
    pushProgress: function (profile, opts) {
      opts = opts || {};
      var payload = App.School.progressPayload(profile);
      if (!payload) return Promise.resolve({ ok: false, error: "no class" });
      var klass = App.School.get(profile.classCode);
      if (!klass || !klass.cloud) return Promise.resolve({ ok: false, error: "local class" });
      var code = App.School.normalizeCode(profile.classCode);

      var stamps = App.State._read(LAST_PUSH_KEY) || {};
      if (!opts.force && stamps[code] && Date.now() - stamps[code] < QUIET_GAP) {
        return Promise.resolve({ ok: true, skipped: true });
      }

      if (opts.rejoin) payload.rejoin = true;
      return request("POST", "/api/classes/" + code + "/progress", payload)
        .then(function (res) {
          if (res.ok) {
            clearPending(code);
            stamps[code] = Date.now();
            App.State._write(LAST_PUSH_KEY, stamps);
          } else {
            markPending(code, payload);
          }
          return res;
        });
    },

    flush: flush,
    hasPending: function () { return Object.keys(pending()).length > 0; }
  };
})(typeof window !== "undefined" ? window : globalThis);
