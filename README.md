# Chouette ! 🦉

Chouette is an open-source and free to use education site for French throughout middle and high school. Teachers can easily create classes from French 1 through AP French. Our goal is to provide all service necessary to make learning more fun for the students, and giving the French teachers whatever it is they may need all in one place.



## Installing it, and playing with no signal

On any http(s) address the browser offers to install Chouette !; **Réglages →
Application** has a button for it, and on iOS it is *Partager → Sur l'écran
d'accueil*. Installed, it opens from the home screen like any other app.

More to the point, it works with **no network at all**. Every mini-game, all 334
words, every sentence and the whole conjugation engine are static files, so a
service worker caches them once and the app plays on a bus, in a cafeteria, or
on school wifi that half works. Only joining a class and handing homework in
need the network, and those already queue and retry.

Two rules in `sw.js` are deliberate:

* `/api/*` is **never** cached, on any origin. A stale roster or a stale
  homework list is worse than no answer, and the sync layer already copes with a
  failed call.
* The page itself is fetched from the network first, so a redeploy shows up on
  the next visit rather than whenever a cache decides to expire.

The cached file list is written out by hand in `sw.js`, and `npm test` fails if
it drifts from what `index.html` actually loads — in either direction. Offline
breakage is otherwise invisible to whoever made it.

Opened by double-clicking `index.html`, none of this runs and nothing breaks:
service workers need http(s), and the app was built to work from a `file://`
page in the first place.

## Student accounts

For **students**, sign-in is local and password-free on purpose. They are often
minors, and nothing a student does here needs an email address, so there is no need to collect any information.

* An account is a name, a role and a private profile. Several accounts can live
  on the same browser, so a shared classroom computer keeps everyone's XP,
  streaks and homework apart.
* The role question is first, and returning players get a one-tap "Déjà venu ?"
  row to jump straight back in.
* Switch accounts any time from **Profil → Compte**.

Nothing about a student is uploaded except what their teacher already sees: a
display name, XP, and which homework is done.

### Teacher accounts

**Teachers** get the same, plus the option of a real account — an email and
password, or *Sign in with Google*, through Firebase. It exists for exactly one
reason: a class used to live on whichever laptop created it, and losing the
laptop meant losing the class. Signed in, your classes follow you to any device.

It is built to stay out of the way:

* **Optional, always.** The name-only path is still right there under the
  sign-in form, and it is what works offline, on a borrowed computer, and from
  a `file://` page where Firebase cannot run at all. Every failure — no network,
  a blocked CDN, a closed popup — leaves you on the old path, working.
* **Loaded on demand.** The Firebase SDK is fetched the first time somebody
  presses a sign-in button. Opening the app doesn't fetch it, and neither does
  drawing the form. A student never downloads it at all.
* **Additive on the server.** A class can be reached two ways: the device token
  it has always had, or the account that owns it. Nothing that worked before
  stopped working — the whole pre-existing API suite passed untouched.
* **Claimed, not orphaned.** Signing in attaches the classes already on that
  device to your account, once. Classes made before any of this existed keep
  working either way.
* **We never see a password.** Firebase takes it. The Worker gets a signed
  token and checks the signature, the audience, the issuer and the expiry
  itself — see `worker/jwt.mjs`, where each of those checks has a test that
  mints exactly the forged token it is there to stop.

Setup is in [FIREBASE.md](FIREBASE.md). Students are untouched throughout: no
student email, no student password, and the reason why is at the top of that
page.

---

## For teachers

**Profil → Teacher** gives you a dashboard: a class, a code, assignments and a
roster.

1. **Create a class.** You get a six-character code — `ZBK-S9U` — drawn from an
   alphabet with no `0/O` or `1/I/L`, because it gets read aloud and copied off
   a whiteboard.
2. **Set assignments.** Pick a mini-game and a goal:

   | Goal | Example |
   | --- | --- |
   | Terminer une partie | any completed game |
   | Bonnes réponses | *Éclair Rapide — 20 bonnes réponses* |
   | Score à atteindre | *Duel Le / La — 600 points* |
   | Précision minimum | *80 % de précision* (ignores 2-answer flukes) |
   | Combo à atteindre | *un combo de 10* |
   | Battre le boss | *Le Défi du Boss* |

   Add a due date and a note if you want. The game checks the goal itself when a
   student finishes a round — nothing to mark, and it only ever pays out once.
3. **Watch the roster.** Students on the same device appear automatically.

### Fiches à imprimer

Not every lesson is a screen lesson. **Fiches à imprimer** turns any of your
word lists — or the game's own bank — into paper, in the browser, with no
request to anything:

| Format | What comes out |
| --- | --- |
| Contrôle | Numbered prompts with a ruled line, French → English or the other way, optional corrigé on its own page |
| Liste d'étude | A two-up reference sheet to take home |
| Cartes à découper | A 3 × 3 grid to cut up, with the backs mirrored so a double-sided print (flipped on the long edge) lands each translation behind its own word |
| Tableaux de conjugaison | Blank tables for six verbs in any tense the class has met, plus the filled-in corrigé |

*Mélanger l'ordre* is on by default, so printing the same contrôle twice gives
you an A version and a B version. The preview shows exactly what the printer
gets; **Imprimer** opens the normal print dialogue, where *Save as PDF* works
just as well for posting it to Google Classroom.

The sheet looks the same in both skins — it is paper, so it is black on white
either way.

### Exporting to your gradebook

**Exporter (CSV)** above the roster downloads the whole class: a row per
student, their XP, a column per assignment holding the score they got, and the
date you last saw them. A blank cell means *not handed in*; `0` means they
handed in a zero, which is a different thing.

It opens straight into Excel, Numbers or Google Sheets with the accents intact,
and it is built from the roster the dashboard already has — no extra request, no
sync write, and it works with the server switched off.

### Your own word lists

The vocabulary, sentences and grammar that ship with the game stay exactly as
they are — they are the default for every assignment. **Tes listes** on the
dashboard adds your own on top, without touching a file or redeploying
anything.

Paste the list you already have, one entry per line:

```
le chien = dog
la maison = house
l'eau (f) = water
manger = to eat
```

Separate the two halves with `=`, a tab (so a column pasted straight out of a
spreadsheet works), or `;`. Write `le`/`la`/`un`/`une` and the game learns the
gender, which is what lets a list drive **Duel Le / La**; `l'` hides it, so add
`(m)` or `(f)`. There is a switch for lists written English-first. As you type,
the editor shows what it read, names any line it could not, and lists the games
your list can drive.

Lists can also hold whole sentences, for **Construis la Phrase** and listening.

When you set an assignment, **Contenu** chooses between the built-in bank and
one of your lists. Games a list cannot drive are disabled with the reason
attached — a word list will not run the phrase builder, and a list without
genders will not run the gender duel. Students can also practise any of the
class's lists freely from their home screen, and lists travel with the class
through both sync and invite codes.


### The word of the day, chosen by you

**Le mot du prof** on the dashboard puts one word on your students' home screens
for the day. It sits under the automatic *mot du jour*, carries the same
tap-to-hear button, and shows its English underneath. Pick nothing and students
simply do not see the card; yesterday's word expires on its own.

If the word is found, the English fills itself in as you type, looked up in your own 
lists first, then the game's 334 words and every verb in its engine — including 
when you skip the accents. This is deliberately a local lookup rather than a 
translation service: it is instant, works offline, costs nothing, needs no API key, 
and sends nothing about your class to anyone else. A word the app does not know just 
needs you to type the translation, which is one field.


### Getting a class onto other devices

**With sync switched on** (see *Deploying* below), there is nothing to it: write
the six-character code on the board, students type it once on whatever device
they have, and they appear on your roster — before they have played anything.
Finished homework lands there on its own too.

**Without a server**, a class still travels, just by hand:

* **The short code** (`ZBK-S9U`) works for students on the same computer.
* **The invite code** (`CHOU1.…`) carries the whole class — name, level and
  every assignment — so a student on any other device can join by pasting it.
* **Progress codes** (`CHOUP1.…`) go the other way: a student copies one from
  their profile, you paste it into **Élèves → Coller des résultats**.

These remain the fallback whenever the network is down, so a dropped connection
never means a stuck lesson. Both are plain UTF-8 JSON in base64, so accented
class names survive the trip.

---



---

## The loop

Progress is the point, so the game keeps score in five different ways:

| System | What it does |
| --- | --- |
| **XP & ranks** | 10 ranks from 🐌 *Petit Escargot* to 👑 *Légende Francophone*. |
| **Croissants 🥐** | Earned every game, spent in the shop on themes and avatars. |
| **Streak 🔥** | One game a day keeps it alive. Miss a day and it resets. |
| **Missions du jour** | Three daily quests, rerolled each morning, paid out instantly. |
| **Badges** | 18 achievements — perfect games, 20× combos, night owls, boss hunters. |
| **Mot du jour** | One word a day on the home screen, the same one for everyone at that level, with a tap to hear it. |
| **Le mot du prof** | A word the teacher chooses for today, shown under the mot du jour — and nowhere at all if they haven't chosen one. |
| **Two looks** | A colourful arcade skin and a quiet minimal one, swapped in **Réglages → Apparence**. |
| **Devoirs** | Assignments from your teacher, worth 75 🥐 and 100 XP each. |

Every correct answer builds a **combo**; every five steps of combo bumps the
point multiplier, up to 4×. Wrong answers reset it. That single mechanic is what
turns "answer 30 questions" into something worth chasing.

---

## Two designs, one app

The game ships with two complete visual identities, chosen in
**Réglages → Apparence**:

* **Coloré** — the original arcade look: dark, saturated, confetti, and the six
  unlockable themes from the shop.
* **Minimal** — a quiet light product look in DM Sans and Newsreader, easier to
  read for long stretches and far less shouty on a classroom projector.

They are kept genuinely separate. `css/base.css`, `layout.css` and `games.css`
are the colourful identity; `css/redesign.css` is the minimal one, layered on
top and **enabled or disabled as a whole**. Switching skins toggles that single
stylesheet rather than rewriting either design, so neither can be lost to make
the other work, and anything added later gets its minimal styling from a
`[data-skin="minimal"]` block in `layout.css` — `redesign.css` itself is never
edited.

Display settings (skin, text size, animations, and the two accommodations
below) are stored per **device** rather than per account: they describe the screen in front of you, they are applied by
a small inline script before the first paint so nobody sees a flash of the wrong
design, and on a shared classroom computer the display should not change every
time a different student signs in.

Alongside the skin, **Réglages** carries text size (normal / grand / très
grand, which scales the whole interface), animations (complètes / calmes —
calm mode drops confetti, flashes and screen shake for anyone who finds them
distracting), sound, the French voice and which voice to use, the class level,
account switching, sync status, and starting over.

### Accessibility

**Réglages → Accessibilité** has two settings that exist for students who need
them:

* **Lecture du texte — Espacée.** Wider letter spacing, word spacing and line
  height, in a face whose letters are harder to confuse. Deliberately *not* an
  OpenDyslexic setting: the studies that have tested those fonts did not find
  the special letterforms helped, while wider spacing did — so this ships the
  spacing and not the claim. It overrides the font variable, so it works in
  both skins without either design knowing about it, and it stops at the edge
  of a printed sheet.
* **Temps dans les jeux — normal / temps et demi / double temps / sans
  chrono.** Extended time, worded the way a 504 plan words it, and it reaches
  the clock inside the games rather than only the screen. *Sans chrono* removes
  the timer entirely; the meter counts right answers instead and you end the
  round with the ✕, which records it exactly as running out of time would.

Neither is sent anywhere, written to the roster or included in the CSV export.
What a student is entitled to is nobody else's business — including their
teacher's, unless they choose to say.

---

### Bosses scale with the class level

| Level | Boss |
| --- | --- |
| French 1 | 👹 Le Monstre des Articles |
| French 2 | 🐲 Le Dragon du Passé Composé |
| French 3 | 👻 Le Spectre de l'Imparfait |
| French 4 | 🧙 La Sorcière du Subjonctif |
| French 5 | 🗿 Le Gardien de l'Argumentation |

---

## What each level teaches

Content is **cumulative** — French 4 still practises French 1 vocabulary, just
weighted toward the current year.

| Level | Vocabulary themes | Tenses in play | Grammar focus |
| --- | --- | --- | --- |
| **French 1** | classroom, family, food, colours, time | présent | articles, gender, adjective agreement |
| **French 2** | house, town, travel, clothing, body, weather | + passé composé | avoir vs. être, partitives, possessives |
| **French 3** | work, environment, technology, feelings | + imparfait, futur simple | imparfait vs. passé composé, y/en, relative pronouns |
| **French 4** | society, media, the arts, logical connectors | + conditionnel, subjonctif | subjunctive triggers, si-clauses, passive voice |
| **French 5 (AP)** | the six AP themes, essay language, idioms | + plus-que-parfait, conditionnel passé, futur antérieur, subjonctif passé | participle agreement, gérondif, register and nuance |

**In the box:** 334 vocabulary entries · 60 verbs across 10 tenses ·
60 sentences · 50 grammar questions with explanations.

---

## The games

| | Game | What it drills | Format |
| --- | --- | --- | --- |
| ⚡ | **Éclair Rapide** | Vocabulary both directions | 70 s sprint, right answers add time |
| ⚔️ | **Duel Le / La** | Noun gender | 45 s, two buttons, ← and → keys |
| 🌀 | **Conjugaison Rush** | Conjugation, typed | 90 s, accent helper keys |
| 🎯 | **Accent Attack** | Spelling and accents | 50 s, four near-identical spellings |
| 🧩 | **Construis la Phrase** | Word order and syntax | 8 sentences, tap the tiles, decoys included |
| 🎧 | **Écoute Bien** | Listening | 10 clips read aloud in French |
| 🃏 | **Marché Mémoire** | Vocabulary recall | Memory grid, clear it for a time bonus |
| 🐲 | **Le Défi du Boss** | Everything at once | 3 hearts vs. a boss, 12 s per question |
| 🎤 | **Parle Fort !** | Pronunciation, out loud | 8 words, the browser listens — only where it can |
| 🔁 | **Révision Ciblée** | *Your* mistakes only | Unlocks once you've missed a few words, +25 % XP |

**Révision Ciblée** is the quiet workhorse: the game remembers every word you
get wrong and builds a private deck out of them.

# The boring stuff... (coding)
If you're just using the app for learning/teaching French, ignore this section.
If you want to understand how the coding works, proceed and knock yourself out.

### Parle Fort !, and what it honestly can't do

Speaking is the hardest thing for a French teacher to assign at scale, because
it needs a listener. The browser has one — `SpeechRecognition` set to `fr-FR`,
free, no key, no service, nothing we send anywhere.

It is also the least reliable thing in the app, so it is fenced off accordingly:

* **Firefox has no recogniser**, and Chrome's sends the audio to Google's
  servers, so it needs a network. When either is true the game is simply not on
  the map — the same posture as the French voice, which stays silent rather than
  read French in an English accent. Open it directly anyway and it says which
  browsers can do it instead of showing a microphone that does nothing.
* **It can never be set as homework.** `App.Games.assignable()` drops anything
  declaring `needs`, and a test fails if that ever stops being true. Nobody's
  mark should depend on whether their browser can listen.
* **It is generous on purpose.** The article is optional, because a recogniser
  drops *le* as often as a student does and neither is a pronunciation mistake.
  A silent final `-s` is ignored, because "le livre" and "le livres" are the
  same sound and the recogniser is picking a spelling, not judging a mouth. A
  near miss gets a retry before it counts. And a long word forgives one letter
  while a short one forgives none — *vert* and *vent* are two different words.

What it cannot do is tell true homophones apart, which no amount of code will
fix. It is practice, not an examiner.

## Deploying (optional, for live classes)

Everything above works offline. Sync adds one thing: short codes that work
anywhere, and rosters that fill in by themselves.

### On your own machine or the classroom network

Already done — `npm start` serves the game *and* the sync API, storing classes
in `.chouette-data.json` next to the project:

```bash
npm start            # http://localhost:8080
```

Students on the same Wi-Fi open `http://<your-ip>:8080` and join with the short
code. Nothing leaves the building. The catch is that it only works while that
machine is on and reachable, and some school networks stop devices talking to
each other.

### On Cloudflare (works from home too, free tier)

**[DEPLOY.md](DEPLOY.md) walks through this from making the account onwards.**
The short version, once you have a Cloudflare login:

```bash
cd worker
npx wrangler login
npx wrangler kv namespace create CHOUETTE   # paste the printed id into wrangler.toml
npx wrangler deploy
```

That single Worker serves the game *and* the API from one origin, so there is
nothing to configure: open the URL it prints and everything works. If you host
the game's files somewhere else instead (GitHub Pages, a school server), set
`syncUrl` in `js/config.js` to the Worker's URL.

The free plan allows 1,000 KV writes a day. Joining a class and finishing a
piece of homework each cost one write; ordinary practice games are batched, so a
keen student cannot spend the whole class's budget.

### What is stored, and what is not

| Stored on the server | Never stored |
| --- | --- |
| Class code, name, level, assignments | Passwords — there are none |
| The teacher's display name | Email addresses |
| A student's display name (a first name is enough) | Last names, unless typed in |
| XP and which assignments are done | Answers, mistakes, or play history |
| A random anonymous id per student | Anything identifying a device |

The teacher's key is stored only as a SHA-256 hash and is never returned by the
API; it lives on the teacher's device. Knowing a class code lets you see that
class's assignments and add your own row — it is a classroom code, not a
password — but reading the roster or editing the class needs that key.
**Élèves → supprimer la classe** deletes the class and every student row under
it. If any of that is more than your school is comfortable with, don't deploy
the Worker: the app is fully usable without it.

---

## How the conjugation works

Nothing is hard-coded per form. `js/data/verbs.js` holds a small rule engine:

* Regular `-er`, `-ir` and `-re` verbs are generated from their endings,
  including the `-ger`/`-cer` spelling changes (*nous mangeons* but *nous
  mangions*, *nous commençons* but *nous commencions*).
* Irregular verbs supply only their present tense, future stem and participle.
* Imparfait, futur, conditionnel and subjonctif are **derived** from those, and
  the four compound tenses are built from the auxiliary plus the participle,
  with `être` agreement (*nous sommes allés*, *nous nous sommes levés*).

`npm test` checks 45 full conjugation tables against standard references and
asserts that no verb in the bank produces an empty or malformed form in any
tense. It also covers the classroom layer: code formatting and collisions, every
assignment goal against passing and failing sessions, invite/progress codes
round-tripping accented names, and the rule that finishing homework pays exactly
once — 10 400+ assertions in total. A second suite drives the sync API itself:
token checks, that a teacher's key is never returned or stored in the clear,
that a roster needs it, size caps, and that deleting a class takes its student
rows with it.

---

## Project layout

```
index.html              every script tag, in load order
worker/
  api.mjs               the sync API: classes, assignments, rosters
  jwt.mjs               verifies a Firebase ID token (signature, aud, iss, exp)
  index.mjs             Cloudflare entry point (KV-backed, serves the game too)
  wrangler.toml         deploy config
css/
  base.css              design tokens, the six themes, buttons, mascot, FX
  layout.css            level picker, home, results, shop, badges, profile
  games.css             the arcade frame and each mini-game
  print.css             the printable sheets, and what the printer gets
icons/                  app icons, generated by tools/make-icons.js
manifest.json           name, icons and colours for an installed app
sw.js                   the offline cache (never caches /api/)
js/
  core.js               helpers, class levels, ranks, themes, avatars
  state.js              profile: XP, streak, mastery, unlocks, homework
  accounts.js           who is signed in; one profile per account
  shell.js              the frame every game runs in: timer, lives, combo, XP
  router.js  ui.js  audio.js  speech.js  fx.js
  config.js             where the sync API lives (empty = same origin)
  sync.js               optional, best-effort calls to that API
  auth.js               teacher sign-in (loads Firebase only on demand)
  firebase-config.js    which Firebase project — public, like config.js
  ear.js                the browser's French recogniser, and judging what it heard
  install.js            service worker registration and the install prompt
  paper.js              builds the printable sheets (pure — no DOM needed)
  export.js             the gradebook as CSV
  data/                 vocab · verbs · sentences · grammar · quests ·
                        achievements · classroom (codes, assignments, rosters)
  games/                one file per mini-game
  screens/              role · signin · level · classcode · home · teacher ·
                        results · shop · badges · profile
tests/run.js            content, conjugation and classroom test suite
tests/jwt.mjs           token verification, against a keypair made in the test
tests/api.mjs           sync API test suite, including class ownership
tools/serve.js          static files + the same sync API, for `npm start`
```

A mini-game is a single object registered with `App.Games.register()`. It gets a
stage to draw on and calls `api.correct()` or `api.wrong()`; the shell handles
scoring, combos, timers, XP, quests, badges and the results screen.

---

## Adding your own content

Everything a teacher would want to edit lives in `js/data/` as plain arrays, so
here's for if you don't want to use the in-app creator, or are feeling tech-savvy.

```js
// js/data/vocab.js — nouns are stored WITHOUT their article
{ fr: "cahier", en: "notebook", g: "m", t: "n", c: "classe" }
//  t: "n" noun · "v" verb · "a" adjective · "e" expression

// js/data/sentences.js — tiles and punctuation are worked out automatically
{ en: "I have a black dog.", fr: "J'ai un chien noir." }

// js/data/grammar.js — the explanation is shown after the answer
{ q: "Il faut que tu ___ plus tôt.", a: "partes",
  opts: ["partes", "pars", "partiras", "partirais"],
  why: "« Il faut que » déclenche le subjonctif." }

// js/data/verbs.js — a regular verb needs one line
{ inf: "chanter", en: "to sing", lvl: 1, group: "er" }
```

Run `npm test` afterwards: it will tell you about a missing gender, a duplicate
word, a grammar question whose answer isn't among its own options, or a verb
that won't conjugate.

---

## Details worth knowing

* **Everything is local.** Profiles, classes and homework live in
  `localStorage` on that device. Nothing is uploaded and no password is ever
  asked for. If storage is blocked (private windows), the game still runs — it
  just forgets at the end.
* **Sound is synthesised** with the Web Audio API, so the repo ships no audio
  files. It can be switched off in the profile.
* **Speech is French or silent.** The app picks the best French voice on the
  device (metropolitan French first, then fr-CA/fr-BE/fr-CH) and will *never*
  read French through an English voice — a default voice saying "Je m'appelle"
  in English teaches the wrong sounds. With no French voice installed it stays
  quiet, says why, and shows the text instead. Pick a specific voice in
  **Profil → Voix**.
* **Accessibility:** every game is keyboard-playable (`1`–`4` pick answers, `←`
  and `→` fight the gender duel, `Enter` submits), focus rings are visible, and
  `prefers-reduced-motion` turns the animations off.
* **Works offline.** The Google Fonts link is the only external request; without
  it the app falls back to system rounded fonts and looks fine.

---

Bon courage, et amuse-toi bien ! 🥐
