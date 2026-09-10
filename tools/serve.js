/* Chouette ! — a tiny static file server, so `npm start` works without
 * installing anything.  Usage: node tools/serve.js [port] */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var PORT = parseInt(process.argv[2], 10) || parseInt(process.env.PORT, 10) || 8080;

var TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

http.createServer(function (req, res) {
  var url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  var file = path.join(ROOT, path.normalize(url));

  // Never serve anything outside the project folder.
  if (file.indexOf(ROOT) !== 0) {
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
}).listen(PORT, function () {
  console.log("Chouette ! tourne sur  http://localhost:" + PORT + "  (Ctrl+C pour arrêter)");
});
