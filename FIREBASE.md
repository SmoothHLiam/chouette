# Teacher accounts with Firebase

This sets up real sign-in for **teachers** — an email and password, or *Sign in
with Google* — so a class stops living on whichever laptop created it.

**Students are not affected.** They keep joining with the six-character class
code and a display name. No student email, no student password, nothing new
stored about them. That is deliberate: collecting an email from a student under
13 puts you under COPPA, and 13–18 lands in state student-privacy law and
district policy. Teacher-only sidesteps all of it.

Total time: about ten minutes. Cost: nothing, and no credit card.

> **Do this part first.** The app code that uses it comes after — you are
> creating the account this repository will point at. Nothing here changes the
> game until that lands, so you cannot break the version you are running now.

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

## Step 2 — Turn on the two sign-in methods

In the left sidebar: **Build → Authentication**, then **Get started**.

You'll land on a **Sign-in method** tab listing providers.

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

Still in **Authentication**, go to the **Settings** tab, then
**Authorized domains**.

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

## Step 4 — Register the web app and copy the config

1. Click the **gear icon** (top left, next to *Project Overview*) →
   **Project settings**.
2. Scroll to **Your apps** and click the **web** icon — `</>`.
3. Give it a nickname (`Chouette web`). **Leave *Firebase Hosting* unchecked** —
   your site is already on Vercel and Cloudflare; you don't want a third.
4. Click **Register app**.

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

## When something goes wrong

| What you see | What it means |
| --- | --- |
| Popup opens then closes, nothing happens | The domain isn't in **Authorized domains** — Step 3. Check `www` too. |
| `auth/unauthorized-domain` | Same thing, said out loud. |
| `auth/operation-not-allowed` | That provider isn't switched on — Step 2. |
| `auth/popup-blocked` | The browser blocked it. Sign-in has to start from a real click, which it does; allow popups for the site. |
| Google button missing the support email | Step 2 was saved without one. Reopen the Google provider and fill it in. |
| A page asking for a credit card | You've drifted to the Blaze plan. Go back; Spark covers all of this. |

If the console doesn't match what's written here, tell me what you actually see
on screen — the sidebar changes wording every few months and I'd rather fix
this page than have you guess.
