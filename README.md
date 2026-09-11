# Chouette ! 🦉

**Le français, mais en jeu.** An arcade of French mini-games for students from
**French 1 through AP French** — built to be played on purpose, not out of duty.

The app opens by asking **"Are you a student or a teacher?"**, then
**"What French level are you?"** — French 1, 2, 3, 4 or French 5 (AP French).
That second answer retunes every word, tense, boss and grammar question in the
game.

Teachers get a class code and can turn the mini-games into assignments.
Students enter the code once and their homework shows up inside the game.

No build step, no dependencies, no server, no network. Open the file and play.

---

## Play it

```bash
git clone <this repo>
cd tech-ed-project
open index.html          # macOS — or just double-click the file
```

Everything is plain HTML, CSS and JavaScript, so `file://` works. If you'd
rather serve it (handy on a classroom network):

```bash
npm start                # http://localhost:8080, zero dependencies
npm start -- 3000        # …on another port
```

Run the content and conjugation tests:

```bash
npm test
```

---

## Signing in

Sign-in is **local and password-free on purpose**: the people using this are
often minors, and nothing here needs an email address.

* An account is a name, a role and a private profile. Several accounts can live
  on the same browser, so a shared classroom computer keeps everyone's XP,
  streaks and homework apart.
* The role question is first, and returning players get a one-tap "Déjà venu ?"
  row to jump straight back in.
* Switch accounts any time from **Profil → Compte**.

Nothing is uploaded. Everything lives in `localStorage` on that one device.

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

### Getting a class onto other devices

There is no server, so a class travels as a code:

* **The short code** (`ZBK-S9U`) works for students on the same computer.
* **The invite code** (`CHOU1.…`) carries the whole class — name, level and
  every assignment — so a student on any other device can join by pasting it.
  Copy it from the dashboard and send it however you already talk to your class.
* **Progress codes** (`CHOUP1.…`) go the other way: a student copies one from
  their profile, you paste it into **Élèves → Coller des résultats**, and their
  finished work lands in your roster.

Both directions are plain UTF-8 JSON in base64, so accented class names survive
the trip.

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
| **Devoirs** | Assignments from your teacher, worth 75 🥐 and 100 XP each. |

Every correct answer builds a **combo**; every five steps of combo bumps the
point multiplier, up to 4×. Wrong answers reset it. That single mechanic is what
turns "answer 30 questions" into something worth chasing.

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
| 🔁 | **Révision Ciblée** | *Your* mistakes only | Unlocks once you've missed a few words, +25 % XP |

**Révision Ciblée** is the quiet workhorse: the game remembers every word you
get wrong and builds a private deck out of them.

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
once — 10 400+ assertions in total.

---

## Project layout

```
index.html              every script tag, in load order
css/
  base.css              design tokens, the six themes, buttons, mascot, FX
  layout.css            level picker, home, results, shop, badges, profile
  games.css             the arcade frame and each mini-game
js/
  core.js               helpers, class levels, ranks, themes, avatars
  state.js              profile: XP, streak, mastery, unlocks, homework
  accounts.js           who is signed in; one profile per account
  shell.js              the frame every game runs in: timer, lives, combo, XP
  router.js  ui.js  audio.js  speech.js  fx.js
  data/                 vocab · verbs · sentences · grammar · quests ·
                        achievements · classroom (codes, assignments, rosters)
  games/                one file per mini-game
  screens/              role · signin · level · classcode · home · teacher ·
                        results · shop · badges · profile
tests/run.js            content + conjugation test suite
tools/serve.js          dependency-free static server for `npm start`
```

A mini-game is a single object registered with `App.Games.register()`. It gets a
stage to draw on and calls `api.correct()` or `api.wrong()`; the shell handles
scoring, combos, timers, XP, quests, badges and the results screen.

---

## Adding your own content

Everything a teacher would want to edit lives in `js/data/` as plain arrays.

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
