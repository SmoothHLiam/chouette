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

/* A stand-in for Firebase. tests/jwt.mjs proves the real verifier against a
 * real keypair; here the question is what the API does with the answer, so
 * "who is this" is a lookup rather than a signature check. A token of
 * "bad-token" verifies as nobody, and "boom" fails the way an unreachable
 * Google does. */
const PROJECT = "chouette-test";
const PEOPLE = {
  "tok-amina": { ok: true, uid: "uid-amina", email: "amina@example.com", name: "Amina" },
  "tok-bruno": { ok: true, uid: "uid-bruno", email: "bruno@example.com", name: "Bruno" }
};
async function fakeVerify(token, projectId) {
  if (token === "boom") throw new Error("jwks-unavailable");
  if (projectId !== PROJECT) return { ok: false, error: "wrong-audience" };
  return PEOPLE[token] || { ok: false, error: "bad-signature" };
}
const OPTIONS = { projectId: PROJECT, verify: fakeVerify };

async function call(method, path, body, { raw, auth } = {}) {
  const init = { method };
  if (raw !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = raw;                       // deliberately malformed / oversized
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  if (auth) {
    init.headers = { ...(init.headers || {}), Authorization: "Bearer " + auth };
  }
  const res = await handleApi(new Request("https://chouette.test" + path, init), store, OPTIONS);
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

/* ------------------------------------------------- removing one student --- */
eq("removing a student needs the teacher's token",
  (await call("DELETE", `/api/classes/${code}/students/student-xyz`, { token: "nope" })).status, 403);
eq("…and the roster is untouched",
  (await call("GET", `/api/classes/${code}/roster?token=${token}`)).data.students.length, 2);

const kicked = await call("DELETE", `/api/classes/${code}/students/student-xyz`, { token });
eq("the teacher can remove a student", kicked.status, 200);
const afterKick = await call("GET", `/api/classes/${code}/roster?token=${token}`);
eq("…the roster is one shorter", afterKick.data.students.length, 1);
eq("…and it is the right one left", afterKick.data.students[0].name, "Camille");
eq("removing someone already gone still succeeds",
  (await call("DELETE", `/api/classes/${code}/students/student-xyz`, { token })).status, 200);
eq("removing from an unknown class 404s",
  (await call("DELETE", "/api/classes/ZZZZZZ/students/abc", { token })).status, 404);
eq("a student cannot be removed with GET",
  (await call("GET", `/api/classes/${code}/students/student-abc`)).status, 405);

/* Membership: the one question a student's app is allowed to ask. */
const seatIn = await call("GET", `/api/classes/${code}/membership?studentId=student-abc`);
eq("a member is told they are in", seatIn.data.member, true);
eq("…and not that they were removed", seatIn.data.removed, false);

const seatOut = await call("GET", `/api/classes/${code}/membership?studentId=student-xyz`);
eq("a removed student is told they are out", seatOut.data.member, false);
eq("…and that it was a removal", seatOut.data.removed, true);

/* The distinction that stops a flaky network ejecting anyone. */
const seatUnknown = await call("GET", `/api/classes/${code}/membership?studentId=never-seen`);
eq("someone who never synced is not a member", seatUnknown.data.member, false);
eq("…but was NOT removed either", seatUnknown.data.removed, false);
eq("membership needs an id", (await call("GET", `/api/classes/${code}/membership`)).status, 400);

/* A removed student playing on does not quietly reappear. */
const afterRemovalPlay = await call("POST", `/api/classes/${code}/progress`, {
  studentId: "student-xyz", name: "Léo", xp: 130, done: { d1: 10 }
});
eq("their work is accepted but not stored", afterRemovalPlay.data.removed, true);
eq("…and they are told so", afterRemovalPlay.data.stored, false);
eq("…so the roster stays as the teacher left it",
  (await call("GET", `/api/classes/${code}/roster?token=${token}`)).data.students.length, 1);

/* Typing the code again is deliberate, and lets them back in. */
const rejoined = await call("POST", `/api/classes/${code}/progress`, {
  studentId: "student-xyz", name: "Léo", xp: 130, done: {}, rejoin: true
});
eq("rejoining is accepted", rejoined.status, 200);
check("…and is not reported as removed", !rejoined.data.removed);
eq("…the roster has them back",
  (await call("GET", `/api/classes/${code}/roster?token=${token}`)).data.students.length, 2);
eq("…and membership agrees",
  (await call("GET", `/api/classes/${code}/membership?studentId=student-xyz`)).data.member, true);

/* -------------------------------------------------------------- delete ---- */
eq("a wrong token cannot delete a class",
  (await call("DELETE", "/api/classes/" + code, { token: "nope" })).status, 403);
const removed = await call("DELETE", "/api/classes/" + code, { token });
eq("the teacher can delete the class", removed.status, 200);
eq("…and its student rows go with it", removed.data.deleted, 2);
eq("…the class is gone", (await call("GET", "/api/classes/" + code)).status, 404);
check("…leaving nothing behind in storage",
  [...store._map.keys()].filter((k) => k.includes(code)).length === 0);

/* ================================================ the student's own code === */
/* What it is for: a student on a school Chromebook in the morning and a phone
 * in the evening is the same student, without anybody collecting an email. */

const rClass = await call("POST", "/api/classes", { name: "French 2", teacher: "Prof", level: 2 });
const rCode = rClass.data.class.code;
const rToken = rClass.data.token;

const firstPush = await call("POST", "/api/classes/" + rCode + "/progress", {
  studentId: "stu-nour", name: "Nour", xp: 640, coins: 30, streak: 4, bestStreak: 9,
  level: 2, avatar: "🦊", badges: ["first-win", "streak-3"], weak: ["la fenêtre", "le pain"],
  done: {}
});
eq("a student's first push is accepted", firstPush.status, 200);
const pass = firstPush.data.pass;
check("…and hands them a code", typeof pass === "string" && pass.length === 8, JSON.stringify(pass));
check("…from the unambiguous alphabet", /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/.test(pass), pass);

/* The code must survive. A student writes it down once. */
const secondPush = await call("POST", "/api/classes/" + rCode + "/progress", {
  studentId: "stu-nour", name: "Nour", xp: 900, done: {}
});
eq("playing again does not change their code", secondPush.data.pass, pass);

/* ---- coming back on another device ------------------------------------- */
const back = await call("POST", "/api/classes/" + rCode + "/resume", { pass });
eq("the code brings the student back", back.status, 200);
eq("…as themselves", back.data.student.id, "stu-nour");
eq("…with their name", back.data.student.name, "Nour");
eq("…their XP", back.data.student.xp, 900);
/* Not just a number: the things that make somebody want to come back. */
eq("…their streak", back.data.student.streak, 4);
eq("…their best streak", back.data.student.bestStreak, 9);
eq("…their croissants", back.data.student.coins, 30);
eq("…their level", back.data.student.level, 2);
eq("…their badges", (back.data.student.badges || []).join(","), "first-win,streak-3");
eq("…and the words they keep missing", (back.data.student.weak || []).join(","), "la fenêtre,le pain");
eq("…plus the class itself", back.data.class.code, rCode);

/* Typing it in lowercase, or with a dash, is the same code. */
eq("the code is case-insensitive",
  (await call("POST", "/api/classes/" + rCode + "/resume", { pass: pass.toLowerCase() })).status, 200);
eq("…and ignores punctuation people add",
  (await call("POST", "/api/classes/" + rCode + "/resume",
    { pass: pass.slice(0, 4) + "-" + pass.slice(4) })).status, 200);

/* ---- a push must never take something away ----------------------------- */
/* That second push carried only name, xp and done — exactly what an older copy
 * of the app sends. Everything else has to still be there. */
const afterThin = await call("POST", "/api/classes/" + rCode + "/resume", { pass });
eq("an old client's push does not wipe the streak", afterThin.data.student.streak, 4);
eq("…nor the badges", (afterThin.data.student.badges || []).length, 2);
eq("…nor the croissants", afterThin.data.student.coins, 30);

/* Two devices are normal now. The last one to speak is not always the one that
 * knows most, so anything that only goes up stays up. */
await call("POST", "/api/classes/" + rCode + "/progress", {
  studentId: "stu-nour", name: "Nour", xp: 100, coins: 1, bestStreak: 1, done: {}
});
const afterStale = await call("POST", "/api/classes/" + rCode + "/resume", { pass });
eq("a stale device cannot lower XP", afterStale.data.student.xp, 900);
eq("…nor spend croissants it never had", afterStale.data.student.coins, 30);
eq("…nor forget a best streak", afterStale.data.student.bestStreak, 9);

/* A streak really can break, so the newest word on that one wins. */
await call("POST", "/api/classes/" + rCode + "/progress", {
  studentId: "stu-nour", name: "Nour", xp: 900, streak: 0, done: {}
});
eq("but a broken streak is allowed to fall",
  (await call("POST", "/api/classes/" + rCode + "/resume", { pass })).data.student.streak, 0);

/* Homework stays handed in, whichever device remembers it. */
const hw = await call("POST", "/api/classes/" + rCode + "/progress", {
  studentId: "stu-nour", name: "Nour", xp: 900, done: { "d-one": 500 }
});
eq("homework is recorded", hw.status, 200);
await call("POST", "/api/classes/" + rCode + "/progress", {
  studentId: "stu-nour", name: "Nour", xp: 900, done: { "d-two": 300 }
});
const bothDone = await call("POST", "/api/classes/" + rCode + "/resume", { pass });
eq("a device that never saw an assignment cannot un-hand it in",
  Object.keys(bothDone.data.student.done).sort().join(","), "d-one,d-two");
eq("…and keeps the better score", bothDone.data.student.done["d-one"], 500);

/* New badges add to the old ones rather than replacing them. */
await call("POST", "/api/classes/" + rCode + "/progress", {
  studentId: "stu-nour", name: "Nour", xp: 900, badges: ["boss-1"], done: {}
});
const allBadges = (await call("POST", "/api/classes/" + rCode + "/resume", { pass }))
  .data.student.badges;
eq("badges accumulate", allBadges.slice().sort().join(","), "boss-1,first-win,streak-3");
check("…without duplicating", new Set(allBadges).size === allBadges.length, allBadges.join(","));

/* ---- and what it must NOT do ------------------------------------------- */
eq("a wrong code gets nothing",
  (await call("POST", "/api/classes/" + rCode + "/resume", { pass: "ZZZZZZZZ" })).status, 404);
eq("…and neither does a short one",
  (await call("POST", "/api/classes/" + rCode + "/resume", { pass: "ABC" })).status, 400);
eq("…nor an empty one",
  (await call("POST", "/api/classes/" + rCode + "/resume", {})).status, 400);

/* The pair is the credential. A code from one class is useless in another,
 * which is what keeps it worthless to anyone outside that room. */
const otherClass = await call("POST", "/api/classes", { name: "Autre", teacher: "Prof", level: 1 });
eq("a code from another class does not work here",
  (await call("POST", "/api/classes/" + otherClass.data.class.code + "/resume", { pass })).status, 404);

/* It is a resume code, not an account: it unlocks nothing a teacher holds. */
eq("a student code cannot read the roster",
  (await call("GET", "/api/classes/" + rCode + "/roster?token=" + pass)).status, 403);
eq("…nor edit the class",
  (await call("PUT", "/api/classes/" + rCode, { name: "Hijacked", token: pass })).status, 403);
eq("…nor delete it",
  (await call("DELETE", "/api/classes/" + rCode, { token: pass })).status, 403);

/* The teacher can read it back, because children lose things. */
const rRoster = await call("GET", "/api/classes/" + rCode + "/roster?token=" + rToken);
eq("the teacher's roster carries each code", rRoster.data.students[0].pass, pass);

/* But nobody else can: the class code alone still reveals no students. */
const publicView = await call("GET", "/api/classes/" + rCode);
check("the public class view lists no students at all",
  !JSON.stringify(publicView.data).includes("stu-nour") &&
  !JSON.stringify(publicView.data).includes(pass),
  JSON.stringify(publicView.data).slice(0, 200));

/* A removed student's code stops working, like everything else of theirs. */
await call("DELETE", "/api/classes/" + rCode + "/students/stu-nour", { token: rToken });
eq("a removed student's code no longer resumes",
  (await call("POST", "/api/classes/" + rCode + "/resume", { pass })).status, 404);

/* ==================================================== teacher accounts === */
/* Everything above this line ran without a single token, and passed. That is
 * the point: accounts are additive, and a teacher who never signs in keeps the
 * app they had. */

/* ---- a class created while signed in belongs to that account ------------ */
const owned = await call("POST", "/api/classes",
  { name: "French 4", teacher: "Amina", level: 4 }, { auth: "tok-amina" });
eq("a signed-in teacher can create a class", owned.status, 201);
const ownedCode = owned.data.class.code;
check("…which reports itself as owned", owned.data.class.owned === true);
check("…without ever naming the owner",
  !JSON.stringify(owned.data).includes("uid-amina"), JSON.stringify(owned.data));
check("…and still hands back a device token for offline use", !!owned.data.token);

/* The whole point: another device, no token, just the account. */
const mine = await call("GET", "/api/classes/mine", undefined, { auth: "tok-amina" });
eq("signing in elsewhere finds your classes", mine.status, 200);
eq("…all of them", mine.data.classes.length, 1);
eq("…by code", mine.data.classes[0].code, ownedCode);

eq("…and nobody else's", (await call("GET", "/api/classes/mine", undefined,
  { auth: "tok-bruno" })).data.classes.length, 0);
eq("a stranger gets no list at all",
  (await call("GET", "/api/classes/mine")).status, 401);
eq("…nor does a bad token", (await call("GET", "/api/classes/mine",
  undefined, { auth: "bad-token" })).status, 401);

/* ---- the owner can work without the device token ------------------------ */
const edited = await call("PUT", "/api/classes/" + ownedCode,
  { name: "French 4 · période 1", level: 4, assignments: [] }, { auth: "tok-amina" });
eq("the owner can edit with no token", edited.status, 200);
eq("…and it took", edited.data.class.name, "French 4 · période 1");

const ownedRoster = await call("GET", "/api/classes/" + ownedCode + "/roster",
  undefined, { auth: "tok-amina" });
eq("the owner can read the roster with no token", ownedRoster.status, 200);

/* ---- and nobody else can ------------------------------------------------ */
eq("another teacher cannot edit it",
  (await call("PUT", "/api/classes/" + ownedCode, { name: "Hijacked" },
    { auth: "tok-bruno" })).status, 403);
eq("…nor read the roster",
  (await call("GET", "/api/classes/" + ownedCode + "/roster",
    undefined, { auth: "tok-bruno" })).status, 403);
eq("…nor delete it",
  (await call("DELETE", "/api/classes/" + ownedCode, {}, { auth: "tok-bruno" })).status, 403);
eq("…and neither can a stranger with no token at all",
  (await call("PUT", "/api/classes/" + ownedCode, { name: "Hijacked" })).status, 403);
eq("the name survived all that",
  (await call("GET", "/api/classes/" + ownedCode)).data.class.name, "French 4 · période 1");

/* A token for a different Firebase project must not authorise anything. */
const wrongProject = await handleApi(
  new Request("https://chouette.test/api/classes/" + ownedCode, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer tok-amina" },
    body: JSON.stringify({ name: "Hijacked" })
  }), store, { projectId: "someone-else", verify: fakeVerify });
eq("a token minted for another project authorises nothing", wrongProject.status, 403);

/* ---- claiming a class that predates accounts ---------------------------- */
const legacy = await call("POST", "/api/classes", { name: "French 1", teacher: "Amina", level: 1 });
const legacyCode = legacy.data.class.code;
const legacyToken = legacy.data.token;
check("a class made without signing in has no owner", legacy.data.class.owned === false);

eq("claiming needs an account",
  (await call("POST", "/api/classes/" + legacyCode + "/claim", { token: legacyToken })).status, 401);
eq("…and the device token, not just an account",
  (await call("POST", "/api/classes/" + legacyCode + "/claim", { token: "wrong" },
    { auth: "tok-amina" })).status, 403);

const claimed = await call("POST", "/api/classes/" + legacyCode + "/claim",
  { token: legacyToken }, { auth: "tok-amina" });
eq("the real teacher can claim it", claimed.status, 200);
check("…and it is now owned", claimed.data.class.owned === true);
eq("…and shows up in their list",
  (await call("GET", "/api/classes/mine", undefined, { auth: "tok-amina" })).data.classes.length, 2);

/* Claiming twice is a no-op, not an error: a flaky network retries. */
const again = await call("POST", "/api/classes/" + legacyCode + "/claim",
  { token: legacyToken }, { auth: "tok-amina" });
eq("claiming again is harmless", again.status, 200);
check("…and says it was already yours", again.data.already === true);

/* Holding the device token must NOT be enough to take an owned class, or a
 * leaked token would be a way to steal somebody's class outright. */
eq("a claimed class cannot be claimed away by someone else",
  (await call("POST", "/api/classes/" + legacyCode + "/claim", { token: legacyToken },
    { auth: "tok-bruno" })).status, 403);
eq("…and it is still Amina's",
  (await call("GET", "/api/classes/mine", undefined, { auth: "tok-bruno" })).data.classes.length, 0);

/* ---- the old way keeps working, which is the migration --------------- */
eq("the device token still edits an owned class",
  (await call("PUT", "/api/classes/" + legacyCode,
    { name: "French 1 · période 2", level: 1, token: legacyToken })).status, 200);

/* ---- a signed-in stranger is still a stranger ------------------------- */
const unowned = await call("POST", "/api/classes", { name: "French 2", teacher: "Amina", level: 2 });
const unownedCode = unowned.data.class.code;
eq("signing in does not grant access to an unowned class",
  (await call("PUT", "/api/classes/" + unownedCode, { name: "Hijacked" },
    { auth: "tok-bruno" })).status, 403);
eq("…nor to its roster",
  (await call("GET", "/api/classes/" + unownedCode + "/roster",
    undefined, { auth: "tok-bruno" })).status, 403);

/* And the same when identity itself misbehaves — against a class stored
 * before ownerUid existed, which is what is actually sitting in the live KV
 * today. Those records have no such field at all, so a verifier returning
 * "yes" with no uid would compare undefined to undefined, come out true, and
 * hand every pre-existing class to whoever asked. */
await store.put("class:ABCDEF", {
  code: "ABCDEF", name: "French 2 (avant les comptes)", teacher: "Amina", level: 2,
  assignments: [], lists: [], pick: null,
  tokenHash: "not-a-real-hash", createdAt: Date.now(), updatedAt: Date.now()
});
const nobody = await handleApi(
  new Request("https://chouette.test/api/classes/ABCDEF", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer anything" },
    body: JSON.stringify({ name: "Hijacked" })
  }), store, { projectId: PROJECT, verify: async () => ({ ok: true }) });
eq("an identity with no uid matches no class", nobody.status, 403);
eq("…not even one saved before owners existed",
  (await call("GET", "/api/classes/ABCDEF")).data.class.name, "French 2 (avant les comptes)");
check("…which still reports itself unowned",
  (await call("GET", "/api/classes/ABCDEF")).data.class.owned === false);

/* A real signed-in teacher is refused it too — it is not theirs yet. */
eq("a real account cannot edit a pre-accounts class either",
  (await call("PUT", "/api/classes/ABCDEF", { name: "Hijacked" },
    { auth: "tok-bruno" })).status, 403);

/* ---- outages must not hand out access -------------------------------- */
eq("an unreachable Google is not an authorisation",
  (await call("PUT", "/api/classes/" + ownedCode, { name: "Hijacked" }, { auth: "boom" })).status, 403);

/* ---- deleting cleans up the index ------------------------------------ */
eq("the owner deletes their class",
  (await call("DELETE", "/api/classes/" + legacyCode, {}, { auth: "tok-amina" })).status, 200);
eq("…and it leaves their list",
  (await call("GET", "/api/classes/mine", undefined, { auth: "tok-amina" })).data.classes.length, 1);
check("…leaving no owner index behind",
  [...store._map.keys()].filter((k) => k.startsWith("owner:") && k.includes(legacyCode)).length === 0,
  [...store._map.keys()].filter((k) => k.startsWith("owner:")).join(","));

/* ---- the browser has to be allowed to send the header at all ---------- */
const preflight = await call("GET", "/api/health");
check("CORS lets a signed-in browser send Authorization",
  (preflight.headers.get("access-control-allow-headers") || "").toLowerCase().includes("authorization"),
  preflight.headers.get("access-control-allow-headers"));

/* ------------------------------------------------------------- report ----- */
console.log("Chouette ! — sync API tests");
console.log("  " + passed + " assertions passed" + (failures.length ? "" : " — all green ✔"));
if (failures.length) {
  console.error("\n" + failures.length + " FAILED:");
  failures.forEach((f) => console.error("  ✘ " + f));
  process.exit(1);
}
