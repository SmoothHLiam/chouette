/* Chouette ! — tests for the class-sync API.
 *
 * The same module the Cloudflare Worker runs, driven here against an in-memory
 * store. Run with: npm test
 */
import { handleApi, VERSION } from "../worker/api.mjs";

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) { passed++; return; }
  failures.push(name + (detail ? "  →  " + detail : ""));
}

function eq(name, actual, expected) {
  check(name, actual === expected, `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

/** The tiny store contract both hosts implement. */
function memoryStore() {
  const map = new Map();
  return {
    async get(key) { return map.has(key) ? JSON.parse(map.get(key)) : null; },
    async put(key, value) { map.set(key, JSON.stringify(value)); },
    async delete(key) { map.delete(key); },
    async list(prefix) {
      return [...map.keys()].filter((k) => k.startsWith(prefix))
        .map((k) => ({ key: k, value: JSON.parse(map.get(k)) }));
    },
    _map: map
  };
}

const store = memoryStore();

async function call(method, path, body, { raw } = {}) {
  const init = { method };
  if (raw !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = raw;                       // deliberately malformed / oversized
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await handleApi(new Request("https://chouette.test" + path, init), store);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, data, headers: res.headers };
}

/* ------------------------------------------------------------- health --- */
const health = await call("GET", "/api/health");
eq("health responds 200", health.status, 200);
eq("health names the service", health.data.service, "chouette-sync");
eq("health reports the version", health.data.version, VERSION);
eq("browsers from any origin may call it", health.headers.get("Access-Control-Allow-Origin"), "*");
eq("preflight is answered", (await call("OPTIONS", "/api/classes")).status, 200);

/* ------------------------------------------------------- creating a class */
const made = await call("POST", "/api/classes", {
  name: "Français 3 — période 4",
  teacher: "Mme Dupont",
  level: 3,
  assignments: [{ id: "d1", gameId: "eclair", goal: "correct", target: 15, note: "Chapitre 5" }]
});
eq("creating a class responds 201", made.status, 201);
const code = made.data.class.code;
const token = made.data.token;
check("the server assigns a 6-character code", /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(code), code);
check("the code avoids look-alike characters", !/[01OIL]/.test(code), code);
check("a teacher token comes back", typeof token === "string" && token.length >= 32);
eq("the accented name survives", made.data.class.name, "Français 3 — période 4");
eq("the assignment is kept", made.data.class.assignments.length, 1);

/* The token must never be readable from the API, in any shape. */
check("the class payload carries no token", made.data.class.token === undefined);
check("the class payload carries no token hash", made.data.class.tokenHash === undefined);
const storedRaw = store._map.get("class:" + code);
check("the token is stored only as a hash", !storedRaw.includes(token), "raw token found in storage");
check("a hash is what is stored", JSON.parse(storedRaw).tokenHash.length === 64);

/* --------------------------------------------------------- joining -------- */
const joined = await call("GET", "/api/classes/" + code);
eq("a student can fetch the class with only the code", joined.status, 200);
eq("…and gets the assignments", joined.data.class.assignments[0].target, 15);
check("…but never the token hash", joined.data.class.tokenHash === undefined);
eq("a lower-case code works", (await call("GET", "/api/classes/" + code.toLowerCase())).status, 200);
eq("an unknown code is a clean 404", (await call("GET", "/api/classes/ZZZZZZ")).status, 404);
eq("a malformed code is rejected", (await call("GET", "/api/classes/abc")).status, 400);
eq("an unknown route is a 404", (await call("GET", "/api/nope")).status, 404);

/* ---------------------------------------------------------- updating ------ */
const badUpdate = await call("PUT", "/api/classes/" + code, { token: "wrong", name: "Piraté" });
eq("a wrong token cannot edit the class", badUpdate.status, 403);
eq("…and nothing changed", (await call("GET", "/api/classes/" + code)).data.class.name, "Français 3 — période 4");

const goodUpdate = await call("PUT", "/api/classes/" + code, {
  token, name: "Français 3 — période 5", teacher: "Mme Dupont", level: 3,
  assignments: [
    { id: "d1", gameId: "eclair", goal: "correct", target: 15 },
    { id: "d2", gameId: "boss", goal: "boss", target: 0 }
  ]
});
eq("the teacher can edit the class", goodUpdate.status, 200);
eq("…the name changed", goodUpdate.data.class.name, "Français 3 — période 5");
eq("…and the new assignment is live", (await call("GET", "/api/classes/" + code)).data.class.assignments.length, 2);

/* ---------------------------------------------------------- progress ------ */
const posted = await call("POST", `/api/classes/${code}/progress`, {
  studentId: "student-abc", name: "Camille", xp: 420, done: { d1: 2400 }
});
eq("a student can report progress with just the code", posted.status, 200);
await call("POST", `/api/classes/${code}/progress`, {
  studentId: "student-xyz", name: "Léo", xp: 120, done: {}
});
eq("progress for an unknown class 404s",
  (await call("POST", "/api/classes/ZZZZZZ/progress", { studentId: "x" })).status, 404);
eq("progress without an id is refused",
  (await call("POST", `/api/classes/${code}/progress`, { name: "Anon" })).status, 400);

const denied = await call("GET", `/api/classes/${code}/roster`);
eq("the roster is not public", denied.status, 403);
eq("a wrong token cannot read the roster",
  (await call("GET", `/api/classes/${code}/roster?token=wrong`)).status, 403);

const roster = await call("GET", `/api/classes/${code}/roster?token=${token}`);
eq("the teacher can read the roster", roster.status, 200);
eq("…and sees both students", roster.data.students.length, 2);
eq("…most-finished first", roster.data.students[0].name, "Camille");
eq("…with their scores", roster.data.students[0].done.d1, 2400);

/* A student updating again replaces their own row, not anyone else's. */
await call("POST", `/api/classes/${code}/progress`, {
  studentId: "student-abc", name: "Camille", xp: 900, done: { d1: 2400, d2: 1500 }
});
const roster2 = await call("GET", `/api/classes/${code}/roster?token=${token}`);
eq("a second report does not duplicate the student", roster2.data.students.length, 2);
eq("…it updates their XP", roster2.data.students[0].xp, 900);
eq("…and their finished work", Object.keys(roster2.data.students[0].done).length, 2);

/* ------------------------------------------------------------- limits ----- */
const huge = await call("POST", "/api/classes", {
  name: "N".repeat(400),
  teacher: "T".repeat(400),
  level: 99,
  assignments: Array.from({ length: 400 }, (_, i) => ({ id: "x" + i, gameId: "eclair", goal: "play", target: 1e12 }))
});
eq("an oversized class is still accepted", huge.status, 201);
eq("…with the name truncated", huge.data.class.name.length, 60);
eq("…the level clamped", huge.data.class.level, 5);
check("…the assignment list capped", huge.data.class.assignments.length <= 60, String(huge.data.class.assignments.length));
check("…and absurd targets clamped", huge.data.class.assignments[0].target <= 1e6);
eq("a body over the cap is refused",
  (await call("POST", "/api/classes", undefined, { raw: "x".repeat(40 * 1024) })).status, 400);
eq("invalid JSON is refused",
  (await call("POST", "/api/classes", undefined, { raw: "{oops" })).status, 400);

/* A teacher's preferred code is honoured, unless it is taken. */
const preferred = await call("POST", "/api/classes", { name: "Prefer", preferred: "ABC234", level: 1 });
eq("a free preferred code is granted", preferred.data.class.code, "ABC234");
const clash = await call("POST", "/api/classes", { name: "Clash", preferred: "ABC234", level: 1 });
check("a taken code is not handed out twice", clash.data.class.code !== "ABC234", clash.data.class.code);
check("…and a fresh one is issued instead", /^[A-Z2-9]{6}$/.test(clash.data.class.code));

/* -------------------------------------------------------------- delete ---- */
eq("a wrong token cannot delete a class",
  (await call("DELETE", "/api/classes/" + code, { token: "nope" })).status, 403);
const removed = await call("DELETE", "/api/classes/" + code, { token });
eq("the teacher can delete the class", removed.status, 200);
eq("…and its student rows go with it", removed.data.deleted, 2);
eq("…the class is gone", (await call("GET", "/api/classes/" + code)).status, 404);
check("…leaving nothing behind in storage",
  [...store._map.keys()].filter((k) => k.includes(code)).length === 0);

/* ------------------------------------------------------------- report ----- */
console.log("Chouette ! — sync API tests");
console.log("  " + passed + " assertions passed" + (failures.length ? "" : " — all green ✔"));
if (failures.length) {
  console.error("\n" + failures.length + " FAILED:");
  failures.forEach((f) => console.error("  ✘ " + f));
  process.exit(1);
}
