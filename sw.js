/* Chouette ! — the service worker.
 *
 * What it buys: the app opens and plays with no signal at all — on the bus, in
 * a cafeteria, on school wifi that half works — and it installs to a home
 * screen. Every mini-game, all 334 words and the whole conjugation engine are
 * already static files, so there is nothing to fetch once they are cached.
 *
 * Two rules matter more than the rest:
 *   · /api/* is NEVER cached. A stale roster or a stale homework list would be
 *     worse than no answer, and the sync layer already handles a failed call.
 *   · The page itself is fetched from the network first, so a deploy shows up
 *     on the next load instead of whenever a cache happens to expire.
 *
 * Bump VERSION when the shell changes; activate then drops every older cache.
 */
"use strict";

var VERSION = "v1";
var SHELL = "chouette-shell-" + VERSION;
var RUNTIME = "chouette-runtime-" + VERSION;

/* Everything needed to boot the game with no network. Kept in one list rather
 * than discovered, so a missing file fails loudly at install time. */
var SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/base.css",
  "./css/layout.css",
  "./css/games.css",
  "./css/print.css",
  "./css/redesign.css",
  "./js/config.js",
  "./js/core.js",
  "./js/skin.js",
  "./js/data/vocab.js",
  "./js/data/verbs.js",
  "./js/data/sentences.js",
  "./js/data/grammar.js",
  "./js/state.js",
  "./js/accounts.js",
  "./js/audio.js",
  "./js/speech.js",
  "./js/fx.js",
  "./js/ui.js",
  "./js/router.js",
  "./js/shell.js",
  "./js/data/achievements.js",
  "./js/data/quests.js",
  "./js/data/classroom.js",
  "./js/data/lists.js",
  "./js/content.js",
  "./js/translate.js",
  "./js/sync.js",
  "./js/paper.js",
  "./js/export.js",
  "./js/install.js",
  "./js/games/common.js",
  "./js/games/eclair.js",
  "./js/games/genre.js",
  "./js/games/conjugaison.js",
  "./js/games/accents.js",
  "./js/games/phrase.js",
  "./js/games/ecoute.js",
  "./js/games/memoire.js",
  "./js/games/boss.js",
  "./js/screens/role.js",
  "./js/screens/signin.js",
  "./js/screens/level.js",
  "./js/screens/classcode.js",
  "./js/screens/teacher.js",
  "./js/screens/home.js",
  "./js/screens/results.js",
  "./js/screens/shop.js",
  "./js/screens/badges.js",
  "./js/screens/settings.js",
  "./js/screens/profile.js",
  "./js/main.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

/* The fonts live on Google's CDN. They are cached opportunistically so an
 * offline app still looks like itself, but a miss is only a fallback face. */
var FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name === SHELL || name === RUNTIME) return null;
        return caches.delete(name);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* The page asks for this after a deploy, so a waiting worker can take over
 * without the student having to close every tab. */
self.addEventListener("message", function (event) {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  /* Classes, homework and rosters always come from the server or not at all. */
  if (url.pathname.indexOf("/api/") === 0) return;

  if (FONT_HOSTS.indexOf(url.hostname) !== -1) {
    event.respondWith(cacheFirst(request, RUNTIME));
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* A navigation: try the network so a new deploy lands straight away, and
   * fall back to the cached page when there is no network at all. */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(function () {
        return caches.match("./index.html", { ignoreSearch: true })
          .then(function (hit) { return hit || caches.match("./"); });
      })
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

function cacheFirst(request, cacheName) {
  return caches.match(request).then(function (hit) {
    if (hit) return hit;
    return fetch(request).then(function (response) {
      if (response && (response.ok || response.type === "opaque")) {
        var copy = response.clone();
        caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    });
  });
}

/* Serve what we have immediately, then quietly refresh it for next time. */
function staleWhileRevalidate(request) {
  return caches.match(request).then(function (hit) {
    var fresh = fetch(request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(SHELL).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    }).catch(function () {
      return hit;              // offline: whatever we already had, or nothing
    });
    return hit || fresh;
  });
}
