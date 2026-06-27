# Garage AI — Project Status

Snapshot as of 2026-06-27. Audit of where the project stands after the Phase 8 pivot.

## What Garage AI is now

A pivot is underway (see MASTERPLAN Phase 8). The product is moving from "a browsable
database of cars" to an **interactive vehicle search engine**: search a brand/model/trim,
then explore a "Vehicle Hub" with three linked layers — a live data profile, an
interactive 3D model, and a clickable mechanical breakdown of the car's major systems.

Strategy: perfect 4 launch cars end-to-end (Mazda MX-5 Miata ND, Toyota Supra Mk4,
BMW M3 E46, Nissan GT-R R35), then scale the same template.

## Architecture (how the pieces fit)

```
  React frontend (frontend/)            Flask backend (Python)
  - Vite + React + react-three-fiber    - app.py        HTTP routes + JSON API
  - search-first Landing                - car_profile.py  assembles a profile
  - Vehicle Hub (Profile/3D/Breakdown)  - nhtsa.py        live NHTSA API client
        |                               - loader.py       loads cars + catalog
        |  fetch /api/* (Vite proxy        - data/cars/*.json   17 curated cars
        |   in dev; same origin in prod)   - data/catalog.json  126 catalog cars
        +----------------------------->  - the "data engine" is the backbone
```

The data engine builds a profile for ANY car on demand from free NHTSA APIs
(recalls + complaints + crash-test), derives "common issues" + a reliability proxy,
and merges our curated JSON specs when we have that car.

## What is built (and verified)

- Data engine: nhtsa.py (recalls/complaints/safety), car_profile.build_profile(),
  GET /api/profile, GET /api/catalog. Validator passes (17 cars valid).
- Catalog: scripts/build_catalog.py -> data/catalog.json (126 enthusiast cars).
- Legacy Jinja pages still exist (templates/): /, /car/<name>, /profile, /recalls,
  /catalog. These are the OLD UI; the React app is the new front door.
- React frontend: Landing (search over catalog), VehicleHub (3 tabs), ProfilePanel,
  BreakdownPanel (systems bound to live data), Viewer3D (placeholder + WebGL fallback).
  `npm run build` passes; landing + hub verified live through the Vite proxy.

## Known issues / open items

- TWO frontends coexist: legacy Jinja (templates/) and new React (frontend/). The
  React app is the future; need a plan to retire Jinja and have Flask serve the
  React build in production.
- 3D needs WebGL. The local dev browser could not create a WebGL context (GPU/driver
  issue) — a local-dev hurdle, handled with a graceful fallback. Enable hardware
  acceleration / try another browser to see the 3D.
- No real 3D models yet (placeholder block). Next: source glTF/GLB for a launch car.
- NHTSA model-name matching is imperfect (e.g. "GT-R" returns nothing). Curated-specs
  match is make+model substring, so it can bleed across generations (A80 Supra shows
  GR Supra specs). To fix when perfecting the 4.
- Phase 6.1 AI assistant is built but runs in stub mode (no ANTHROPIC_API_KEY) and is
  not deployed.
- Deploy story will change: render.yaml serves Flask only; the React build needs a
  Node build step + Flask serving the static bundle. Not yet configured.
- Catalog is 126 cars, not 500; grow in batches (add tuples to build_catalog.py).
- No automated tests beyond validator.py.

## How to run locally

```
# backend (terminal 1)
./.venv/bin/python app.py            # http://localhost:5000  (Flask + data engine)

# frontend (terminal 2)
npm --prefix frontend run dev        # http://localhost:5173  (React app, proxies /api)
```

## Next steps

1. Source the first real 3D model (glTF/GLB) and load it in Viewer3D.
2. Fix NHTSA model-matching for the 4 launch cars.
3. Flagship depth: real specs already web-researched for RX-7 FD, S2000, Supra Mk4 —
   write them as full data/cars/*.json entries.
4. Decide how the React app and Flask deploy together (Render build step).
