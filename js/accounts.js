/* Chouette ! — who is playing.
 *
 * A local account is a name, a role and a private profile key: exactly enough
 * for a shared classroom computer to keep everyone's scores apart. No server,
 * no password, no email from a minor, and that is still the whole story for
 * every student.
 *
 * A teacher may additionally link theirs to a Firebase account, which records
 * nothing here but the uid and the address it belongs to — enough to recognise
 * them next time and to stop a second local profile appearing every time they
 * sign in. The profile, the scores and the classes stay exactly where they
 * were. Unlinking leaves the local account untouched and still usable. */
(function (global) {
  "use strict";
  var App = (global.App = global.App || {});

  var KEY = "chouette.accounts.v1";
  var book = { accounts: [], activeId: null };

  function load() {
    var saved = App.State._read(KEY);
    if (saved && Array.isArray(saved.accounts)) book = saved;
    migrateLegacy();
  }

  function save() {
    App.State._write(KEY, book);
  }

  /** A profile from before accounts existed becomes the first account. */
  function migrateLegacy() {
    if (book.accounts.length) return;
    var legacy = App.State._read(App.State._legacyKey);
    if (!legacy || (!legacy.xp && !legacy.level)) return;
    book.accounts.push({
      id: "legacy",
      name: legacy.name || "Moi",
      role: legacy.role || "student",
      storageKey: App.State._legacyKey,
      created: Date.now()
    });
    book.activeId = "legacy";
    save();
  }

  function newId() {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function find(id) {
    for (var i = 0; i < book.accounts.length; i++) {
      if (book.accounts[i].id === id) return book.accounts[i];
    }
    return null;
  }

  App.Accounts = {
    boot: load,
    all: function () { return book.accounts.slice(); },
    byRole: function (role) {
      return book.accounts.filter(function (a) { return a.role === role; });
    },
    active: function () { return find(book.activeId); },

    create: function (name, role) {
      var account = {
        id: newId(),
        name: String(name || "").trim().slice(0, 24) || "Élève",
        role: role === "teacher" ? "teacher" : "student",
        storageKey: "chouette.profile.v1:" + newId(),
        created: Date.now()
      };
      book.accounts.push(account);
      save();
      return account;
    },

    signIn: function (id) {
      var account = find(id);
      if (!account) return null;
      book.activeId = id;
      save();
      App.State.use(account);
      App.State.save();
      return account;
    },

    signOut: function () {
      book.activeId = null;
      save();
      App.State.use(null);
    },

    /** Ties a local account to a signed-in Firebase user. */
    link: function (id, uid, email) {
      var account = find(id);
      if (!account || !uid) return null;
      account.authUid = uid;
      account.authEmail = String(email || "").slice(0, 120);
      save();
      return account;
    },

    /** The local account already tied to this Firebase uid, if any. */
    byAuthUid: function (uid) {
      if (!uid) return null;
      for (var i = 0; i < book.accounts.length; i++) {
        if (book.accounts[i].authUid === uid) return book.accounts[i];
      }
      return null;
    },

    /** Forgets the link. The local account, and everything in it, stays. */
    unlink: function (id) {
      var account = find(id);
      if (!account) return;
      delete account.authUid;
      delete account.authEmail;
      save();
    },

    rename: function (id, name) {
      var account = find(id);
      if (!account) return;
      account.name = String(name || "").trim().slice(0, 24) || account.name;
      save();
      if (book.activeId === id) { App.State.profile.name = account.name; App.State.save(); }
    },

    remove: function (id) {
      var account = find(id);
      if (!account) return;
      book.accounts = book.accounts.filter(function (a) { return a.id !== id; });
      if (book.activeId === id) book.activeId = null;
      try { global.localStorage.removeItem(account.storageKey); } catch (e) { /* ignore */ }
      save();
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
