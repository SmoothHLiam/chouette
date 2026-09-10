/* Chouette ! — screen switching with a light slide transition. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});
  var U = App.U;
  var screens = {};
  var root = null;
  var current = null;

  function go(name, params) {
    var screen = screens[name];
    if (!screen) throw new Error("Unknown screen: " + name);
    App.Shell.teardown();
    App.Speech.stop();
    current = name;
    var host = U.el("div", "screen");
    U.clear(root);
    root.appendChild(host);
    screen(host, params || {});
    if (name !== "play") global.scrollTo(0, 0);
  }

  App.Router = {
    mount: function (node) { root = node; },
    register: function (name, fn) { screens[name] = fn; },
    go: go,
    get current() { return current; }
  };
})(typeof window !== "undefined" ? window : globalThis);
