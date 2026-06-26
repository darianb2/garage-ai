# Garage AI — Master Plan

> Pocket mechanic app. Deep per-car data, generation history, common issues, maintenance tips.
> Goal: ship a production web app anyone can use from their phone.

---

## Status Tracking

Each task is marked: `[ ]` not started · `[~]` in progress · `[x]` complete

---

## Phase 1 — CLI Expansion (Python) ✅ COMPLETE

### 1.1 Data Depth
- [x] Core specs (engine, hp, torque, drivetrain, transmission, 0-60)
- [x] Oil type and oil change interval
- [x] Common issues per car
- [x] Maintenance tips per car
- [x] Generation history per car
- [x] Fuel economy (city/hwy mpg)
- [x] Curb weight
- [x] Reliability score (1-10 with reasoning)
- [x] Common modifications (bolt-ons, tunes, suspension)
- [x] Estimated cost to own (insurance tier, maintenance cost per year)

### 1.2 More Cars
- [x] Honda Civic Si
- [x] Subaru WRX
- [x] Audi S3
- [x] Ford Mustang GT
- [x] Toyota GR86
- [x] Infiniti Q50 3.7
- [x] Infiniti Q50 3.0t
- [x] Infiniti Q50 Red Sport 400
- [x] Nissan 370Z
- [x] BMW M3 (E46, E90, F80, G80)
- [x] Dodge Charger R/T / Scat Pack
- [x] Honda Civic Type R (FK8, FL5)
- [x] Mazda MX-5 Miata (NA, NB, NC, ND)
- [x] Toyota Supra (A90)
- [x] Volkswagen Golf GTI (Mk7, Mk8)
- [x] Chevrolet Camaro SS

### 1.3 CLI UX
- [x] List all available cars on startup
- [x] Case-insensitive search (type "civic si" not "Honda Civic Si")
- [x] Partial name matching (type "q50" to see all Q50 variants)
- [x] Compare two cars side-by-side
- [x] Filter by drivetrain, price range, or horsepower (drivetrain + hp done; price needs an MSRP field — deferred)

---

## Phase 2 — Data Architecture ✅ COMPLETE

### 2.1 Separate Data from Code
- [x] Move all car data from main.py into individual JSON files (one per car)
- [x] Create `data/` directory with one `.json` file per car
- [x] Write `loader.py` that reads all JSON files dynamically
- [x] Update `main.py` to use the loader instead of hardcoded dict (760 → 170 lines)

### 2.2 Data Validation
- [x] Write a schema validator that checks each car JSON has required fields
- [x] Run validator on startup and warn if any car is missing data
- [x] Add a `scripts/add_car.py` helper to guide adding new cars

---

## Phase 3 — Flask Web Backend ✅ COMPLETE

### 3.1 Setup
- [x] Install Flask (`pip install flask`) — in `.venv` (env is externally-managed)
- [x] Create `app.py` as the Flask entry point
- [x] Create `requirements.txt` (Flask==3.1.3)

### 3.2 API Endpoints
- [x] `GET /` — serves index.html homepage; `GET /car/<name>` serves the detail page
- [x] `GET /api/cars` — list of car summaries (name, engine, hp, drivetrain)
- [x] `GET /api/car/<name>` — full data for one car (exact, case-insensitive; 404 if none)
- [x] `GET /api/search?q=<query>` — fuzzy search → list of summaries
- Note: matching logic extracted to shared `search.py` (used by CLI + API)

### 3.3 Templates
- [x] Create `templates/` directory
- [x] `templates/index.html` — homepage: search bar + live-filtered car grid
- [x] `templates/car.html` — full car detail page (all 16 fields + lists)

---

## Phase 4 — Frontend (HTML + CSS + Tailwind) ✅ COMPLETE

### 4.1 Setup Tailwind
- [x] Add Tailwind CSS via CDN (no build step needed initially)
- [x] Create `static/` directory for CSS and assets (static/custom.css)

### 4.2 Homepage
- [x] Search bar (large)
- [x] Grid of car cards showing name + horsepower (dark theme, amber accents)
- [x] Mobile responsive layout (1 / 2 / 3 columns)

### 4.3 Car Detail Page
- [x] Hero section: car name, engine, big amber hp (torque/0-60 in specs grid)
- [x] Sections: Generation History, Common Issues, Maintenance Tips, Popular Mods
      (always-visible sections — cleaner to scan than accordions for this content)
- [x] Oil info card (amber left-border highlight)
- [ ] Compare button (stretch goal — CLI has compare; web compare deferred)

### 4.4 Design System
- [x] Dark theme (garage / mechanical feel) — shared via base.html
- [x] Typography: Inter (Google Fonts) wired through Tailwind font-sans
- [x] Color palette: dark zinc background, amber accents
- [x] Icons for drivetrain (wheel) + transmission (gear) — inline SVG

---

## Phase 5 — Production Deployment

### 5.1 Prep
- [x] Create `.gitignore` (venv, __pycache__, .env) — done early in Phase 2
- [x] Add `Procfile` (`web: gunicorn app:app --bind 0.0.0.0:$PORT`) + gunicorn in requirements
- [x] Add `runtime.txt` (python-3.12.3)
- [x] Move any secrets to `.env` — N/A (app has no secrets); verified gunicorn serves all routes

### 5.2 Deploy  — COMPLETE; live at https://garage-ai-34hw.onrender.com
- [x] Push to GitHub — https://github.com/darianb2/garage-ai (public)
- [x] Deploy to Render (free web-service tier, via `render.yaml` blueprint)
- [ ] Set up custom domain (optional — not needed)
- [x] Verify mobile experience — `viewport` meta present; all routes 200 on live host

**How it was deployed:**
```bash
# 1. GitHub repo + push (gh CLI, browser auth)
gh repo create garage-ai --public --source=. --remote=origin --push

# 2. Render: New + → Blueprint → connect GitHub → pick garage-ai (branch: master).
#    Render reads render.yaml, installs requirements.txt, runs gunicorn. Free plan.
```
Verified live: `/`, `/api/cars` (16 cars), `/car/<name>`, `/api/search`, 404 path — all pass.

### 5.3 Polish
- [x] Add favicon (amber wrench SVG)
- [x] Add meta tags for SEO and social sharing (per-car og:title + description overrides)
- [x] Write a real README.md (overview, features, run instructions, architecture, deploy)
- [x] Add a "suggest a car" form (POST /suggest → data/suggestions.log; thank-you banner)
- [x] Simple hit counter (file-backed, thread-safe; shown in homepage footer)

---

## Phase 6 — AI Research Assistant ("Ask about this car") — IN PROGRESS

Goal: an in-app assistant that gives the enthusiast-owner wisdom Google scatters
across forums — grounded on each car's verified JSON, synthesized by Claude.

### 6.1 v1 — per-car assistant (BUILT, paused before going live)
- [x] `POST /api/ask/<car>` endpoint: grounded prompt (`_car_facts` + `SYSTEM_TEMPLATE`),
      Claude `claude-opus-4-8` via the official `anthropic` SDK
- [x] Key-gated: no `ANTHROPIC_API_KEY` → returns a stub, so the UI works with no cost
- [x] Frontend on `car.html`: "Ask Garage AI" panel — one-tap insight chips
      (What breaks? / Before you buy / Should I mod it? / 5-year cost / Right for me?)
      + freeform box + `fetch()` JS
- [x] First guardrail: 500-char question cap
- [ ] Add `ANTHROPIC_API_KEY` (local `.env` + Render env var) to make answers real
- [ ] Add per-IP rate limiting BEFORE the key goes live on the public URL (cost abuse)
- [ ] Decide: ship stub to Render now, or wait until key + rate limit are in

### 6.2 v2 ideas (later)
- [ ] Live web search (server-side `web_search` tool) for current pricing / recalls
- [ ] Global homepage chat (answer/compare across any car)
- [ ] Stream responses (SSE) instead of wait-then-render
- [ ] Fix the write-only suggestions log (retrievable suggestions — a web-dev lesson)

---

## Index of Files

| File | Purpose |
|---|---|
| `main.py` | CLI entry point + all car data |
| `notes/python.md` | Python learning notes |
| `MASTERPLAN.md` | This file — roadmap and task tracker |
| `INDEX.md` | Directory index (auto-updated) |
| `README.md` | Project description |

---

## How the Cron Agent Should Work

When a scheduled agent wakes up, it should:
1. Read this file (`MASTERPLAN.md`)
2. Find the next `[ ]` unchecked task in the current active phase
3. Research if needed (web search for specs, best practices, etc.)
4. Implement the task
5. Mark the task `[x]` in this file
6. Commit the changes with a clear message
7. Stop — one task per run, keep changes focused

**Current active phase:** Phase 6 — AI Research Assistant (IN PROGRESS)
**Status:** Phases 1–5 SHIPPED; app live at https://garage-ai-34hw.onrender.com.
Phase 6.1 v1 assistant is BUILT and committed but runs in stub mode (no API key),
and is NOT yet pushed/deployed. To resume: add `ANTHROPIC_API_KEY` + a rate limit,
then push to deploy. Also added the Honda Accord V6 (17 cars total).
Repo: https://github.com/darianb2/garage-ai.

> Run the web app: `./.venv/bin/python app.py` → http://localhost:5000

> Run the server with `./.venv/bin/python app.py` (Flask lives in .venv)

---

## Notes

- Keep Python simple — no fancy abstractions until Phase 2
- Prioritize data quality over quantity (research before adding a car)
- Each car should feel like a knowledgeable friend describing it, not a spec sheet
