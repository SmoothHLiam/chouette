/* Chouette ! — Firebase token verification tests.
 *
 * Runs against a keypair generated here, with a fake JWKS endpoint, so there
 * is no network and no Firebase project involved. What is being tested is
 * whether our checks reject the tokens they should — which is the only part
 * we wrote.
 */
import { webcrypto } from "node:crypto";
import { verifyFirebaseToken, resetKeyCache } from "../worker/jwt.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

let passed = 0;
const failures = [];
function check(name, condition, detail) {
  if (condition) { passed++; return; }
  failures.push(name + (detail ? "  →  " + detail : ""));
}
function eq(name, actual, expected) {
  check(name, actual === expected, "got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected));
}

const PROJECT = "chouette-d1106";
const KID = "test-key-1";

/* ------------------------------------------------------------- fixtures -- */
const pair = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true, ["sign", "verify"]
);
const otherPair = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true, ["sign", "verify"]
);

const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
const JWKS = { keys: [{ kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e, alg: "RS256", use: "sig", kid: KID }] };

let fetches = 0;
function fakeFetch(cacheControl) {
  return async () => {
    fetches++;
    return {
      ok: true,
      headers: { get: (h) => (h.toLowerCase() === "cache-control" ? cacheControl : null) },
      json: async () => JWKS
    };
  };
}

function b64url(bytes) {
  return Buffer.from(bytes).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function encodePart(obj) { return b64url(new TextEncoder().encode(JSON.stringify(obj))); }

const NOW = 1_770_000_000_000;              // a fixed "now", in ms
const nowFn = () => NOW;
const seconds = Math.floor(NOW / 1000);

async function mint(overrides = {}, opts = {}) {
  const header = { alg: "RS256", kid: KID, typ: "JWT", ...(opts.header || {}) };
  const payload = {
    iss: "https://securetoken.google.com/" + PROJECT,
    aud: PROJECT,
    sub: "uid-abc123",
    auth_time: seconds - 60,
    iat: seconds - 60,
    exp: seconds + 3600,
    email: "prof@example.com",
    email_verified: true,
    name: "Mme Bernard",
    firebase: { sign_in_provider: "password" },
    ...overrides
  };
  const body = encodePart(header) + "." + encodePart(payload);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", (opts.key || pair).privateKey, new TextEncoder().encode(body)
  );
  return body + "." + b64url(new Uint8Array(signature));
}

const verify = (token, project = PROJECT, extra = {}) => {
  resetKeyCache();
  return verifyFirebaseToken(token, project, { fetchImpl: fakeFetch("max-age=3600"), now: nowFn, ...extra });
};

/* ---------------------------------------------------------- the happy path */
const good = await verify(await mint());
check("a genuine token is accepted", good.ok, good.error);
eq("…and yields the uid", good.uid, "uid-abc123");
eq("…the email", good.email, "prof@example.com");
eq("…whether it was verified", good.emailVerified, true);
eq("…the display name", good.name, "Mme Bernard");
eq("…and how they signed in", good.provider, "password");

/* ------------------------------------------------------------- forgeries */
/* Each of these is a token that would let somebody in as a teacher of their
 * choosing if the corresponding check were missing. */

const forged = await verify(await mint({}, { key: otherPair }));
eq("a token signed with the wrong key is refused", forged.error, "bad-signature");

const tampered = await mint();
const parts = tampered.split(".");
const swapped = parts[0] + "." + encodePart({
  iss: "https://securetoken.google.com/" + PROJECT, aud: PROJECT, sub: "somebody-else",
  iat: seconds - 60, exp: seconds + 3600
}) + "." + parts[2];
eq("editing the payload breaks the signature", (await verify(swapped)).error, "bad-signature");

/* "alg": "none" is the classic. It must die before any key is looked at. */
const unsigned = encodePart({ alg: "none", kid: KID, typ: "JWT" }) + "." +
  encodePart({ iss: "https://securetoken.google.com/" + PROJECT, aud: PROJECT, sub: "uid-abc123",
               iat: seconds - 60, exp: seconds + 3600 }) + ".";
eq("an unsigned token is refused", (await verify(unsigned)).error, "bad-alg");

/* A real, correctly signed Google token — for somebody else's project. */
const otherAudience = await mint({ aud: "someone-elses-project" });
eq("a token for another project is refused", (await verify(otherAudience)).error, "wrong-audience");
eq("…and so is checking ours against another", (await verify(await mint(), "other-project")).error, "wrong-audience");

const otherIssuer = await mint({ iss: "https://securetoken.google.com/evil" });
eq("a token from another issuer is refused", (await verify(otherIssuer)).error, "wrong-issuer");

eq("an expired token is refused",
  (await verify(await mint({ exp: seconds - 3600, iat: seconds - 7200 }))).error, "expired");
eq("a token from the future is refused",
  (await verify(await mint({ iat: seconds + 3600, exp: seconds + 7200 }))).error, "not-yet-valid");
eq("…including one signed in after now",
  (await verify(await mint({ auth_time: seconds + 3600 }))).error, "not-yet-valid");

/* An empty subject would match an empty ownerUid on an unclaimed class. */
eq("a token with no subject is refused", (await verify(await mint({ sub: "" }))).error, "no-subject");
eq("…or a non-string one", (await verify(await mint({ sub: 12 }))).error, "no-subject");

eq("a token signed by an unpublished key is refused",
  (await verify(await mint({}, { header: { kid: "not-a-real-kid" } }))).error, "unknown-key");
eq("a token with no kid is refused",
  (await verify(await mint({}, { header: { kid: undefined } }))).error, "no-kid");

eq("gibberish is refused", (await verify("not-a-token")).error, "malformed");
eq("…and so is an empty string", (await verify("")).error, "no-token");
eq("…and three segments of nonsense", (await verify("a.b.c")).error, "malformed");
eq("no project means no", (await verify(await mint(), "")).error, "no-project");

/* Right up to the edge: a minute of clock skew is allowed, an hour is not. */
check("a token that expired seconds ago still passes, for clock drift",
  (await verify(await mint({ exp: seconds - 30 }))).ok);
eq("…but one that expired minutes ago does not",
  (await verify(await mint({ exp: seconds - 600 }))).error, "expired");

/* --------------------------------------------------------- the key cache */
resetKeyCache();
fetches = 0;
const opts = { fetchImpl: fakeFetch("public, max-age=3600"), now: nowFn };
await verifyFirebaseToken(await mint(), PROJECT, opts);
await verifyFirebaseToken(await mint(), PROJECT, opts);
await verifyFirebaseToken(await mint(), PROJECT, opts);
eq("the key set is fetched once, not once per request", fetches, 1);

/* Past the max-age it refetches, or a rotation would never be picked up. */
let clock = NOW;
resetKeyCache();
fetches = 0;
const moving = { fetchImpl: fakeFetch("max-age=60"), now: () => clock };
await verifyFirebaseToken(await mint(), PROJECT, moving);
clock = NOW + 61_000;
await verifyFirebaseToken(await mint({ exp: seconds + 7200 }), PROJECT, moving);
eq("…and again once Google's max-age is up", fetches, 2);

/* If Google is unreachable, keys we already hold beat locking everyone out. */
resetKeyCache();
await verifyFirebaseToken(await mint(), PROJECT, opts);
const brokenFetch = async () => ({ ok: false, headers: { get: () => null }, json: async () => ({}) });
clock = NOW;
const afterOutage = await verifyFirebaseToken(await mint(), PROJECT, { fetchImpl: brokenFetch, now: nowFn });
check("a failed key fetch falls back to the cached set", afterOutage.ok, afterOutage.error);

/* With nothing cached there is no safe answer, so it throws rather than
 * quietly returning "not ok", which a caller could mistake for a bad token. */
resetKeyCache();
let threw = "";
try {
  await verifyFirebaseToken(await mint(), PROJECT, { fetchImpl: brokenFetch, now: nowFn });
} catch (e) {
  threw = e.message;
}
eq("with no keys at all it raises, rather than looking like a bad token", threw, "jwks-unavailable");

/* ------------------------------------------------------------- report -- */
console.log("Chouette ! — Firebase token tests");
console.log("  " + passed + " assertions passed" + (failures.length ? "" : " — all green ✔"));
if (failures.length) {
  console.error("\n" + failures.length + " FAILED:");
  failures.forEach((f) => console.error("  ✘ " + f));
  process.exit(1);
}
