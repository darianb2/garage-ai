# Moving Garage AI to the MacBook

A checklist for continuing development on a new Mac. The short version: almost
nothing "transfers" — the code lives on GitHub, so you clone it fresh and
regenerate the dependency folders. Total time is mostly tool installs, well
under an hour.

macOS runs this app with zero code changes (it is Unix, like Linux). The
cross-platform fixes already in the repo were only needed for Windows.

---

## Do NOT copy these (they regenerate on the Mac)

- `frontend/node_modules/` (247 MB) -> recreated by `npm install`
- `.venv/` (48 MB) -> recreated by `pip install`
- `data/hits.txt`, `data/suggestions.log` -> throwaway runtime files

Copying them from the old machine would waste time and can break (native
binaries differ between Linux and macOS). Let the Mac rebuild them.

---

## The 3 things that do NOT come from `git clone` — handle these

1. **`ANTHROPIC_API_KEY`** — your Claude API key. It is an environment variable,
   never committed. Get the value from your Render dashboard (Environment tab)
   or the Anthropic console, and set it on the Mac (Step 5 below). Without it,
   the AI features run in a free "demo" stub instead of answering for real.

2. **Claude Code project memory** (optional, but keeps session continuity) —
   the notes Claude uses to remember where the project is live OUTSIDE the repo,
   at `~/.claude/projects/-home-darian-Projects-garage-ai/memory/`. If you want
   Claude to remember Task 9 / Honda progress on the Mac, copy that `memory/`
   folder over (see Step 6). Tiny in size, easy to forget.

3. **Developer tools** — Git, the `gh` CLI, Python 3.12+, Node, and Claude Code
   itself all need installing on a fresh Mac (Steps 1-2). This is the only part
   that takes real time.

Transfer the API key value and (optionally) the memory folder using whatever is
handy: a USB drive, iCloud/Google Drive/Dropbox, or emailing the key to
yourself. (AirDrop does not work from Linux.)

---

## Step 1 — Install the base tools

Install Homebrew (the macOS package manager), then the toolchain:

```bash
# Homebrew — paste the current one-liner from https://brew.sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Toolchain
brew install git gh python@3.12 node
```

Xcode Command Line Tools (git etc.) may prompt to install on first `git` use —
accept it if so.

## Step 2 — Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

(Or the current install method from the Claude Code docs.) Then sign in when you
first run `claude`.

## Step 3 — Clone the repo

```bash
cd ~/Projects            # or wherever you keep projects; mkdir -p first if needed
git clone https://github.com/darianb2/garage-ai.git
cd garage-ai
```

Everything you committed is already here — including the prebuilt `frontend/dist`
that Flask serves, so the app runs on Python alone.

## Step 4 — Set up the Python backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Step 5 — Add your API key, then run

```bash
export ANTHROPIC_API_KEY="paste-your-key-here"
python app.py
```

Open <http://localhost:5000>. The homepage should load the deployed bundle, and
"Ask Garage AI" should give real answers (not the stub).

To make the key persistent so you do not re-export it every session, add that
`export` line to `~/.zshrc` (zsh is the default Mac shell), then
`source ~/.zshrc`.

## Step 6 — (Optional) Restore Claude Code memory

So Claude remembers the project state on the Mac:

1. Run Claude Code once in the project (`claude` from inside `garage-ai/`) so it
   creates the project's memory directory.
2. Copy the `.md` files from the old machine's
   `~/.claude/projects/-home-darian-Projects-garage-ai/memory/` into the new
   project's matching `memory/` folder. The folder name is derived from the
   project's absolute path, so the `-home-darian-` part becomes
   `-Users-<your-mac-username>-...`. Easiest is to let Claude create it, then
   drop the files in.

Alternatively, just tell Claude "catch me up on where we are" and it will read
the git history and any memory it has.

## Step 7 — (Only if you change frontend code) Rebuild the bundle

You do not need Node just to run the app. You only need it if you edit anything
in `frontend/src`:

```bash
cd frontend
npm install
npm run build        # writes frontend/dist, which Flask serves and which IS committed
cd ..
```

Remember to commit the rebuilt `frontend/dist` before pushing, since Render has
no Node to build it.

---

## Sanity check you are fully set up

- `python app.py` serves the homepage at localhost:5000
- A question in "Ask Garage AI" returns a real answer (key is working)
- `git status` is clean and `git log` shows the latest commit
- `git push` works (you are authenticated via `gh auth login` or a token)

That is it — you are ready to keep building.
