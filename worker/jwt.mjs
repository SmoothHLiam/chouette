/* Chouette ! — checking that a Firebase ID token really is one.
 *
 * A teacher signs in with Firebase, the browser gets a signed token, and this
 * decides whether to believe it. Firebase signs with a private key we never
 * see and publishes the matching public keys, which rotate every few hours; we
 * fetch those, cache them for as long as Google says to, and verify.
 *
 * Every check here matters, and skipping any one of them is the whole bug:
 *   · the signature, or anybody can write their own token;
 *   · `aud`, or a token minted for somebody else's Firebase project is
 *     perfectly valid and lets them in as whoever they like;
 *   · `iss`, same reasoning from the other side;
 *   · `exp`, or a token stolen last year still works;
 *   · `sub`, because an empty subject would match an empty ownerUid.
 *
 * `fetchImpl` and `now` are injectable so the tests can run against their own
 * keypair with no network and no waiting.
 */

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

/* Clocks drift. A minute of slack either way is the usual allowance, and it is
 * far short of anything that would make a stolen token useful. */
const SKEW_SECONDS = 60;

/* If Google sends no Cache-Control we still cache, or every single request
 * would fetch the key set. Capped so a stuck cache cannot outlive a rotation
 * by long. */
const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;

let cache = { keys: null, expires: 0 };

/** Forgets the cached key set. Tests use it; nothing else needs to. */
export function resetKeyCache() {
  cache = { keys: null, expires: 0 };
}

function base64UrlToBytes(text) {
  const padded = String(text).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "===".slice((padded.length + 3) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function decodeJson(segment) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment)));
}

function maxAgeMs(response) {
  const header = response.headers && response.headers.get("cache-control");
  const match = header && header.match(/max-age\s*=\s*(\d+)/i);
  if (!match) return DEFAULT_TTL_MS;
  return Math.min(Math.max(parseInt(match[1], 10), 0) * 1000, MAX_TTL_MS);
}

async function keySet(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const nowMs = options.now ? options.now() : Date.now();
  if (cache.keys && cache.expires > nowMs) return cache.keys;

  const response = await fetchImpl(options.jwksUrl || JWKS_URL);
  if (!response || !response.ok) {
    /* Stale keys beat no keys: a signature that verified an hour ago is far
     * more likely still genuine than Google having rotated in the last minute,
     * and the alternative is locking every teacher out over a blip. */
    if (cache.keys) return cache.keys;
    throw new Error("jwks-unavailable");
  }
  const body = await response.json();
  const keys = {};
  (body.keys || []).forEach((key) => { if (key.kid) keys[key.kid] = key; });
  cache = { keys, expires: nowMs + maxAgeMs(response) };
  return keys;
}

/**
 * Verifies `idToken` for `projectId`.
 * Resolves to { ok: true, uid, email, emailVerified, name, provider }
 * or { ok: false, error } — never throws for a bad token, only for a broken
 * key fetch, because those two want very different responses.
 */
export async function verifyFirebaseToken(idToken, projectId, options) {
  options = options || {};
  if (!projectId) return { ok: false, error: "no-project" };
  if (typeof idToken !== "string" || !idToken) return { ok: false, error: "no-token" };

  const parts = idToken.split(".");
  if (parts.length !== 3) return { ok: false, error: "malformed" };

  let header, payload;
  try {
    header = decodeJson(parts[0]);
    payload = decodeJson(parts[1]);
  } catch (e) {
    return { ok: false, error: "malformed" };
  }

  /* "alg": "none" is the oldest trick there is. Only RS256 is ever acceptable
   * here, and it is checked before anything touches a key. */
  if (header.alg !== "RS256") return { ok: false, error: "bad-alg" };
  if (!header.kid) return { ok: false, error: "no-kid" };

  const keys = await keySet(options);
  const jwk = keys[header.kid];
  /* An unknown kid usually means the keys rotated since we cached them. */
  if (!jwk) return { ok: false, error: "unknown-key" };

  let publicKey;
  try {
    publicKey = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch (e) {
    return { ok: false, error: "bad-key" };
  }

  const signed = new TextEncoder().encode(parts[0] + "." + parts[1]);
  const signature = base64UrlToBytes(parts[2]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", publicKey, signature, signed
  );
  if (!valid) return { ok: false, error: "bad-signature" };

  const nowSeconds = Math.floor((options.now ? options.now() : Date.now()) / 1000);

  if (payload.aud !== projectId) return { ok: false, error: "wrong-audience" };
  if (payload.iss !== "https://securetoken.google.com/" + projectId) {
    return { ok: false, error: "wrong-issuer" };
  }
  if (!Number.isFinite(payload.exp) || payload.exp + SKEW_SECONDS < nowSeconds) {
    return { ok: false, error: "expired" };
  }
  if (Number.isFinite(payload.iat) && payload.iat - SKEW_SECONDS > nowSeconds) {
    return { ok: false, error: "not-yet-valid" };
  }
  /* auth_time is when they actually proved who they were. A token can be
   * refreshed long after; it must still point at a real sign-in. */
  if (Number.isFinite(payload.auth_time) && payload.auth_time - SKEW_SECONDS > nowSeconds) {
    return { ok: false, error: "not-yet-valid" };
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    return { ok: false, error: "no-subject" };
  }

  return {
    ok: true,
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : "",
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : "",
    provider: payload.firebase && payload.firebase.sign_in_provider
      ? String(payload.firebase.sign_in_provider) : ""
  };
}

export const JWKS_ENDPOINT = JWKS_URL;
