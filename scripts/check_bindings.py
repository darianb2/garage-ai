"""Regression check for curated-spec generation/trim bindings.

The curated JSON files (data/cars/*.json) each document ONE generation — often
one trim — of a car, and app.CURATED_SPEC_BINDINGS is the hand-maintained map
that decides which catalog car gets which file's specs. It is easy to break in
ways that are invisible in the UI (a car silently shows another generation's
numbers, or a curated file silently reaches nobody), so this asserts the
behaviour we care about against the SHIPPING logic in app.py.

Run:  ./.venv/bin/python scripts/check_bindings.py    (exit 0 = pass)
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import app  # noqa: E402  (loads cars + catalog + the bindings)

curated_for = app._curated_for
failures = []


def check(label, got, expected):
    if got != expected:
        failures.append(f"{label}\n    expected {expected}\n    got      {got}")


# 1) Integrity: the startup validator must find nothing (no dead bindings, no
#    same-trim year overlaps). This is the guardrail against silent drift.
problems = app.validate_spec_bindings()
if problems:
    failures.append("validate_spec_bindings() reported problems:\n    " +
                    "\n    ".join(problems))

# 2) Right generation, not another one (the original Task 1 bug).
check("A80 Supra != GR Supra", curated_for("Toyota", "Supra", 1997),
      ["Toyota Supra Mk4 (A80)"])
check("A90 GR Supra", curated_for("Toyota", "GR Supra", 2021), ["Toyota GR Supra"])
check("E46 M3", curated_for("BMW", "M3", 2003), ["BMW M3 (E46)"])
check("E30 M3", curated_for("BMW", "M3", 1988), ["BMW M3 (E30)"])
check("E92 M3", curated_for("BMW", "M3", 2010), ["BMW M3 (E92)"])
check("NA Miata has no ND specs", curated_for("Mazda", "MX-5 Miata", 1994), [])

# 3) Trim gating: one model+year, several trims -> only the matching trim's file.
check("Camaro SS gets SS specs",
      curated_for("Chevrolet", "Camaro", 2016, "SS (6th Gen)"),
      ["Chevrolet Camaro SS"])
check("Camaro ZL1 does NOT get SS specs",
      curated_for("Chevrolet", "Camaro", 2018, "ZL1"), [])
check("Mustang GT (S550) gets GT specs",
      curated_for("Ford", "Mustang", 2018, "GT (S550)"), ["Ford Mustang GT"])
check("Mustang GT350 does NOT get GT specs",
      curated_for("Ford", "Mustang", 2016, "Shelby GT350"), [])
check("Mustang Mach 1 does NOT get GT specs",
      curated_for("Ford", "Mustang", 2021, "Mach 1"), [])
check("Pre-S550 Mustang GT (2011) stays unbound",
      curated_for("Ford", "Mustang", 2011, "GT (S197 5.0)"), [])
check("Charger Scat Pack gets specs",
      curated_for("Dodge", "Charger", 2015, "R/T Scat Pack"),
      ["Dodge Charger R/T / Scat Pack"])
check("Charger Hellcat does NOT get Scat Pack specs",
      curated_for("Dodge", "Charger", 2016, "Hellcat"), [])
check("VW GTI Mk8 gets specs",
      curated_for("Volkswagen", "GTI", 2022, "Mk8"), ["Volkswagen Golf GTI"])
check("VW GTI Mk7 (2015) stays unbound",
      curated_for("Volkswagen", "GTI", 2015, "Mk7"), [])

# 4) Freeform lookup (no generation) must NOT guess a trim-gated binding, but
#    must still resolve non-trim-gated ones by year.
check("Freeform Camaro (no trim) resolves nothing",
      curated_for("Chevrolet", "Camaro", 2016), [])
check("Freeform E46 M3 still resolves by year",
      curated_for("BMW", "M3", 2003), ["BMW M3 (E46)"])

# 5) ND1 vs ND2: the file is ND2 (181hp), so 2016-18 ND1 must not get it.
check("ND1 Miata (2016) stays unbound (ND2-only file)",
      curated_for("Mazda", "MX-5 Miata", 2016, "ND"), [])
check("ND2 Miata (2019) gets specs",
      curated_for("Mazda", "MX-5 Miata", 2019, "ND"), ["Mazda MX-5 Miata"])

if failures:
    print("FAIL — %d binding check(s) failed:\n" % len(failures))
    for f in failures:
        print("  - " + f)
    sys.exit(1)
print("PASS — all binding checks green.")
