# Garage AI — Project Index

## Directory Structure

```
garage-ai/
├── main.py              # CLI app — car data + lookup logic
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
| `oil_type` | Recommended oil spec |
| `oil_interval` | Recommended oil change interval |
| `generations` | Dict of gen name → description |
| `common_issues` | List of known problems |
| `maintenance_tips` | List of maintenance advice |

## Roadmap Summary

| Phase | Focus | Status |
|---|---|---|
| 1 | CLI expansion — more cars, more data | 🔄 In Progress |
| 2 | Data architecture — JSON files + loader | ⬜ Not Started |
| 3 | Flask web backend + API | ⬜ Not Started |
| 4 | Frontend — HTML/CSS/Tailwind | ⬜ Not Started |
| 5 | Production deployment | ⬜ Not Started |

See `MASTERPLAN.md` for full task checklist.
