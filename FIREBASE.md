# Teacher accounts with Firebase

This sets up real sign-in for **teachers** — an email and password, or *Sign in
with Google* — so a class stops living on whichever laptop created it.

**Students are not affected.** They keep joining with the six-character class
code and a display name. No student email, no student password, nothing new
stored about them. That is deliberate: collecting an email from a student under
13 puts you under COPPA, and 13–18 lands in state student-privacy law and
district policy. Teacher-only sidesteps all of it.

Total time: about ten minutes. Cost: nothing, and no credit card.

> **The code is in.** `chouette-d1106` is wired up in `js/firebase-config.js`
> and `worker/wrangler.toml`. If you have already been through the steps below,
> skip to [Turning it on](#turning-it-on) at the end.

---

## What you'll end up with

Five short lines of configuration to paste back, which go straight into the
repository. **None of them are secret** — more on that at the end.

---

## Step 1 — Create the project

1. Go to <https://console.firebase.google.com> and sign in with any Google
   account. A personal Gmail is fine; a school Google account is also fine.
2. Click **Create a project** (it may say **Add project**).
3. Name it something you'll recognise — `chouette` is fine. Firebase will add
   a few random characters to make the ID unique; that's normal.
4. **Turn Google Analytics off.** The toggle is on by default.
   - You don't need it, and for a school app it is one less thing collecting
     data about minors. Leaving it off also skips two extra setup screens.
   - If you are asked about *Gemini in Firebase* or any other add-on, you can
     decline that too.
5. Click **Create project**, wait for it to finish, then **Continue**.

**No credit card is required.** The free *Spark* plan covers this completely —
email and Google sign-in are free up to 50,000 signed-in users a month, which
is about 49,900 more teachers than you need. If you ever land on a page asking
for payment details, you've wandered into the *Blaze* plan; go back.

---

## A note on finding things

Firebase moves its sidebar around every few months, so each step below leads
with a **direct link** rather than a menu path. The `_` in those links means
"my current project" and Firebase resolves it for you. If one doesn't, replace
`_` with your project ID — it's the part of the address bar after `/project/`
when you're inside the project, something like `chouette-1a2b3`.

One thing to know before you hunt for a menu: **the product sidebar only exists
once you are inside a project.** If you're looking at a grid of project cards,
there is no Authentication link anywhere on the page — click into the project
first. Your project's name sitting at the top of the left panel is how you know
you're in.

---

## Step 2 — Turn on the two sign-in methods

<https://console.firebase.google.com/project/_/authentication/providers>

If you'd rather navigate: it is **Authentication** in the left sidebar, possibly
under a **Build** heading. Click **Get started** the first time.

You want the **Sign-in method** tab, listing providers.

### Email/Password

1. Click **Email/Password**.
2. Turn on the first toggle, **Email/Password**.
3. Leave **Email link (passwordless sign-in)** off.
4. **Save**.

### Google

1. Click **Add new provider** if you need to, then **Google**.
2. Turn the toggle on.
3. Fill in the two fields it asks for:
   - **Public-facing name** — what people see on the Google sign-in screen.
     Put `Chouette !` or `Chouette Learning`.
   - **Project support email** — pick your address from the dropdown.
4. **Save**.

> **Worth knowing:** that support email is shown on the Google consent screen to
> anyone who signs in. It is meant to be — it tells teachers who they are
> trusting. If you'd rather that not be your personal address, use a school one
> or make a dedicated account before you do this step.

---

## Step 3 — Authorise your domains

This is the step people miss, and the failure is confusing: sign-in opens a
popup that closes immediately and nothing happens.

<https://console.firebase.google.com/project/_/authentication/settings>

Or: **Authentication**, the **Settings** tab, then **Authorized domains**.

`localhost` is already there. Click **Add domain** and add, one at a time:

```
chouettelearning.com
www.chouettelearning.com
```

Add your `workers.dev` address too if you use it directly — the whole hostname,
no `https://`, no trailing slash.

Vercel serves both the bare domain and `www`, and Firebase treats them as
different places. Add both or one of them will silently fail.

---

## Step 3b — Let Google redirect back to your own domain

**Do this one, or Google sign-in will fail** with `redirect_uri_mismatch` or
"missing initial state".

Here is the problem it solves. Firebase's sign-in handler normally lives at
`chouette-d1106.firebaseapp.com`. Your app lives at `chouettelearning.com`.
Those are different origins, and every current browser now **partitions
storage between them** — so the note the handler writes before sending a
teacher off to Google is unreadable when Google sends them back, and sign-in
dies on the doorstep with *"Unable to process request due to missing initial
state."*

The fix is to serve that handler from your own domain. `vercel.json` already
does the proxying; Google just has to be told the new address is legitimate.

1. Go to the **Google Cloud** console — a different console from Firebase, but
   the same project:
   <https://console.cloud.google.com/apis/credentials>
2. Make sure `chouette-d1106` is the project in the picker at the top.
3. Under **OAuth 2.0 Client IDs**, click the one Firebase made for you. It is
   usually called *Web client (auto created by Google Service)*.
4. Under **Authorised redirect URIs**, click **Add URI** and add both:

   ```
   https://chouettelearning.com/__/auth/handler
   https://www.chouettelearning.com/__/auth/handler
   ```

   Leave the existing `chouette-d1106.firebaseapp.com` one alone — it is still
   what localhost and any other host use.
5. **Save.** Google says changes can take a few minutes; in practice it is
   usually seconds, but if it still fails immediately, wait five and retry
   before changing anything else.

---

## Step 4 — Register the web app and copy the config

<https://console.firebase.google.com/project/_/settings/general>

Or: the **gear icon** near your project's name → **Project settings**.

1. Scroll to **Your apps** and click the **web** icon — `</>`.
2. Give it a nickname (`Chouette web`). **Leave *Firebase Hosting* unchecked** —
   your site is already on Vercel and Cloudflare; you don't want a third.
3. Click **Register app**.

Firebase now shows you a code block. **Ignore the code, copy the values.**

It will look roughly like this:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "chouette-1a2b3.firebaseapp.com",
  projectId: "chouette-1a2b3",
  storageBucket: "chouette-1a2b3.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456"
};
```

Paste that whole block back to me. I need `apiKey`, `authDomain`, `projectId`
and `appId`; the other two are harmless to include.

**Already done** — the values for `chouette-d1106` are in
`js/firebase-config.js`. This step is here for the next project, or if you ever
start again.

> **Why ignore the code?** Firebase's sample uses `<script type="module">` and
> `import` statements. Chouette deliberately uses plain script tags so the game
> still runs when you double-click `index.html` with no server and no internet.
> Pasting Firebase's snippet as-is would break that. I'll wire up the right
> build — you only need the values.

---

## Step 5 — Nothing else

Specifically, **do not** turn on Firestore or the Realtime Database.

You don't need them: your classes, rosters and homework stay in Cloudflare,
where they already are, and Firebase is only being asked *who is this person*.
Creating a database you don't use means creating security rules you don't
watch, and Firebase's own shortcut for that is a "test mode" that leaves
everything world-readable for 30 days. Skip it entirely.

---

## What's secret here, and what isn't

Short answer: **nothing above is secret.** All of it goes in the repository and
onto GitHub, exactly like `syncUrl` does today.

That surprises people, because it is called an *API key*. Firebase's web
`apiKey` is not a password — it identifies your project, it doesn't authorise
anything. Every visitor's browser downloads it by design; you can read
Firebase's own key out of any site that uses it. What actually protects your
project is the authorised-domain list from Step 3 and the rules on the server.

So: paste the config here without worrying, and don't go looking for a secret
to hide. There isn't one. (If you ever add a *service account* JSON file —
a different thing entirely — **that** one is a real secret and never goes in
the repository.)

---

## Turning it on

Two deploys, because the two halves live in different places.

1. **The site** (the sign-in screen itself) goes out with your next push —
   Vercel rebuilds on its own.
2. **The Worker** has to be redeployed by hand, or it will not know your
   project exists and will keep refusing every token:

   ```bash
   cd worker
   npx wrangler deploy
   ```

Then check it took: **Réglages → Compte** should offer a teacher *Se
connecter*, and signing in should land you back on your dashboard.

### What happens the first time you sign in

Any class already on that device gets attached to your account — quietly, once.
After that it is yours on every device you sign in to, and losing the laptop
stops meaning losing the class.

Your existing classes are untouched by all of this. They keep their codes,
their rosters and their homework, and they keep working on devices that never
sign in at all.

### On a shared classroom computer

**Sign out when you're done.** The next person to open the app on that machine
would otherwise be you, with your classes in front of them. It is in
**Réglages → Compte**, and signing out deletes nothing — your classes are on
your account, and signing back in brings them straight back.

### Optional: lock the key to your domain

Not required, and nothing breaks without it. If you want the tidier setup, the
`apiKey` can be restricted to your own site so nobody else's page can spend
your quota with it: Google Cloud console → *APIs & Services* → *Credentials* →
your browser key → *Application restrictions* → *Websites*, then add
`chouettelearning.com/*`. Get it wrong and sign-in stops working, so it is a
thing to do when you have five spare minutes, not before a lesson.

---

## When something goes wrong

| What you see | What it means |
| --- | --- |
| "Unable to process request due to missing initial state" | Step 3b. The sign-in handler is being served from a different origin than the app, so the browser partitioned away the state it needed. |
| `redirect_uri_mismatch` | Step 3b, and check you added *both* the bare domain and `www`. |
| Google sign-in never opens a popup | Expected on a phone and in the installed app — there is nowhere to put one, so it redirects instead. If nothing happens at all, it is Step 3b. |
| Popup opens then closes, nothing happens | The domain isn't in **Authorized domains** — Step 3. Check `www` too. |
| `auth/unauthorized-domain` | Same thing, said out loud. |
| `auth/operation-not-allowed` | That provider isn't switched on — Step 2. |
| `auth/popup-blocked` | The browser blocked it. Sign-in has to start from a real click, which it does; allow popups for the site. |
| Google button missing the support email | Step 2 was saved without one. Reopen the Google provider and fill it in. |
| A page asking for a credit card | You've drifted to the Blaze plan. Go back; Spark covers all of this. |
| No **Build** heading, or no sidebar at all | You're on the project list, not inside the project. Click the project card first — or just use the direct links above. |

If the console doesn't match what's written here, tell me what you actually see
on screen — the sidebar changes wording every few months and I'd rather fix
this page than have you guess.
