# Task 1 — Spec ↔ generation review list

Created 2026-06-29 as part of the garage-ai-fix-plan Task 1 (fix spec/generation
mismatch).

## Root cause (fixed)

`app._curated_for(make, model)` matched curated specs by **make+model substring
only**, ignoring the year. Each curated JSON in `data/cars/` documents **one**
generation (its top-level engine/hp/transmission are that generation's), so the
loose match pasted the wrong generation's specs onto older/other cars — e.g. the
**A90 GR Supra (382hp B58)** specs showed on the **1997 A80 Mk4 (2JZ-GTE)** page,
and "GT" even cross-matched the **Ford GT supercar** to the Mustang GT.

Fix: `_curated_for(make, model, year)` now binds specs by (make, model, year-range)
via `CURATED_SPEC_BINDINGS` in `app.py`. A car gets curated specs only when its year
falls inside a generation we've actually curated; otherwise the page shows live
NHTSA data only (the `Specs` card hides itself when `specs` is null). This is a
backend-only change — no frontend rebuild needed.

## Bound (verified correct) — 6 of 137

| Catalog entry | Curated file (generation) |
|---|---|
| 2022 Honda Civic Si (FE1) | Honda Civic Si — 11th-gen FE1 |
| 2023 Honda Civic Type R (FL5) | Honda Civic Type R — FL5 |
| 2022 Toyota GR86 (ZN8) | Toyota GR86 — 2nd-gen ZN8 |
| 2021 Toyota GR Supra (A90) | Toyota GR Supra — A90/A91 |
| 2015 Nissan 370Z (Z34) | Nissan 370Z — Z34 |
| 2016 Mazda MX-5 Miata (ND) | Mazda MX-5 Miata — ND |

### Flagged value to verify
- **2016 Mazda MX-5 (ND1)**: the curated file carries **181 hp**, which is the
  **ND2 (2019+)** figure. 2016–2018 ND1 made **155 hp**. Bound for the whole ND
  run, but the hp (and 0–60) are ND2's. Either split ND1/ND2 or correct the figure.

## Now NHTSA-only — candidates for future per-generation curation (26)

These previously showed wrong-generation specs and now correctly show live NHTSA
data with no spec block. Each is a candidate for a real, generation-matched curated
page later (Task 9 / launch-car work). **Do not invent specs** — use authoritative
sources when curating.

- **Toyota Supra**: 1997 A80 (Mk4, 2JZ-GTE), 1989 A70 (Mk3, 7M-GTE)
- **BMW M3**: 1990 E30, 1997 E36, 2003 E46, 2010 E92 (curated file is the G80)
- **Honda Civic Si**: 1994 EG, 1999 EM1, 2003 EP3, 2007 FG2, 2008 FA5, 2013 FB6,
  2014 FG4, 2018 FC3, 2019 FC1 (curated file is the FE1)
- **Mazda MX-5**: 1994 NA, 2001 NB, 2008 NC (curated file is the ND)
- **Ford Mustang**: 1969 Boss 302, 1990 Fox-body GT, 2016 Shelby GT350,
  2020 Shelby GT500 (curated file is the S550/S650 GT)
- **Ford GT**: 2006 Mk1 supercar (was cross-matched off "GT")
- **Chevrolet Camaro**: 2018 ZL1 (curated file is the SS)
- **Volkswagen Golf GTI**: 2012 Mk6 (curated file is the Mk8)
- **Nissan Z**: 2023 RZ34 (curated file is the 370Z Z34)

## Launch-car gap (decision needed)

`notes/project-status.md` lists the 4 launch cars as **MX-5 ND, Supra Mk4, M3 E46,
GT-R R35**. After this fix, **Supra Mk4 and M3 E46 show no spec block** (their
curated files are the A90 and G80). To deliver the launch-car experience, those two
need proper generation-matched curated pages. Authoritative Mk4 specs are even given
in the fix plan (2JZ-GTE, ~320hp US / 276hp JDM, 6-speed Getrag V160, RWD, ~3,400lb).
The GT-R R35 has no curated file at all yet.
