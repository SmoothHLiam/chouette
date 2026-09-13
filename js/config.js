
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  
  var SYNC_URL = "https://chouette.chouette.workers.dev";
  

  App.CONFIG = { syncUrl: SYNC_URL };
})(typeof window !== "undefined" ? window : globalThis);
