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
  var state = { checked: false, online: false, base: null };

  function base() {
    if (state.base !== null) return state.base;
    var configured = (App.CONFIG && App.CONFIG.syncUrl) || "";
    if (configured) {
      state.base = configured.replace(/\/+$/, "");
    } else if (global.location && /^https?:$/.test(global.location.protocol)) {
      state.base = global.location.origin;
    } else {
      state.base = "";     // file:// — offline by nature
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
        return res.json().then(function (data) {
          state.online = true;
          if (!res.ok) return { ok: false, error: (data && data.error) || ("Erreur " + res.status), status: res.status };
          return data;
        }, function () {
          return { ok: false, error: "Réponse illisible du serveur." };
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
        assignments: klass.assignments || []
      });
    },

    updateClass: function (klass) {
      if (!klass || !klass.token) return Promise.resolve({ ok: false, error: "local" });
      return request("PUT", "/api/classes/" + App.School.normalizeCode(klass.code), {
        token: klass.token,
        name: klass.name,
        teacher: klass.teacher,
        level: klass.level,
        assignments: klass.assignments || []
      });
    },

    deleteClass: function (klass) {
      if (!klass || !klass.token) return Promise.resolve({ ok: false, error: "local" });
      return request("DELETE", "/api/classes/" + App.School.normalizeCode(klass.code), { token: klass.token });
    },

    fetchClass: function (code) {
      return request("GET", "/api/classes/" + App.School.normalizeCode(code));
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
