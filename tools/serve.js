/* Chouette ! — local server: the game's static files plus the same sync API
 * the Cloudflare Worker runs, backed by a JSON file instead of KV.
 *
 *   node tools/serve.js [port]
 *
 * This is what makes `npm start` a complete, working setup: students on the
 * same Wi-Fi can point a browser at this machine and classes sync for real,
 * with nothing in the cloud. It is also how the API is tested.
 */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var PORT = parseInt(process.argv[2], 10) || parseInt(process.env.PORT, 10) || 8080;
var DB_FILE = process.env.CHOUETTE_DB || path.join(ROOT, ".chouette-data.json");

var TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json"
};

/* ------------------------------------------------------------- the store -- */
/* A JSON file is plenty: a class is a few kilobytes and a school is not a
 * high-write workload. Writes are serialised so a burst cannot interleave. */

var db = {};
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
} catch (e) {
  db = {};
}

var writing = Promise.resolve();
function flush() {
  writing = writing.then(function () {
    return fs.promises.writeFile(DB_FILE, JSON.stringify(db, null, 2));
  }).catch(function (err) {
    console.error("Could not save " + DB_FILE + ":", err.message);
  });
  return writing;
}

var fileStore = {
  get: function (key) { return Promise.resolve(db[key] || null); },
  put: function (key, value) { db[key] = value; return flush(); },
  delete: function (key) { delete db[key]; return flush(); },
  list: function (prefix) {
    return Promise.resolve(Object.keys(db)
      .filter(function (k) { return k.indexOf(prefix) === 0; })
      .map(function (k) { return { key: k, value: db[k] }; }));
  }
};

/* --------------------------------------------------------------- serving -- */

function serveStatic(req, res) {
  var url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  var file = path.join(ROOT, path.normalize(url));

  // Never serve anything outside the project folder, or the sync database.
  if (file.indexOf(ROOT) !== 0 || path.basename(file) === path.basename(DB_FILE)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(file, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 — " + url + " introuvable");
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
}

function collect(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var size = 0;
    req.on("data", function (c) {
      size += c.length;
      if (size > 64 * 1024) { reject(new Error("payload too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}

var apiPromise = import(path.join(ROOT, "worker", "api.mjs"));

async function serveApi(req, res) {
  var api = await apiPromise;
  var body = ["GET", "HEAD", "OPTIONS"].indexOf(req.method) === -1 ? await collect(req) : undefined;
  var request = new Request("http://" + (req.headers.host || "localhost") + req.url, {
    method: req.method,
    headers: req.headers,
    body: body
  });
  /* Same project id as the deployed Worker, overridable for testing. Unset,
   * sign-in is simply ignored and the device tokens carry on working. */
  var response = await api.handleApi(request, fileStore, {
    projectId: process.env.FIREBASE_PROJECT_ID || "chouette-d1106"
  });
  var text = await response.text();
  var headers = {};
  response.headers.forEach(function (value, key) { headers[key] = value; });
  res.writeHead(response.status, headers);
  res.end(text);
}

http.createServer(function (req, res) {
  if (req.url.indexOf("/api/") === 0) {
    serveApi(req, res).catch(function (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    });
    return;
  }
  serveStatic(req, res);
}).listen(PORT, function () {
  console.log("Chouette ! tourne sur  http://localhost:" + PORT + "  (Ctrl+C pour arrêter)");
  console.log("Synchronisation des classes : active (" + DB_FILE + ")");
});
