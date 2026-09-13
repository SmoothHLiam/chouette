# Putting Chouette ! online

This walks you through publishing the game so students join a class by typing a
six-character code on **any** device, and your roster fills in by itself.

**You do not have to do this.** The game works fully offline — open
`index.html` and play. Deploying only adds the live class sync. If your school
would rather nothing left the building, skip to
[Option B](#option-b-your-own-laptop-no-cloud-account) at the bottom.

Total time: about 15 minutes. Cost: nothing.

---

## What you'll end up with

A single web address — something like `https://chouette.yourname.workers.dev` —
that serves the game *and* the class sync. Students open that link, type the
class code, and they're in.

---

## Before you start

You need **Node.js**, which gives you the `npx` command used below.

1. Go to <https://nodejs.org> and download the **LTS** version.
2. Install it, then check it worked. Open a terminal
   (**Terminal** on macOS, **PowerShell** on Windows) and run:

   ```bash
   node --version
   ```

   If it prints something like `v22.x.x`, you're set. If it says the command
   isn't found, see [Node says "command not found"](#node-says-command-not-found)
   below — it is nearly always one of three small things.

---

## Step 1 — Make a Cloudflare account

1. Go to <https://dash.cloudflare.com/sign-up>.
2. Enter an email address and a password, and click **Sign up**.
   - Use an address you can open right now.
   - A school address is fine; so is a personal one.
3. Open the confirmation email Cloudflare sends and click the verify link.
4. You'll land on the dashboard. If it asks you to **add a website or domain**,
   you can skip that — you don't need a domain for this.

**No credit card is required.** The Workers free plan does not ask for one.
If you ever see a page asking for payment details, you've wandered into a paid
plan — go back; you don't need it.

---

## Step 2 — Get the project onto your computer

If you already have the folder, skip this.

```bash
git clone https://github.com/SmoothHLiam/tech-ed-project.git
cd tech-ed-project
```

---

## Step 3 — Connect your terminal to Cloudflare

From inside the project folder:

```bash
cd worker
npx wrangler login
```

- The first time, `npx` asks to install Wrangler (Cloudflare's command-line
  tool). Say yes.
- Your browser opens a Cloudflare page asking to grant access. Click
  **Allow**.
- Back in the terminal you should see that you're logged in.

> On a school-managed computer this browser step sometimes gets blocked. If so,
> use `npx wrangler login --browser=false`, which prints a link you can paste
> into any browser.

---

## Step 4 — Create the storage

This is where classes and rosters live.

```bash
npx wrangler kv namespace create CHOUETTE
```

It prints something like:

```
🌀 Creating namespace with title "chouette-CHOUETTE"
✨ Success!
Add the following to your configuration file:
[[kv_namespaces]]
binding = "CHOUETTE"
id = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
```

**Copy that `id` value.**

> Wrangler versions before 3.60 spell this `kv:namespace create` with a colon.
> If the command errors, try that form — or update Node and try again.

---

## Step 5 — Paste the id into the config

Open `worker/wrangler.toml` in any text editor. Find these lines near the
bottom:

```toml
[[kv_namespaces]]
binding = "CHOUETTE"
id = "PASTE_YOUR_KV_NAMESPACE_ID_HERE"
```

Replace `PASTE_YOUR_KV_NAMESPACE_ID_HERE` with the id you just copied, keeping
the quotation marks. Save the file.

While you're there you can rename the project by changing `name = "chouette"` —
that name becomes part of your web address.

---

## Step 6 — Deploy

Still inside the `worker` folder:

```bash
npx wrangler deploy
```

It uploads the game's files and the API, then prints your address:

```
Uploaded chouette (3.2 sec)
Published chouette
  https://chouette.yourname.workers.dev
```

**That link is the game.** Open it — you should see the owl and
*"Are you a student or a teacher?"*

---

## Step 7 — Check the sync is really on

1. Open your address and sign in as **Teacher**.
2. Create a class.
3. Look under the class code. It should say **☁️ en ligne — n'importe quel
   appareil**.

If it says *📴 cet appareil seulement*, the app couldn't reach the API. See
[When something goes wrong](#when-something-goes-wrong).

Now the real test, which takes a minute:

4. On your **phone**, open the same address (turn Wi-Fi off to be sure it's a
   genuinely different connection).
5. Sign in as **Student**, and type the class code.
6. Back on your computer, open the teacher dashboard. Your phone should be
   sitting in the **Élèves** list.

---

## Using it with a class

- Write the six-character code on the board. That's all students need.
- Set assignments from the dashboard; they appear on students' home screens.
- Finished homework reaches your roster on its own. If you're watching it live,
  give it up to a minute and press **↻ Actualiser** — Cloudflare's storage takes
  a little while to reach every part of the world.
- **Élèves → Coller des résultats** still works as a backup if a student was
  offline.

### Redeploying after a change

Any time you edit the game, run `npx wrangler deploy` again from the `worker`
folder. Classes and rosters are untouched by a redeploy.

---

## What this costs, and what it stores

The free plan gives 100,000 requests a day, 100,000 reads and **1,000 writes**
a day, and 1 GB of storage. For scale: one student joining is one write, and
finishing a piece of homework is one write. Ordinary practice games are batched
so they can't burn through the budget. A few classes will not come close to the
limit; a whole school on one account might, and would simply stop recording
until midnight UTC rather than costing you anything.

The service stores the class code, name, level and assignments; and per student
a display name, a random anonymous id, their XP, and which assignments are done.
No passwords, no email addresses, no answers, no device information. Your
teacher key is stored only as a hash and never leaves your browser.

Deleting a class deletes every student row with it. Since students are usually
minors, tell them a first name is enough — the app never asks for more.

> A class code is a classroom code, not a password. Anyone who has it can see
> that class's assignments and add themselves to the roster. That's fine for
> homework; just don't post one publicly.

---

## When something goes wrong

### Node says "command not found"

**First, and this fixes it most of the time:** quit the terminal completely
(**⌘Q** on macOS, not just closing the window), open a fresh one, and try again.
An installer's PATH change only reaches terminals opened *afterwards*.

**Do not type `bash`.** On macOS your shell is zsh, and typing `bash` starts a
different shell that may not load the setup Node wrote. On Windows, `bash` opens
WSL or Git Bash — separate environments that cannot see a Windows Node install.
Use the terminal you are given: **Terminal** on macOS, **PowerShell** on Windows.
Your macOS prompt ends in `%` for zsh and `$` for bash, which is a quick way to
tell where you are.

If it still is not found, run this and see which case you are in:

```bash
echo $SHELL
which -a node npm npx
ls -d /usr/local/bin/node /opt/homebrew/bin/node ~/.nvm 2>/dev/null
```

**Case 1 — `/usr/local/bin/node` exists, but `which node` finds nothing.**
The standard installer worked; your PATH just does not include it.

```bash
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
node --version
```

**Case 2 — `/opt/homebrew/bin/node` exists** (Homebrew on an Apple Silicon Mac).
Homebrew's folder is not on the default PATH:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile
node --version
```

**Case 3 — `~/.nvm` exists.** nvm needs a line in your shell config:

```bash
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install --lts
```

**Case 4 — none of those paths exist.** Node is not actually installed, whatever
the download folder suggests. Get the **macOS Installer (.pkg)** from
<https://nodejs.org> and check you pick the right chip: Apple menu → **About This
Mac** shows either *Apple M-something* (choose **ARM64**) or *Intel* (choose
**x64**). Run the installer, then quit and reopen Terminal.

**The class says "cet appareil seulement".**
The app couldn't reach the API. Open `https://your-address/api/health` in a
browser — you should see `{"ok":true,...}`. If you get an error instead, the
most likely cause is the KV id in Step 5: check it's pasted correctly and
redeploy.

**`wrangler: command not found`.**
Use `npx wrangler …` rather than `wrangler …`. The `npx` prefix fetches it for
you.

**"You need to register a workers.dev subdomain".**
Cloudflare asks for this once, on your first deploy. Go to the dashboard →
**Workers & Pages**, pick any available subdomain, then deploy again.

**The deploy fails mentioning the KV namespace.**
The id in `worker/wrangler.toml` doesn't match a real namespace. Run
`npx wrangler kv namespace list` to see yours and copy the right id.

**A student's result hasn't appeared.**
Wait a minute and press **↻ Actualiser**. If it still hasn't, have them open
their **Profil** — it says whether sync is active, and anything stuck is resent
automatically next time they open the app.

---

## Option C — deploy without a terminal at all

If the machine is locked down, or the terminal keeps fighting you, Cloudflare can
build straight from GitHub and you never run a command.

1. **Make the storage in the dashboard.** Cloudflare dashboard → **Storage &
   Databases → KV → Create a namespace**. Call it `CHOUETTE`. Copy its ID.
2. **Paste the ID on GitHub.** Open `worker/wrangler.toml` in your repository on
   github.com, click the pencil icon, replace
   `PASTE_YOUR_KV_NAMESPACE_ID_HERE` with the ID, and commit.
3. **Connect the repository.** Dashboard → **Workers & Pages** → **Create** →
   **Import a repository**, authorise GitHub, and pick your repo.
4. **Set the root directory to `worker`**, leave the deploy command as
   `npx wrangler deploy`, and click deploy.

Cloudflare rebuilds and redeploys every time you push to the branch, which also
removes the "redeploy after a change" step entirely. Note this is the one route
in this guide I have not been able to test end to end, so if a screen does not
match, trust the dashboard over this page.

---

## Option B — your own laptop, no cloud account

If you'd rather nothing left the building, the project already includes the same
API as a local server:

```bash
npm start
```

It prints a local address. Students on the **same Wi-Fi** open
`http://<your-computer's-ip>:8080` and join with the short code exactly as
above. Classes are stored in a file next to the project.

The trade-offs: it only works while your machine is awake and on that network,
homework done at home won't sync until they're back, and some school networks
stop devices from talking to each other. If you hit that last one, Option A is
the way.
