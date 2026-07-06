# Garage AI

A **pocket mechanic** — a researched database of enthusiast cars with full specs,
generation history, common issues, maintenance tips, oil specs, cost-to-own, and
popular mods, plus an AI research assistant that answers real ownership questions
and grounds itself in verified data and live NHTSA safety records.
Runs as both a command-line tool and a web app.

**Live:** <https://garage-ai-34hw.onrender.com>
(free tier — the first visit after a while may take a few seconds to wake up)

## Purpose
I am learning Python, Linux, Git, AI and software engineering by building an AI
that helps people research and compare new and used cars.

## Features
- **71 fully-researched cars**, each with **16 data fields**: engine, horsepower,
  torque, drivetrain, transmission, 0-60, fuel economy, curb weight, reliability,
  cost-to-own, oil type/interval, generation history, common issues, maintenance
  tips, popular mods.
- **256-car breadth catalog** (`data/catalog.json`) — a lightweight index of
  popular enthusiast cars (make, model, year, generation, body) so you can browse
  far more than the deep-researched set, each linking into the app.
- **Ask Garage AI** — a grounded Q&A assistant. It answers first from our curated
  specs + free NHTSA data (Tier 1), and escalates to a web search tool (Tier 2)
  only for what our data doesn't cover (pricing, road-test impressions, a specific
  TSB). Trusted sources win conflicts, and it says so when it isn't sure.
- **Per-car insight chips** — one-tap prompts on each car page: *What breaks?*,
  *Before you buy*, *Should I mod it?*, *5-year cost*, *Right for me?*
- **Compare view** — side-by-side specs for multiple cars plus an AI
  key-differences summary.
- **Live safety data** — NHTSA recalls and a Claude-written summary of what owners
  actually report in the complaint record (grounded only in the pulled data).
- **CLI**: case-insensitive + partial search, `A vs B` comparison, and
  drivetrain/horsepower filters.
- **Web app**: searchable card grid, detail pages, catalog browse, and a JSON API.
- **Clean data layer**: each car is a validated JSON file, separate from the code;
  the "data engine" (`car_profile.py` + `nhtsa.py`) builds profiles on demand so
  the app isn't limited to hand-typed cars.

## Setup & running

A Python (Flask) backend that serves a prebuilt React frontend. It runs the same
on **macOS, Windows, and Linux**. The built frontend (`frontend/dist`) is
committed, so **to just run the app you only need Python** — Node is required only
if you want to change the frontend.

### Prerequisites
- **Python 3.12+** — macOS: `brew install python@3.12` (or [python.org]);
  Windows: the [python.org] installer (tick "Add python.exe to PATH").
- **Node 18+** *(only to rebuild the frontend)* — macOS: `brew install node`;
  Windows: [nodejs.org].

[python.org]: https://www.python.org/downloads/
[nodejs.org]: https://nodejs.org/

### Run the web app

**macOS / Linux**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

**Windows (PowerShell)**
```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Then open <http://localhost:5000>. (With the venv active, the `python` command is
the same on every OS — only the venv path differs.)

> **macOS port note:** macOS's AirPlay Receiver occupies port 5000. If the app
> won't bind, either turn AirPlay Receiver off (System Settings → General →
> AirDrop & Handoff) or run on another port — `app.py` reads a `PORT` env var, so
> `PORT=5055 python app.py` works.

### CLI
With the venv active: `python main.py` — try `q50` · `civic si vs wrx` · `awd` · `over 400 hp`.

### Rebuilding the frontend (only if you edit it)
```bash
cd frontend
npm install
npm run build        # writes frontend/dist, which Flask serves
```

### AI features
The AI answer/compare/summary features call Anthropic (model `claude-opus-4-8`).
Set a key to enable them; without one the app runs a free "demo" stub.
- macOS / Linux: `export ANTHROPIC_API_KEY=sk-...`
- Windows (PowerShell): `$env:ANTHROPIC_API_KEY = "sk-..."`

> `gunicorn` (in `requirements.txt`) is the Linux production server used on Render
> and won't run on Windows — locally, just use `python app.py` on every OS.

### JSON API
- `GET /api/cars` — list of car summaries
- `GET /api/car/<name>` — full data for one car
- `GET /api/search?q=<query>` — fuzzy search
- `GET /api/catalog` — the breadth catalog of popular cars
- `POST /api/answer` — Ask Garage AI (grounded answer, web-search escalation)
- `POST /api/ask/<name>` — ask about one specific car
- `POST /api/compare` — side-by-side specs + AI key-differences summary
- `GET /api/recalls` · `GET /api/profile` — NHTSA recalls and complaint profile

## Adding a car
```bash
python3 scripts/add_car.py       # interactive prompts → validated JSON
python3 validator.py             # confirm all cars pass the schema
python3 scripts/build_catalog.py # regenerate the breadth catalog
python3 scripts/check_bindings.py # verify catalog cars map to the right spec file
```

## Architecture
| File | Role |
|------|------|
| `data/cars/*.json` | one file per car (the deep-researched data) |
| `data/catalog.json` | breadth catalog of popular cars (make/model/year/gen) |
| `loader.py` | loads car JSON + catalog into ordered structures |
| `validator.py` | schema + type validation |
| `search.py` | shared name matching (used by CLI **and** API) |
| `nhtsa.py` | free NHTSA recalls/complaints API client (no key needed) |
| `car_profile.py` | builds one car profile on demand from curated + NHTSA data |
| `main.py` | command-line interface |
| `app.py` | Flask web backend + JSON API + AI endpoints |
| `frontend/` | React app; the built `frontend/dist` is committed and served |
| `templates/` | `base`, `index`, `car`, `catalog`, `profile` (Tailwind, dark theme) |
| `scripts/` | `add_car.py`, `build_catalog.py`, `check_bindings.py` |

## Deploying
Deployed on [Render](https://render.com) from `render.yaml` (free web-service tier).
Render reads the blueprint, installs `requirements.txt`, and runs the same gunicorn
command the `Procfile` uses:
```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```
Render ignores `runtime.txt`, so the Python version is pinned via the
`PYTHON_VERSION` env var in `render.yaml`. (`Procfile` + `runtime.txt` remain for
Railway / Heroku compatibility.)

## Learning Log

Day 1
- Installed Git
- Initialized repository
- Learned basic Linux commands
