/* Chouette ! — Cloudflare Worker entry point.
 *
 * Serves the game's static files AND the sync API from one origin, so the app
 * needs no configuration: it just talks to /api on whatever host it came from.
 *
 * Deploy:  npx wrangler kv namespace create CHOUETTE
 *          (put the id in wrangler.toml, then)  npx wrangler deploy
 */
import { handleApi } from "./api.mjs";

/** The store the API expects, backed by Workers KV. */
function kvStore(kv) {
  return {
    async get(key) {
      return await kv.get(key, "json");
    },
    async put(key, value) {
      await kv.put(key, JSON.stringify(value));
    },
    async delete(key) {
      await kv.delete(key);
    },
    async list(prefix) {
      const out = [];
      let cursor;
      do {
        const page = await kv.list({ prefix, cursor });
        for (const entry of page.keys) {
          out.push({ key: entry.name, value: await kv.get(entry.name, "json") });
        }
        cursor = page.list_complete ? null : page.cursor;
      } while (cursor);
      return out;
    }
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.CHOUETTE) {
        return new Response(
          JSON.stringify({ ok: false, error: "KV namespace CHOUETTE is not bound." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      /* The Firebase project id is public — it is in the client's config too —
       * so it is a plain var in wrangler.toml, not a secret. Without it the
       * API simply ignores sign-in and everything works on device tokens. */
      return handleApi(request, kvStore(env.CHOUETTE), {
        projectId: env.FIREBASE_PROJECT_ID || ""
      });
    }
    // Everything else is the game itself, served by Workers Assets.
    return env.ASSETS.fetch(request);
  }
};
