# Garage AI — Project Index

## Directory Structure

```
garage-ai/
├── app.py               # Flask web backend (loads data via loader); run from .venv
│                        #   routes: / (homepage), /car/<name> (detail),
│                        #           /api/cars, /api/car/<name>, /api/search
├── templates/
│   ├── index.html       # homepage — search bar + live-filtered car grid
│   └── car.html         # detail page — all 16 fields + generations/issues/tips/mods
├── requirements.txt     # Python deps (Flask)
├── main.py              # CLI app — lookup/display/compare/filter logic (loads data via loader)
│                        #   funcs: display_car(), find_matches(), list_cars(),
│                        #          parse_comparison(), compare_cars(), resolve_one(),
│                        #          parse_filter(), show_filter()
│                        #   features: startup listing, case-insensitive + partial search,
│                        #             'A vs B' comparison, drivetrain/hp filtering
├── loader.py            # load_cars() — reads data/cars/*.json into an ordered dict
├── search.py            # find_matches() — shared name matching (CLI + API)
├── validator.py         # schema/type validation; run standalone or at startup
├── scripts/
│   └── add_car.py       # interactive prompt → validated, numbered car JSON
├── data/
│   └── cars/            # one NN-slug.json per car (16 files; NN preserves order)
├── MASTERPLAN.md        # Roadmap, phases, task checklist
├── INDEX.md             # This file
├── README.md            # Project overview
└── notes/
    └── python.md        # Python learning notes
```

## Car Database (main.py)

| Car | Engine | HP | Drivetrain | Gens Documented |
|---|---|---|---|---|
| Honda Civic Si | 1.5L turbo I4 | 200 | FWD | 7 (1992–present) |
| Subaru WRX | 2.4L turbo H4 | 271 | AWD | 5 (1992–present) |
| Audi S3 | 2.0L turbo I4 | 306 | AWD | 4 (1999–present) |
| Ford Mustang GT | 5.0L V8 | 460 | RWD | 4 (1994–present) |
| Toyota GR86 | 2.4L flat-4 | 228 | RWD | 3 (2012–present) |
| Infiniti Q50 3.7 | 3.7L V6 | 328 | RWD/AWD | 2 (2014–2015) |
| Infiniti Q50 3.0t | 3.0L TT V6 | 300 | RWD/AWD | 3 (2016–2024) |
| Infiniti Q50 Red Sport 400 | 3.0L TT V6 | 400 | RWD/AWD | 3 (2016–2024) |
| Nissan 370Z | 3.7L V6 | 332 | RWD | 3 (Z33→RZ34 lineage) |
| BMW M3 | 3.0L TT I6 (S58) | 503 | RWD/AWD | 4 (E46→G80) |
| Dodge Charger R/T / Scat Pack | 6.4L 392 HEMI V8 | 485 | RWD | 3 (LX→LB Daytona) |
| Honda Civic Type R | 2.0L turbo I4 (K20C1) | 315 | FWD | 4 (EK9→FL5) |
| Mazda MX-5 Miata | 2.0L Skyactiv I4 | 181 | RWD | 4 (NA→ND) |
| Toyota GR Supra | 3.0L turbo I6 (B58) | 382 | RWD | 4 (A40→A90) |
| Volkswagen Golf GTI | 2.0L turbo I4 (EA888) | 241 | FWD | 5 (Mk1→Mk8) |
| Chevrolet Camaro SS | 6.2L V8 (LT1) | 455 | RWD | 6 (1967→2024) |

## Data Fields Per Car

| Field | Description |
|---|---|
| `engine` | Engine displacement, type, and code |
| `horsepower` | Peak HP |
| `torque` | Peak torque (lb-ft) |
| `drivetrain` | FWD / RWD / AWD |
| `transmission` | Gearbox type |
| `0_to_60` | 0–60 mph time |
| `fuel_economy` | EPA city/highway mpg |
| `curb_weight` | Curb weight in lbs |
| `reliability` | Reliability score (1-10) with reasoning |
| `cost_to_own` | Insurance tier + estimated annual maintenance cost |
| `oil_type` | Recommended oil spec |
| `oil_interval` | Recommended oil change interval |
| `generations` | Dict of gen name → description |
| `common_issues` | List of known problems |
| `maintenance_tips` | List of maintenance advice |
| `popular_mods` | List of common modifications and tuning paths |

## Roadmap Summary

| Phase | Focus | Status |
|---|---|---|
| 1 | CLI expansion — more cars, more data | ✅ Complete |
| 2 | Data architecture — JSON files + loader | ✅ Complete |
| 3 | Flask web backend + API | ✅ Complete |
| 4 | Frontend — HTML/CSS/Tailwind | ⬜ Not Started |
| 5 | Production deployment | ⬜ Not Started |

See `MASTERPLAN.md` for full task checklist.
