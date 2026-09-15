/* Chouette ! — Exporting the gradebook.
 *
 * Everything here is built from the roster the teacher dashboard already has
 * in hand, so exporting costs nothing: no extra request, no sync write. The
 * teacher gets a file their gradebook can swallow, which is the difference
 * between "a fun app" and "something I can actually grade".
 */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  /* A spreadsheet reads a cell that opens with one of these as a formula, and
   * student names arrive from other people's devices. A leading apostrophe is
   * the documented way to say "this is text" — Excel and Sheets both hide it. */
  var FORMULA = /^[=+\-@\t\r]/;

  /** One CSV field: quoted when it has to be, never a live formula. */
  function cell(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") return isFinite(value) ? String(value) : "";
    var text = String(value);
    if (FORMULA.test(text)) text = "'" + text;
    if (/[",;\r\n]/.test(text) || /^\s|\s$/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  /** Rows of values → CSV text. CRLF endings, because Excel still prefers them. */
  function toCsv(rows) {
    return rows.map(function (row) {
      return row.map(cell).join(",");
    }).join("\r\n");
  }

  /** A column header per assignment, numbered so two alike stay distinct. */
  function assignmentHeader(assignment, index) {
    var label = App.School ? App.School.describe(assignment) : assignment.gameId;
    if (assignment.due) label += " (pour le " + assignment.due + ")";
    return (index + 1) + ". " + label;
  }

  function stamp(ms) {
    if (!ms) return "";
    var d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /**
   * The gradebook for one class as a table of rows.
   * A blank assignment cell means "not handed in"; a number is the score they
   * got, so a teacher can tell nothing from zero.
   */
  function gradebook(klass) {
    if (!klass) return [];
    var assignments = klass.assignments || [];
    var header = ["Élève", "XP", "Devoirs terminés"]
      .concat(assignments.map(assignmentHeader))
      .concat(["Dernière activité"]);

    var roster = klass.roster || {};
    var rows = Object.keys(roster).map(function (key) {
      var entry = roster[key] || {};
      var done = entry.done || {};
      var count = 0;
      var scores = assignments.map(function (a) {
        var rec = done[a.id];
        if (!rec) return "";
        count++;
        return typeof rec.score === "number" ? rec.score : (rec === true ? "✓" : "");
      });
      return {
        sort: [count, entry.xp || 0],
        row: [entry.name || "Élève", entry.xp || 0, count]
          .concat(scores)
          .concat([stamp(entry.lastSeen)])
      };
    });

    /* Same order as the dashboard shows them: furthest along first. */
    rows.sort(function (a, b) { return b.sort[0] - a.sort[0] || b.sort[1] - a.sort[1]; });
    return [header].concat(rows.map(function (r) { return r.row; }));
  }

  function slug(text) {
    var base = App.U ? App.U.stripAccents(String(text || "")) : String(text || "");
    return base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "classe";
  }

  function filename(klass) {
    var day = App.U ? App.U.today() : "";
    return "chouette-" + slug(klass && klass.name) + "-" + day + ".csv";
  }

  /* A BOM, so Excel opens the file as UTF-8 and "Chloé" is not "ChloÃ©". */
  function download(text, name) {
    var body = "﻿" + text;
    var doc = global.document;
    if (!doc) return false;
    var link = doc.createElement("a");
    if (!("download" in link)) return false;
    link.download = name;

    var url = null;
    if (global.Blob && global.URL && global.URL.createObjectURL) {
      var blob = new global.Blob([body], { type: "text/csv;charset=utf-8" });
      url = global.URL.createObjectURL(blob);
    } else {
      url = "data:text/csv;charset=utf-8," + encodeURIComponent(body);
    }
    link.href = url;
    link.style.display = "none";
    doc.body.appendChild(link);
    link.click();
    link.remove();
    if (global.URL && global.URL.revokeObjectURL && url.indexOf("blob:") === 0) {
      setTimeout(function () { global.URL.revokeObjectURL(url); }, 4000);
    }
    return true;
  }

  /** The whole job: build the class's gradebook and hand it over as a file. */
  function saveGradebook(klass) {
    var rows = gradebook(klass);
    if (rows.length < 2) return { ok: false, error: "Personne dans cette classe — rien à exporter." };
    if (!download(toCsv(rows), filename(klass))) {
      return { ok: false, error: "Ce navigateur ne sait pas télécharger de fichier." };
    }
    return { ok: true, students: rows.length - 1 };
  }

  App.Export = {
    cell: cell,
    toCsv: toCsv,
    gradebook: gradebook,
    filename: filename,
    saveGradebook: saveGradebook
  };

  if (typeof module !== "undefined" && module.exports) module.exports = App.Export;
})(typeof window !== "undefined" ? window : globalThis);
