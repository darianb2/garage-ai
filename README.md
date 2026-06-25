# Garage AI

A **pocket mechanic** — a researched database of enthusiast cars with full specs,
generation history, common issues, maintenance tips, oil specs, cost-to-own, and
popular mods. Runs as both a command-line tool and a web app.

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

## Running it

### CLI
```bash
python3 main.py
```
Try: `q50` · `civic si vs wrx` · `awd` · `over 400 hp`

### Web app
```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/python app.py
```
Then open <http://localhost:5000>.

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
`Procfile` and `runtime.txt` are set up for Railway / Heroku using gunicorn:
```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

## Learning Log

Day 1
- Installed Git
- Initialized repository
- Learned basic Linux commands
