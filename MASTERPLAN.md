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

## Phase 6 — AI Research Assistant ("Ask about this car") — LIVE

Goal: an in-app assistant that gives the enthusiast-owner wisdom Google scatters
across forums — grounded on each car's verified JSON, synthesized by Claude.

### 6.1 v1 — per-car assistant (LIVE on Render since 2026-07-04)
- [x] `POST /api/ask/<car>` endpoint: grounded prompt (`_car_facts` + `SYSTEM_TEMPLATE`),
      Claude `claude-opus-4-8` via the official `anthropic` SDK
- [x] Key-gated: no `ANTHROPIC_API_KEY` → returns a stub, so the UI works with no cost
- [x] Frontend on `car.html`: "Ask Garage AI" panel — one-tap insight chips
      (What breaks? / Before you buy / Should I mod it? / 5-year cost / Right for me?)
      + freeform box + `fetch()` JS
- [x] First guardrail: 500-char question cap
- [x] Add `ANTHROPIC_API_KEY` — set in the Render dashboard; LIVE (2026-07-04).
      Verified against the deployed `/api/answer`: real grounded `claude-opus-4-8`
      answers (identified 2003 BMW M3, sourced from curated specs + NHTSA), not the
      stub. (~2-3¢/answer, bounded by the rate limits below.)
- [x] Add per-IP rate limiting BEFORE the key goes live on the public URL (cost abuse)
      — `rate_limit_error()` in app.py: 10/IP/hour + 300/day global ceiling, in-memory
      (single gunicorn worker on free tier), reads X-Forwarded-For; returns 429
- [x] Raise max_tokens 1024 → 2048 (1024 truncated the longer "checklist" answers)
- [x] Decided: shipped the key + rate limit to Render (not the stub) — AI is live.

### 6.2 v2 ideas (later)
- [ ] Live web search (server-side `web_search` tool) for current pricing / recalls
- [ ] Global homepage chat (answer/compare across any car)
- [ ] Stream responses (SSE) instead of wait-then-render
- [ ] Fix the write-only suggestions log (retrievable suggestions — a web-dev lesson)

---

## Phase 7 — Data Engine (live API profiles) — ✅ COMPLETE (2026-07-06)

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
- [x] Harden against NHTSA API flakiness (2026-07-06): `_get_json` retries one
      transient failure (5xx/timeout/reset — never 4xx), and `build_profile`
      refetches once when recalls AND complaints both come back empty, so a
      blip can't render as an authoritative "0 recalls" clean bill of health.
      gunicorn `--timeout 90` (Procfile + render.yaml) so a slow NHTSA + AI
      summary chain can't SIGKILL the single free-tier worker mid-request.
- [x] Decide what to do with the older `/recalls` page — FOLDED into /profile
      (2026-07-06): `/recalls` 301-redirects to `/profile` with the query string
      forwarded, so old bookmarks land on the assembled profile. `recalls.html`
      deleted; `/api/recalls` kept (documented public JSON endpoint).
- [x] Push + deploy to Render (2026-07-06, with the batch-4 catalog below)

### 7.2 Enthusiast catalog (breadth) — IN PROGRESS
- [x] `scripts/build_catalog.py` -> `data/catalog.json`: lightweight entries
      (make/model/year/generation/body/note) for popular enthusiast cars. Only
      reliable facts; NO hand-written specs. Easy to grow toward 500 in batches.
- [x] `loader.load_catalog()` + `GET /catalog` browsable, searchable page; each
      card links to `/profile?make=&model=&year=` and auto-runs the engine
- [x] Homepage links to the catalog
- [x] First batch: 126 cars (JDM / German / American / hot hatch / classics)
- [x] Grow the catalog toward ~500 in further batches (add tuples + rerun script) —
      DONE at 502 (2026-07-06). Batch 4 added 159: deeper JDM/German/Italian/
      British benches, modern American + off-road/EV, Korean, Euro hot hatches,
      classics — plus catalog homes for the orphan curated files (Q50 trims,
      S3 8Y, M3 G80/F80, WRX VB). Batch 3 added 87 (first Ferrari/Lamborghini/
      McLaren/Aston/Maserati; 54 makes). Batch 2 added 93.
- [x] Batch 5 (2026-07-06, post-completion): +81 everyday economy & family
      cars for NON-enthusiasts (583 total) — commuter sedans, compact/3-row
      crossovers, minivans, budget hatches (Camry/Corolla/Altima/Elantra/
      Sonata gens, CR-V/RAV4/Tucson/Sportage/Forester, Pacifica/Carnival/
      Grand Caravan, Mirage/Versa/Spark...). The profile engine's recall/
      complaint data is most valuable exactly here (e.g. the 2011 Sonata
      surfaces its 3,368 complaints, Engine near the top). All new entries
      verified honest-NHTSA (no accidental curated-spec matches).
      Brand-by-brand curated-spec coverage: Honda (29 entries), Toyota
      (21 entries), and BMW (12 entries) are fully curated, including enthusiast
      icons (S2000/NSX/Prelude/CRX; GR Corolla, MR2 SW20, MR2 Spyder, Celica
      GT-Four ST205; M3 E30/E36/E92, M2, M4, M5 E39/E60, 1M, 335i, Z4 M, 2002 tii).
- [x] Generation-aware curated-spec matching. The old make+model-substring
      match (A80 Supra showed GR Supra specs) was replaced by year-range
      CURATED_SPEC_BINDINGS (Task 1), then made TRIM-aware this pass: bindings
      can gate on the catalog `generation` tokens, so one model+year that spans
      trims resolves correctly (Camaro SS not the ZL1, Mustang GT not the
      GT350/GT500/Mach 1). `generation` now flows catalog -> /api/profile,
      /api/answer, /api/compare (+ the legacy /profile page). Wired up 4 orphan
      curated files this pass (Camaro SS, Mustang GT S550, Charger Scat Pack, VW
      GTI Mk8) and narrowed the MX-5 binding to ND2 (2019+) since the file
      carries the 181hp ND2 figure (ND1 155hp left honest-NHTSA until curated).
      Guardrail: validate_spec_bindings() flags dead bindings + same-trim year
      overlaps at startup; scripts/check_bindings.py is the regression test.
      ORPHANS CLOSED (2026-07-06): batch 4 gave 6 of the 7 catalog homes +
      bindings — generic "BMW M3" bound to the new G80 entry (2021+; the F80
      stays unbound since the file carries S58 figures), Subaru WRX to the new
      VB entry (2022+), Audi S3 to a new 8Y entry (2022-2024; web-verified the
      file's 306hp is the US 8Y figure — US 8V made 288-292hp, so the 8V entry
      stays unbound), and the 3 Infiniti Q50 trims via trim-gated bindings
      (3.7 2014-15 / 3.0t / Red Sport 400 2016-24), Camaro-SS-style. Only
      Honda Accord V6 remains an intentional orphan (the binding system has no
      negative trim gates, so it can't be split from the ungated 9th-gen
      binding without mismatching).

### 7.3 Flagship depth (rich 16-field icons) — SUPERSEDED by Phase 8
The pivot (8.0) replaced "flagship depth across the catalog" with "perfect the 4
launch cars end-to-end" — and that work is done (71 curated cars now carry full
16-field JSONs + systems maps via 8.2). No separate 7.3 work remains.

### 7.4 Paid specs + smarter resolve — DEFERRED to the Phase 8 backlog
These stay valuable but belong to the pivot's "generalize the template" step
(8.5), not to closing out the data engine:
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
- [x] Lock the 4; assemble full profiles (specs + reliability + recalls/complaints/safety).
      All 4 launch cars (Miata ND, Supra A80, M3 E46, GT-R R35) have curated 16-field
      JSONs, and every spec field was web-verified against OEM / Car and Driver / EPA
      (2026-07): corrected Supra fuel economy (15/22 turbo), M3 highway mpg (coupe
      16/24), GT-R generation dates (R35 ended Aug 2025). Live NHTSA data comes from
      the profile engine on demand.
- [x] Per-car "systems map" schema — a car's JSON carries a `systems_map`:
      { <system key> -> { detail, watch } } keyed to the shared lib/systems.js keys
      (engine/drivetrain/suspension/brakes/electrical/fuel/body). `computeSystems()`
      merges it (via profile.specs) so BOTH the Explode/3D detail panel and the
      Mechanical Breakdown cards show curated "what it is / what to watch" text
      alongside live NHTSA counts. Uncurated cars fall back to the NHTSA-only view.
- [x] Systems-map coverage: now ALL 71 of 71 curated cars. The final batch of 25
      completed this pass: the full Civic Si lineage (EG/EM1/EP3/8th/9th/10th +
      the generic Si), Prelude BB6, CRX EF; the enthusiast BMWs (M3 E36, M4 F82,
      M5 E60, 1M, 335i E92, Z4 M E86, 2002 tii, plus the generic G80 M3); the
      3 Infiniti Q50 trims (3.7 / 3.0t / Red Sport 400); Audi S3; Toyota GR
      Corolla, MR2 Spyder, Celica GT-Four; and the Charger R/T Scat Pack. Each
      map is grounded on the file's already-web-verified `common_issues` (re-bucketed
      by system) with well-established hardware facts in `detail`; new failure-mode
      claims were web-verified. Verified live through /api/profile — 20 of the 25
      surface immediately in Profile. The remaining 5 are the SAME known Phase-7.2
      "intentional orphans" (below): the generic G80 `BMW M3`, `Audi S3` (an 8V
      catalog entry exists but stays unbound until 8V-vs-8Y hp is verified), and the
      3 Q50 trims (no Q50 in the catalog). Their maps are done and will appear the
      moment a catalog binding is added.
- [x] BUGFIX: the Marble redesign replaced the Breakdown/3D tabs, orphaning the
      systems_map display. Re-surfaced it as a "Systems breakdown" section inside
      Profile mode (reuses BreakdownPanel via computeSystems), so all curated
      systems maps are visible again.

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
AI assistant LIVE on Render (real Claude answers, key set + rate-limited). Phase 7
data engine COMPLETE 2026-07-06 (profile engine + 502-car catalog, generation/
trim-aware curated specs, /recalls folded into /profile; 7.4 deferred to the
Phase 8 backlog) — the BACKBONE the pivot feeds on. Phase 8 SHIPPED its first product: the
"Marble" redesign — search-first landing + one-stage Vehicle Hub with Profile /
Showroom (configurator) / Explode (parts + sources) modes; 4 launch cars (Miata ND /
Supra A80 / M3 E46 / GT-R R35) with real GLB models, curated systems maps, and
web-verified specs. Repo: https://github.com/darianb2/garage-ai.

> Run the web app: `./.venv/bin/python app.py` → http://localhost:5000

> Run the server with `./.venv/bin/python app.py` (Flask lives in .venv)

---

## Notes

- Keep Python simple — no fancy abstractions until Phase 2
- Prioritize data quality over quantity (research before adding a car)
- Each car should feel like a knowledgeable friend describing it, not a spec sheet
