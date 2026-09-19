/* Chouette ! — the sync API.
 *
 * One implementation, two hosts: the Cloudflare Worker in worker/index.mjs
 * backs it with KV, and tools/serve.js backs it with a JSON file so the whole
 * thing runs locally with `npm start`. Both hand in the same tiny `store`.
 *
 * What it holds, deliberately and no more:
 *   - a class: code, name, teacher's display name, level, assignments
 *   - a student row: a display name, an anonymous id, XP, which assignments
 *     are done
 * No emails, no passwords, no last names required. A teacher can delete a
 * class and everything under it.
 *
 * A teacher may additionally sign in with Firebase, which attaches their
 * account's uid to a class as `ownerUid` so it follows them between devices.
 * That is the only identity this service stores, it is a Firebase uid rather
 * than anything readable, and it never applies to a student: they still join
 * with a code and a display name and nothing else. Passwords are Firebase's
 * problem; we only ever see a signed token saying who somebody is.
 */

import { verifyFirebaseToken } from "./jwt.mjs";

export const VERSION = "1.2.0";

/* Same alphabet as the client: no 0/O and no 1/I/L, because a class code gets
 * read aloud and copied off a whiteboard. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

const LIMITS = {
  body: 32 * 1024,
  name: 60,
  teacher: 40,
  assignments: 60,
  note: 120,
  studentName: 40,
  done: 200,
  lists: 20,
  listItems: 200,
  listField: 120,
  badges: 60,
  weak: 120
};

/* How long a student's own code is. Eight characters of the class alphabet is
 * about 8.5 × 10^11 combinations, and you need the class code as well to use
 * one, so it cannot be guessed from outside the room. */
const PASS_LENGTH = 8;

/* ----------------------------------------------------------------- utils -- */

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...extra
    }
  });
}

function fail(status, error) {
  return json({ ok: false, error }, status);
}

function clean(value, max) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function randomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/* A student's own code, in the same no-ambiguous-characters alphabet as a
 * class code: it gets read off a screen and typed on a phone. */
function randomPass() {
  const bytes = new Uint8Array(PASS_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < PASS_LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function normalizePass(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time-ish compare, so a wrong token leaks nothing through timing. */
function sameToken(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------------------ identity -- */

function bearer(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

/**
 * Who is calling, if they bothered to say. Returns null for everyone else,
 * which is most requests: students never send a token and the whole service
 * still works without one.
 */
async function identify(request, options) {
  const token = bearer(request);
  if (!token) return null;
  if (!options.projectId) return null;
  const verify = options.verify || verifyFirebaseToken;
  let result;
  try {
    result = await verify(token, options.projectId, options);
  } catch (e) {
    /* Google's keys were unreachable. That is our outage, not their bad
     * token — say nothing rather than claim they are somebody. */
    return null;
  }
  return result && result.ok ? result : null;
}

/**
 * May this caller act as the teacher of `klass`?
 *
 * Two ways in, and the old one keeps working: the device token every class has
 * always had, or an account that owns it. Nothing in the wild breaks by adding
 * accounts, and a teacher who never signs in never notices they exist.
 */
async function isTeacherOf(klass, token, who) {
  if (klass.tokenHash && sameToken(await sha256(clean(token, 80)), klass.tokenHash)) return true;
  /* An unowned class has no uid to match. Guard it explicitly: comparing
   * undefined to a missing uid must never come out true. */
  return !!(who && who.uid && klass.ownerUid && klass.ownerUid === who.uid);
}

/* A list of short strings — badge ids, or the words somebody keeps missing. */
function sanitizeIdList(list, max, width) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list.slice(0, max)) {
    const value = clean(entry, width || 40);
    if (value) out.push(value);
  }
  return out;
}

/* Only the fields we are willing to store, at the sizes we are willing to store. */
function sanitizeAssignments(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, LIMITS.assignments).map((a) => ({
    id: clean(a.id, 40) || "d" + Math.random().toString(36).slice(2, 10),
    gameId: clean(a.gameId, 30),
    goal: clean(a.goal, 20),
    target: Number.isFinite(+a.target) ? Math.max(0, Math.min(+a.target, 1e6)) : 0,
    due: a.due ? clean(a.due, 10) : null,
    note: clean(a.note, LIMITS.note),
    listId: a.listId ? clean(a.listId, 40) : null
  }));
}

/* A teacher's own word and sentence lists, kept to sane sizes. */
function sanitizeLists(lists) {
  if (!Array.isArray(lists)) return [];
  return lists.slice(0, LIMITS.lists).map((l) => {
    const kind = l.kind === "sentences" ? "sentences" : "vocab";
    return {
      id: clean(l.id, 40) || "l" + Math.random().toString(36).slice(2, 10),
      name: clean(l.name, LIMITS.name) || "Ma liste",
      kind,
      items: (Array.isArray(l.items) ? l.items : []).slice(0, LIMITS.listItems).map((item) => {
        const row = {
          fr: clean(item.fr, LIMITS.listField),
          en: clean(item.en, LIMITS.listField)
        };
        if (kind === "vocab") row.g = item.g === "m" || item.g === "f" ? item.g : null;
        return row;
      }).filter((item) => item.fr && item.en),
      created: Number.isFinite(+l.created) ? +l.created : Date.now(),
      edited: Date.now()
    };
  });
}

/* The teacher's word of the day: one short row, dated so it expires by itself. */
function sanitizePick(pick) {
  if (!pick || typeof pick !== "object") return null;
  const fr = clean(pick.fr, 80);
  if (!fr) return null;
  return {
    date: clean(pick.date, 10),
    fr,
    en: clean(pick.en, 120),
    note: clean(pick.note, 160),
    by: clean(pick.by, 40)
  };
}

function publicClass(klass) {
  return {
    code: klass.code,
    name: klass.name,
    teacher: klass.teacher,
    level: klass.level,
    assignments: klass.assignments,
    lists: klass.lists || [],
    pick: klass.pick || null,
    /* Whether it has an owner, never who. Students fetch this object with
     * nothing but the class code, and a teacher's uid is not theirs to see —
     * the client only needs to know whether claiming is still on offer. */
    owned: !!klass.ownerUid,
    updatedAt: klass.updatedAt
  };
}

async function readBody(request) {
  const raw = await request.text();
  if (raw.length > LIMITS.body) return { error: "Requête trop volumineuse." };
  if (!raw) return { data: {} };
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { error: "JSON invalide." };
  }
}

/* --------------------------------------------------------------- routing -- */

export async function handleApi(request, store, options = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return json({ ok: true });

  if (path === "/api/health") {
    return json({ ok: true, service: "chouette-sync", version: VERSION });
  }

  /* POST /api/classes — a teacher publishes a new class. */
  if (path === "/api/classes" && method === "POST") {
    const { data, error } = await readBody(request);
    if (error) return fail(400, error);

    const name = clean(data.name, LIMITS.name) || "Ma classe";
    const teacher = clean(data.teacher, LIMITS.teacher);
    const level = Math.min(Math.max(parseInt(data.level, 10) || 1, 1), 5);

    // Honour the code the teacher already has, if nobody else took it.
    let code = normalizeCode(data.preferred);
    if (!CODE_RE.test(code) || (await store.get("class:" + code))) code = "";
    for (let tries = 0; !code && tries < 12; tries++) {
      const candidate = randomCode();
      if (!(await store.get("class:" + candidate))) code = candidate;
    }
    if (!code) return fail(503, "Impossible de générer un code libre, réessaie.");

    const who = await identify(request, options);
    const token = randomToken();
    const klass = {
      code,
      name,
      teacher,
      level,
      assignments: sanitizeAssignments(data.assignments),
      lists: sanitizeLists(data.lists),
      pick: sanitizePick(data.pick),
      tokenHash: await sha256(token),
      ownerUid: who ? who.uid : null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await store.put("class:" + code, klass);
    /* The device token still comes back even for a signed-in teacher: it is
     * what keeps the class usable on a laptop that is offline, or signed out,
     * or was never signed in at all. */
    if (who) await store.put("owner:" + who.uid + ":" + code, { code, at: Date.now() });
    return json({ ok: true, class: publicClass(klass), token }, 201);
  }

  /* GET /api/classes/mine — every class this account owns, so signing in on a
   * new device is enough to get your classes back. Must be matched before the
   * generic /:code route, which would read "mine" as a class code. */
  if (path === "/api/classes/mine" && method === "GET") {
    const who = await identify(request, options);
    if (!who) return fail(401, "Connecte-toi pour retrouver tes classes.");
    const rows = await store.list("owner:" + who.uid + ":");
    const classes = [];
    for (const row of rows) {
      const code = row.value && row.value.code;
      const klass = code ? await store.get("class:" + code) : null;
      /* A class deleted from another device leaves its index entry behind;
       * tidy it up rather than reporting a class that is not there. */
      if (!klass) { await store.delete(row.key); continue; }
      if (klass.ownerUid !== who.uid) { await store.delete(row.key); continue; }
      classes.push(publicClass(klass));
    }
    return json({ ok: true, classes });
  }

  /* DELETE /api/classes/:code/students/:id — the teacher removes one student. */
  const studentMatch = path.match(/^\/api\/classes\/([A-Za-z0-9-]{1,12})\/students\/([A-Za-z0-9_\-:.@+]{1,64})$/);
  if (studentMatch) {
    const code = normalizeCode(studentMatch[1]);
    if (!CODE_RE.test(code)) return fail(400, "Code de classe invalide.");
    if (method !== "DELETE") return fail(405, "Méthode non autorisée.");

    const klass = await store.get("class:" + code);
    if (!klass) return fail(404, "Aucune classe avec ce code.");
    const { data, error } = await readBody(request);
    if (error) return fail(400, error);
    if (!(await isTeacherOf(klass, data.token, await identify(request, options)))) {
      return fail(403, "Seul le professeur de cette classe peut retirer un élève.");
    }
    // Idempotent: removing someone already gone is a success, not an error.
    // The row is deleted and a marker left behind, so the student's own app can
    // be told they were removed rather than having to guess from its absence —
    // a missing row would otherwise be indistinguishable from a failed first
    // sync, and a flaky network would eject people.
    const gone = decodeURIComponent(studentMatch[2]);
    await store.delete("student:" + code + ":" + gone);
    await store.put("gone:" + code + ":" + gone, { id: gone, at: Date.now() });
    return json({ ok: true });
  }

  const classMatch = path.match(/^\/api\/classes\/([A-Za-z0-9-]{1,12})(\/[a-z]+)?$/);
  if (classMatch) {
    const code = normalizeCode(classMatch[1]);
    const sub = classMatch[2] || "";
    if (!CODE_RE.test(code)) return fail(400, "Code de classe invalide.");

    const klass = await store.get("class:" + code);

    /* GET /api/classes/:code — what a student needs to join. Public: the code
     * is the secret, and it only ever reveals the assignments. */
    if (!sub && method === "GET") {
      if (!klass) return fail(404, "Aucune classe avec ce code.");
      return json({ ok: true, class: publicClass(klass) });
    }

    if (!sub && method === "PUT") {
      if (!klass) return fail(404, "Aucune classe avec ce code.");
      const { data, error } = await readBody(request);
      if (error) return fail(400, error);
      if (!(await isTeacherOf(klass, data.token, await identify(request, options)))) {
        return fail(403, "Seul le professeur de cette classe peut la modifier.");
      }
      klass.name = clean(data.name, LIMITS.name) || klass.name;
      klass.teacher = clean(data.teacher, LIMITS.teacher);
      klass.level = Math.min(Math.max(parseInt(data.level, 10) || klass.level, 1), 5);
      klass.assignments = sanitizeAssignments(data.assignments);
      klass.lists = sanitizeLists(data.lists);
      klass.pick = sanitizePick(data.pick);
      klass.updatedAt = Date.now();
      await store.put("class:" + code, klass);
      return json({ ok: true, class: publicClass(klass) });
    }

    if (!sub && method === "DELETE") {
      if (!klass) return json({ ok: true });
      const { data, error } = await readBody(request);
      if (error) return fail(400, error);
      if (!(await isTeacherOf(klass, data.token, await identify(request, options)))) {
        return fail(403, "Seul le professeur de cette classe peut la supprimer.");
      }
      const rows = await store.list("student:" + code + ":");
      for (const row of rows) await store.delete(row.key);
      const markers = await store.list("gone:" + code + ":");
      for (const marker of markers) await store.delete(marker.key);
      if (klass.ownerUid) await store.delete("owner:" + klass.ownerUid + ":" + code);
      await store.delete("class:" + code);
      return json({ ok: true, deleted: rows.length });
    }

    /* POST /api/classes/:code/claim — attach a class to the account calling.
     *
     * This is what stops accounts orphaning every class that existed before
     * them. Prove you are the teacher the old way, once, and the class becomes
     * yours on every device you sign in to afterwards. */
    if (sub === "/claim" && method === "POST") {
      if (!klass) return fail(404, "Aucune classe avec ce code.");
      const { data, error } = await readBody(request);
      if (error) return fail(400, error);
      const who = await identify(request, options);
      if (!who) return fail(401, "Connecte-toi d'abord.");

      /* Already yours: say so and stop, so a retry is harmless. */
      if (klass.ownerUid === who.uid) {
        await store.put("owner:" + who.uid + ":" + code, { code, at: Date.now() });
        return json({ ok: true, class: publicClass(klass), already: true });
      }
      /* Somebody else's. The device token is not enough to take it from them —
       * that would make a leaked code-plus-token a way to steal a class. */
      if (klass.ownerUid) {
        return fail(403, "Cette classe appartient déjà à un autre compte.");
      }
      if (!klass.tokenHash ||
          !sameToken(await sha256(clean(data.token, 80)), klass.tokenHash)) {
        return fail(403, "Seul le professeur de cette classe peut la rattacher.");
      }

      klass.ownerUid = who.uid;
      klass.updatedAt = Date.now();
      await store.put("class:" + code, klass);
      await store.put("owner:" + who.uid + ":" + code, { code, at: Date.now() });
      return json({ ok: true, class: publicClass(klass) });
    }

    /* POST /api/classes/:code/progress — a student says where they are up to.
     * Knowing the class code is enough; a student can only write their own row. */
    if (sub === "/progress" && method === "POST") {
      if (!klass) return fail(404, "Aucune classe avec ce code.");
      const { data, error } = await readBody(request);
      if (error) return fail(400, error);
      const studentId = clean(data.studentId, 64);
      if (!studentId) return fail(400, "Identifiant d'élève manquant.");

      // Someone the teacher removed does not silently reappear by playing on.
      // Typing the class code again is a deliberate rejoin and clears it.
      const tombstone = await store.get("gone:" + code + ":" + studentId);
      if (tombstone && !data.rejoin) {
        return json({ ok: true, removed: true, stored: false });
      }
      if (tombstone) await store.delete("gone:" + code + ":" + studentId);

      /* The code is minted once and then kept. Regenerating it on every push
       * would quietly invalidate whatever the student wrote down. */
      const existing = (await store.get("student:" + code + ":" + studentId)) || {};
      const pass = existing.pass || randomPass();

      /*
       * Merge, never overwrite. Two reasons, both of which bite in a real
       * classroom now that a student can pick up on a second device:
       *
       *  · A push that does not mention a field must not erase it. An older
       *    copy of the app — a tab left open, a service worker still serving
       *    yesterday's script — sends only name, xp and done, and would
       *    otherwise wipe a term's badges on its next heartbeat.
       *  · Two devices are now normal. Whichever pushes last is not
       *    necessarily the one that knows most, so anything that only ever
       *    goes up is kept at its highest rather than replaced.
       */
      const keep = (key, value) => (value === undefined ? existing[key] : value);
      const number = (value, cap) =>
        value === undefined ? undefined : Math.max(0, Math.min(parseInt(value, 10) || 0, cap));
      const highest = (key, value) => Math.max(existing[key] || 0, value === undefined ? 0 : value);

      /* Finishing homework is not undoable by a device that never saw it. */
      const done = Object.assign({}, existing.done || {});
      const source = data.done && typeof data.done === "object" ? data.done : {};
      Object.keys(source).slice(0, LIMITS.done).forEach((key) => {
        const id = clean(key, 40);
        if (!id) return;
        const score = Math.max(0, Math.min(parseInt(source[key], 10) || 0, 1e7));
        done[id] = Math.max(done[id] || 0, score);
      });

      /* Badges are earned, so they accumulate rather than being replaced. */
      const badges = data.badges === undefined
        ? (existing.badges || [])
        : sanitizeIdList(
            (existing.badges || []).concat(sanitizeIdList(data.badges, LIMITS.badges))
              .filter((id, i, all) => all.indexOf(id) === i),
            LIMITS.badges);

      await store.put("student:" + code + ":" + studentId, {
        id: studentId,
        pass,
        name: clean(data.name, LIMITS.studentName) || existing.name || "Élève",
        /* Only ever upward: XP, croissants and a best streak are never lost. */
        xp: highest("xp", number(data.xp, 1e7)),
        coins: highest("coins", number(data.coins, 1e7)),
        bestStreak: highest("bestStreak", number(data.bestStreak, 10000)),
        /* A current streak genuinely can fall to zero, so the newest word on
         * it wins — but only if there is one. */
        streak: keep("streak", number(data.streak, 10000)) || 0,
        lastPlayed: keep("lastPlayed", data.lastPlayed === undefined
          ? undefined : (data.lastPlayed ? clean(data.lastPlayed, 10) : null)) || null,
        avatar: keep("avatar", data.avatar === undefined ? undefined : clean(data.avatar, 8)) || "",
        level: keep("level", number(data.level, 5)) || 0,
        badges,
        weak: keep("weak", data.weak === undefined
          ? undefined : sanitizeIdList(data.weak, LIMITS.weak, LIMITS.listField)) || [],
        done,
        at: Date.now()
      });
      return json({ ok: true, pass });
    }

    /* POST /api/classes/:code/resume — a student picking up on a new device.
     *
     * The credential is the pair: the class code they joined with, and the
     * code the app gave them. Neither alone is any use, and the code is only
     * ever good for this one class — it is not an account and unlocks nothing
     * outside the room.
     *
     * No token, deliberately. A student proving who they are IS the point,
     * and they have no teacher token to offer. */
    if (sub === "/resume" && method === "POST") {
      if (!klass) return fail(404, "Aucune classe avec ce code.");
      const { data, error } = await readBody(request);
      if (error) return fail(400, error);
      const pass = normalizePass(data.pass);
      if (pass.length !== PASS_LENGTH) return fail(400, "Code élève invalide.");

      const rows = await store.list("student:" + code + ":");
      const row = rows.map((r) => r.value)
        .find((value) => value && value.pass && normalizePass(value.pass) === pass);
      /* The same answer whether the code is wrong or the class is empty: no
       * confirming for a stranger that a code exists somewhere. */
      if (!row) return fail(404, "Aucun élève avec ce code dans cette classe.");

      return json({ ok: true, student: row, class: publicClass(klass) });
    }

    /* GET /api/classes/:code/membership?studentId=… — "am I still in this
     * class?". Answers only about the id you ask for, so knowing the code
     * reveals nothing about anyone else. */
    if (sub === "/membership" && method === "GET") {
      if (!klass) return fail(404, "Aucune classe avec ce code.");
      const who = clean(url.searchParams.get("studentId"), 64);
      if (!who) return fail(400, "Identifiant d'élève manquant.");
      const row = await store.get("student:" + code + ":" + who);
      if (row) return json({ ok: true, member: true, removed: false });
      const tombstone = await store.get("gone:" + code + ":" + who);
      return json({ ok: true, member: false, removed: !!tombstone });
    }

    /* GET /api/classes/:code/roster?token=… — the teacher's view. */
    if (sub === "/roster" && method === "GET") {
      if (!klass) return fail(404, "Aucune classe avec ce code.");
      /* The roster is a GET, so the device token rides in the query string as
       * it always has; a signed-in teacher sends a header instead and needs no
       * token at all. */
      const token = url.searchParams.get("token") || "";
      if (!(await isTeacherOf(klass, token, await identify(request, options)))) {
        return fail(403, "Seul le professeur de cette classe peut voir les résultats.");
      }
      const rows = await store.list("student:" + code + ":");
      const students = rows
        .map((row) => row.value)
        .filter(Boolean)
        .sort((a, b) => Object.keys(b.done || {}).length - Object.keys(a.done || {}).length || b.xp - a.xp);
      return json({ ok: true, students, class: publicClass(klass) });
    }

    return fail(405, "Méthode non autorisée.");
  }

  return fail(404, "Route inconnue.");
}
