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
 */

export const VERSION = "1.0.0";

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
  listField: 120
};

/* ----------------------------------------------------------------- utils -- */

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
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

function publicClass(klass) {
  return {
    code: klass.code,
    name: klass.name,
    teacher: klass.teacher,
    level: klass.level,
    assignments: klass.assignments,
    lists: klass.lists || [],
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

export async function handleApi(request, store) {
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

    const token = randomToken();
    const klass = {
      code,
      name,
      teacher,
      level,
      assignments: sanitizeAssignments(data.assignments),
      lists: sanitizeLists(data.lists),
      tokenHash: await sha256(token),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await store.put("class:" + code, klass);
    return json({ ok: true, class: publicClass(klass), token }, 201);
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
    if (!sameToken(await sha256(clean(data.token, 80)), klass.tokenHash)) {
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
      if (!sameToken(await sha256(clean(data.token, 80)), klass.tokenHash)) {
        return fail(403, "Seul le professeur de cette classe peut la modifier.");
      }
      klass.name = clean(data.name, LIMITS.name) || klass.name;
      klass.teacher = clean(data.teacher, LIMITS.teacher);
      klass.level = Math.min(Math.max(parseInt(data.level, 10) || klass.level, 1), 5);
      klass.assignments = sanitizeAssignments(data.assignments);
      klass.lists = sanitizeLists(data.lists);
      klass.updatedAt = Date.now();
      await store.put("class:" + code, klass);
      return json({ ok: true, class: publicClass(klass) });
    }

    if (!sub && method === "DELETE") {
      if (!klass) return json({ ok: true });
      const { data, error } = await readBody(request);
      if (error) return fail(400, error);
      if (!sameToken(await sha256(clean(data.token, 80)), klass.tokenHash)) {
        return fail(403, "Seul le professeur de cette classe peut la supprimer.");
      }
      const rows = await store.list("student:" + code + ":");
      for (const row of rows) await store.delete(row.key);
      const markers = await store.list("gone:" + code + ":");
      for (const marker of markers) await store.delete(marker.key);
      await store.delete("class:" + code);
      return json({ ok: true, deleted: rows.length });
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

      const done = {};
      const source = data.done && typeof data.done === "object" ? data.done : {};
      Object.keys(source).slice(0, LIMITS.done).forEach((key) => {
        const id = clean(key, 40);
        if (id) done[id] = Math.max(0, Math.min(parseInt(source[key], 10) || 0, 1e7));
      });

      await store.put("student:" + code + ":" + studentId, {
        id: studentId,
        name: clean(data.name, LIMITS.studentName) || "Élève",
        xp: Math.max(0, Math.min(parseInt(data.xp, 10) || 0, 1e7)),
        done,
        at: Date.now()
      });
      return json({ ok: true });
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
      const token = url.searchParams.get("token") || "";
      if (!sameToken(await sha256(clean(token, 80)), klass.tokenHash)) {
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
