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

## Phase 3 — Flask Web Backend

### 3.1 Setup
- [x] Install Flask (`pip install flask`) — in `.venv` (env is externally-managed)
- [x] Create `app.py` as the Flask entry point
- [x] Create `requirements.txt` (Flask==3.1.3)

### 3.2 API Endpoints
- [ ] `GET /` — serve the frontend homepage
- [ ] `GET /api/cars` — return list of all car names
- [ ] `GET /api/car/<name>` — return full data for one car
- [ ] `GET /api/search?q=<query>` — fuzzy search across all cars

### 3.3 Templates
- [ ] Create `templates/` directory
- [ ] `templates/index.html` — homepage with search bar
- [ ] `templates/car.html` — full car detail page

---

## Phase 4 — Frontend (HTML + CSS + Tailwind)

### 4.1 Setup Tailwind
- [ ] Add Tailwind CSS via CDN (no build step needed initially)
- [ ] Create `static/` directory for CSS and assets

### 4.2 Homepage
- [ ] Search bar (large, centered)
- [ ] Grid of car cards showing name + horsepower
- [ ] Mobile responsive layout

### 4.3 Car Detail Page
- [ ] Hero section: car name, engine, hp, torque, 0-60
- [ ] Accordion sections: Generation History, Common Issues, Maintenance Tips
- [ ] Oil info card
- [ ] Compare button (stretch goal)

### 4.4 Design System
- [ ] Dark theme (garage / mechanical feel)
- [ ] Typography: clean sans-serif (Inter or similar)
- [ ] Color palette: dark background, amber/orange accents
- [ ] Icons for drivetrain, transmission type

---

## Phase 5 — Production Deployment

### 5.1 Prep
- [x] Create `.gitignore` (venv, __pycache__, .env) — done early in Phase 2
- [ ] Add `Procfile` for Heroku/Railway
- [ ] Add `runtime.txt` specifying Python version
- [ ] Move any secrets to `.env`

### 5.2 Deploy
- [ ] Push to GitHub
- [ ] Deploy to Railway.app (free tier, easiest for Flask)
- [ ] Set up custom domain (optional)
- [ ] Verify mobile experience

### 5.3 Polish
- [ ] Add favicon (wrench icon or similar)
- [ ] Add meta tags for SEO and social sharing
- [ ] Add a "suggest a car" form (sends to a log or email)
- [ ] Google Analytics or simple hit counter

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

**Current active phase:** Phase 3 — Flask Web Backend (3.1 done; 3.2 API endpoints next)
**Next task:** Add API endpoints to app.py: GET /api/cars, GET /api/car/<name>, GET /api/search?q= (Phase 3.2)

> Run the server with `./.venv/bin/python app.py` (Flask lives in .venv)

---

## Notes

- Keep Python simple — no fancy abstractions until Phase 2
- Prioritize data quality over quantity (research before adding a car)
- Each car should feel like a knowledgeable friend describing it, not a spec sheet
