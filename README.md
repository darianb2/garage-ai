# Garage AI

A **pocket mechanic** — a researched database of enthusiast cars with full specs,
generation history, common issues, maintenance tips, oil specs, cost-to-own, and
popular mods. Runs as both a command-line tool and a web app.

**Live:** <https://garage-ai-34hw.onrender.com>
(free tier — the first visit after a while may take a few seconds to wake up)

## Purpose
I am learning Python, Linux, Git, AI and softtware engineering by building an AI
that helps people reseach and compare new and used cars.

## Features
- **16 cars**, each with **16 data fields**: engine, horsepower, torque, drivetrain,
  transmission, 0-60, fuel economy, curb weight, reliability, cost-to-own,
  oil type/interval, generation history, common issues, maintenance tips, popular mods.
- **CLI**: case-insensitive + partial search, `A vs B` comparison, and drivetrain/horsepower filters.
- **Web app**: searchable card grid, detail pages, and a JSON API.
- **Clean data layer**: each car is a validated JSON file, separate from the code.

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

### CLI
With the venv active: `python main.py` — try `q50` · `civic si vs wrx` · `awd` · `over 400 hp`.

### Rebuilding the frontend (only if you edit it)
```bash
cd frontend
npm install
npm run build        # writes frontend/dist, which Flask serves
```

### AI features
The AI answer/compare/summary features call Anthropic. Set a key to enable them;
without one the app runs a free "demo" stub.
- macOS / Linux: `export ANTHROPIC_API_KEY=sk-...`
- Windows (PowerShell): `$env:ANTHROPIC_API_KEY = "sk-..."`

> `gunicorn` (in `requirements.txt`) is the Linux production server used on Render
> and won't run on Windows — locally, just use `python app.py` on every OS.

### JSON API
- `GET /api/cars` — list of car summaries
- `GET /api/car/<name>` — full data for one car
- `GET /api/search?q=<query>` — fuzzy search

## Adding a car
```bash
python3 scripts/add_car.py     # interactive prompts → validated JSON
python3 validator.py           # confirm all cars pass the schema
```

## Architecture
| File | Role |
|------|------|
| `data/cars/*.json` | one file per car (the data) |
| `loader.py` | loads all car JSON into an ordered dict |
| `validator.py` | schema + type validation |
| `search.py` | shared name matching (used by CLI **and** API) |
| `main.py` | command-line interface |
| `app.py` | Flask web backend + JSON API |
| `templates/` | `base.html`, `index.html`, `car.html` (Tailwind, dark theme) |

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
