# Garage AI — Master Plan

> Interactive vehicle research & exploration engine. Search any brand/model/trim, then
> EXPLORE it: a live data profile + an interactive 3D model + a clickable mechanical
> breakdown of its major systems. The data engine (NHTSA + specs) is the backbone.
> Goal: ship a production web app anyone can use from their phone.
>
> PIVOT (2026-06-27): reframed from "a browsable database of cars" to "a search engine +
> 3D explorer." This pulls the original brief's Phase 2 (3D viewer) and Phase 3
> (mechanical breakdown) forward into the CORE product. Strategy: perfect 4 cars
> end-to-end, then scale the same template. See Phase 8.

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
- [~] Add `ANTHROPIC_API_KEY` — LOCAL verified: real `claude-opus-4-8` answers tested
      end-to-end (grounded, good tone, ~2-3¢/answer). Still TODO: Render env var.
- [x] Add per-IP rate limiting BEFORE the key goes live on the public URL (cost abuse)
      — `rate_limit_error()` in app.py: 10/IP/hour + 300/day global ceiling, in-memory
      (single gunicorn worker on free tier), reads X-Forwarded-For; returns 429
- [x] Raise max_tokens 1024 → 2048 (1024 truncated the longer "checklist" answers)
- [ ] Decide: ship stub to Render now, or wait until key + rate limit are in

### 6.2 v2 ideas (later)
- [ ] Live web search (server-side `web_search` tool) for current pricing / recalls
- [ ] Global homepage chat (answer/compare across any car)
- [ ] Stream responses (SSE) instead of wait-then-render
- [ ] Fix the write-only suggestions log (retrievable suggestions — a web-dev lesson)

---

## Phase 7 — Data Engine (live API profiles) — IN PROGRESS

The North Star: stop relying on hand-curated facts; assemble each car's profile
on demand from real automotive APIs (AI as the orchestration layer). Start with
the FREE half (NHTSA) before paying for a commercial specs API. The 17 curated
JSON cars stay as the specs source until that paid API lands.

### 7.1 Free NHTSA profile engine (BUILT, local)
- [x] `nhtsa.py`: add `get_complaints()` + `get_safety_ratings()` (NCAP two-step)
- [x] `car_profile.py`: `build_profile(make, model, year, specs=None)` — fans out
      to recalls + complaints + safety, derives "common issues" from complaint
      components and a reliability proxy (raw NHTSA volume, clearly caveated),
      merges optional curated JSON specs. Source-agnostic output shape.
- [x] `app.py`: `GET /api/profile` (any car) + `GET /profile` page; matches our
      curated trims by make+model so known cars show specs + links to detail pages
- [x] `templates/profile.html`: assembled profile (specs / reliability / safety /
      what-breaks / recalls / complaints), matches dark-amber design system
- [x] Homepage "Research any car" link so /profile is reachable (not an orphan)
- [ ] Decide what to do with the older `/recalls` page (fold into /profile?)
- [ ] Push + deploy to Render

### 7.2 Enthusiast catalog (breadth) — IN PROGRESS
- [x] `scripts/build_catalog.py` -> `data/catalog.json`: lightweight entries
      (make/model/year/generation/body/note) for popular enthusiast cars. Only
      reliable facts; NO hand-written specs. Easy to grow toward 500 in batches.
- [x] `loader.load_catalog()` + `GET /catalog` browsable, searchable page; each
      card links to `/profile?make=&model=&year=` and auto-runs the engine
- [x] Homepage links to the catalog
- [x] First batch: 126 cars (JDM / German / American / hot hatch / classics)
- [ ] Grow the catalog toward ~500 in further batches (add tuples + rerun script)
- [ ] Known limit: curated-specs match is make+model substring, so a catalog
      entry can pull specs from a different generation of the same model
      (e.g. A80 Supra shows GR Supra specs). Make it generation-aware later.

### 7.3 Flagship depth (rich 16-field icons) — TODO
- [ ] Pick a shortlist of true icons; research REAL specs in verified batches
      (web search, not memory) and add as full data/cars/*.json entries

### 7.4 Next (paid specs + smarter resolve)
- [ ] AI resolver: parse vague input ("2016 q50 red sport") -> make/model/year/trim
- [ ] Commercial specs API (CarAPI free tier first) for trims/hp/wheel-tire sizes
- [ ] Replace curated-JSON specs merge with live specs; keep JSON as verified cache

---

## Phase 8 — PIVOT: Interactive Vehicle Explorer (NEW DIRECTION) — PLANNING

Reframe: Garage AI is a SEARCH ENGINE for vehicles, not a list of cars. Search by
brand/model/trim, then EXPLORE the vehicle across three linked layers: data profile,
interactive 3D model, and a clickable mechanical breakdown of its major systems. The
Phase 7 data engine is the backbone that feeds all three.

Strategy: PERFECT 4 launch cars end-to-end, then scale the same template behind the
126-car catalog. This supersedes the old "grow the catalog / flagship depth" framing
(7.2/7.3); that data work continues only as the spec layer these 4 cars consume.

### 8.0 Decisions — stack + cars LOCKED 2026-06-27
- [x] Frontend stack — LOCKED: React + Vite + react-three-fiber + Tailwind; Flask STAYS
      the JSON data API. Introduced incrementally as a 3D "island" (strangler-fig),
      not a big-bang rewrite.
- [x] The 4 launch cars — LOCKED: Mazda MX-5 Miata (ND), Toyota Supra Mk4 (A80),
      BMW M3 (E46), Nissan GT-R (R35).
- [ ] 3D model sourcing — REC (default unless changed): licensed/free glTF/GLB models
      (web-standard format that loads in R3F). Per-model budget TBD.
- [ ] Mechanical-breakdown depth — REC (default unless changed): v1 = major systems with
      clickable hotspots mapped to engine data, NOT a full disassemblable teardown.

### 8.1 New information architecture / UX
- [x] Scaffold `frontend/` (Vite + React + react-three-fiber + Tailwind) — DONE
      2026-06-27. Node v24.18.0 LTS installed to ~/.local (no sudo). vite.config.js
      proxies /api -> Flask :5000. Minimal R3F scene (rotating placeholder + OrbitControls)
      + header that probes /api/cars. `npm run build` passes; dev server + proxy
      verified (fetched 17 cars through the proxy).
      NOTE: this adds a Node build step to deploy — the Render config will change.
- [x] Search-first landing page (DONE 2026-06-27): `Landing.jsx` — hero search filters
      the 126-car catalog live + a free-form "research any car" fallback. New JSON
      endpoint `GET /api/catalog` added to Flask for it.
- [x] "Vehicle Hub" replaces the static car detail page (DONE 2026-06-27):
      `VehicleHub.jsx` with three tabs — Overview (`ProfilePanel`), 3D Model
      (`Viewer3D` placeholder), Mechanical Breakdown (`BreakdownPanel`). Fetches
      `/api/profile` with loading/error states.
- [x] Carry the dark/amber design system; redesign for an APP (DONE): Inter font,
      sticky nav, `ui.jsx` atoms (Card/Badge/SectionTitle/Spinner). `npm run build`
      passes; landing + hub verified live through the proxy.
- [ ] Autocomplete / vague-input disambiguation on search (deferred)
- [ ] URL routing / deep links (react-router) — deferred; state-based nav for now
- NOTE: `BreakdownPanel` already ships a v1 of Phase 8.4 — major systems bound to
  live complaint/recall data (the layer future 3D hotspots will surface).

### 8.2 Data spine for the 4 cars
- [ ] Lock the 4; assemble full profiles (specs + reliability + recalls/complaints/safety)
      Note: real specs for RX-7 FD, S2000, Supra Mk4 already researched (web-verified)
- [ ] Define a per-car "systems map" schema (engine, drivetrain, suspension, brakes,
      electrical...) so 3D hotspots can bind to data

### 8.3 Interactive 3D viewer
- [x] Integrate Three.js / react-three-fiber; orbit / zoom / rotate (DONE 2026-06-27)
- [x] Procedural low-poly sports car (CarModel.jsx) as a stand-in + contact shadow
- [x] Graceful WebGL-unavailable fallback (Viewer3D.jsx + lib/webgl.js)
- [x] glTF/GLB loader wired (DONE 2026-06-27): lib/models.js registry + CarModel
      useGLTF + Suspense + error-boundary fallback to the procedural car. Adding a
      model = drop public/models/<slug>.glb + one registry line. 3D tab shows the
      expected slug as a hint. public/models/README.md documents the convention.
- [~] Source real models (Supra, Civic first) + tune per-model scale/orientation
      — Supra Mk4 A80 IN (temich, CC-BY-NC, TEST ONLY; optimized 13.6MB->4.9MB GLB
      via gltf-transform; rotation-aware auto-fit grounds + centers it). Viewer polish:
      grey studio background, side framing, contact-shadow grounding. Civic next.
- [ ] (Later) configurator: wheels / colors

### 8.4 Mechanical breakdown
- [x] Clickable hotspots/markers on the model for each major system (DONE 2026-06-27)
- [x] Each hotspot opens that system's info + its real complaint/recall data from the engine
- [x] Shared system map (lib/systems.js) drives BOTH the 3D hotspots and the list view
- [ ] (Later) deeper per-component views per the brief's Phase 3
- [ ] Tie hotspots to real model geometry once a glTF model replaces the procedural car

### 8.5 Perfect, then scale
- [ ] Polish the 4 cars to "showcase" quality (accuracy, performance, feel)
- [ ] Generalize the template so any catalog car can flow into the same experience

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

**Current active phase:** Phase 8 — PIVOT: Interactive Vehicle Explorer (PLANNING)
**Status:** Phases 1–5 SHIPPED (live at https://garage-ai-34hw.onrender.com). Phase 6
AI assistant BUILT (stub mode, not deployed). Phase 7 data engine BUILT locally
(profile engine + 126-car catalog) — this is the BACKBONE the pivot feeds on.
Phase 8 reframes the product into a search-engine + 3D explorer. Stack + 4 cars LOCKED
(2026-06-27): React + Vite + react-three-fiber, Flask stays the API; cars = Miata ND /
Supra Mk4 / M3 E46 / GT-R R35. Next step: scaffold the `frontend/` app, then build the
Vehicle Hub. Repo: https://github.com/darianb2/garage-ai.

> Run the web app: `./.venv/bin/python app.py` → http://localhost:5000

> Run the server with `./.venv/bin/python app.py` (Flask lives in .venv)

---

## Notes

- Keep Python simple — no fancy abstractions until Phase 2
- Prioritize data quality over quantity (research before adding a car)
- Each car should feel like a knowledgeable friend describing it, not a spec sheet
