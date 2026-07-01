"""Generate data/catalog.json: a lightweight catalog of popular enthusiast cars.

WHY THIS EXISTS
---------------
The full per-car JSON in data/cars/ carries 16 hand-researched fields. We do NOT
hand-write those for hundreds of cars - that would mean inventing specs, which
the project explicitly forbids (data lives in APIs, not the AI's memory).

Instead, this catalog stores only RELIABLE, low-risk facts: make, model, a
representative model year, generation label, body style, and a short enthusiast
note. Everything else (recalls, complaints, safety, and later real specs) is
filled in on demand by the data engine (car_profile.build_profile) when a user
opens the car. Each catalog entry links to /profile?make=&model=&year=.

The list lives here as compact tuples so it is easy to read, review, and grow
toward 500 in batches. Run:  ./.venv/bin/python scripts/build_catalog.py
"""

import json
import os

# (make, model, year, generation, body, note)
# - model is kept close to NHTSA's naming so the engine can look it up.
# - year is one representative model year inside the generation (for the lookup).
# - notes are qualitative enthusiast color (engine codes/character), never specs.
CARS = [
    # --- Japanese: Toyota / Lexus / Scion ---
    ("Toyota", "Supra", 1997, "A80 (Mk4)", "Coupe", "2JZ-GTE inline-six tuner legend"),
    ("Toyota", "Supra", 1989, "A70 (Mk3)", "Coupe", "Turbo 7M-GTE grand tourer"),
    ("Toyota", "GR Supra", 2021, "A90", "Coupe", "Reborn on BMW B58 power"),
    ("Toyota", "GR86", 2022, "ZN8", "Coupe", "Rev-happy boxer, perfect balance"),
    ("Toyota", "GR Corolla", 2023, "E210", "Hatch", "Three-cylinder rally hatch"),
    ("Toyota", "MR2", 1993, "SW20", "Coupe", "Mid-engine turbo wedge"),
    ("Toyota", "MR2 Spyder", 2002, "ZZW30", "Roadster", "Lightweight mid-engine roadster"),
    ("Toyota", "Celica", 1994, "GT-Four ST205", "Coupe", "Turbo AWD rally homologation"),
    ("Toyota", "Corolla", 1985, "AE86", "Coupe", "Drift icon, 4A-GE"),
    ("Scion", "FR-S", 2013, "ZN6", "Coupe", "The original 86 in the US"),
    ("Lexus", "IS300", 2003, "XE10", "Sedan", "2JZ sedan, manual available"),
    ("Lexus", "IS F", 2010, "XE20", "Sedan", "5.0 V8 sleeper sedan"),
    ("Lexus", "LFA", 2011, "LFA", "Coupe", "Screaming 4.8 V10 halo car"),
    ("Lexus", "RC F", 2016, "XC10", "Coupe", "Naturally aspirated V8 coupe"),

    # --- Japanese: Nissan / Infiniti ---
    ("Nissan", "GT-R", 2017, "R35", "Coupe", "Twin-turbo VR38 giant-killer"),
    ("Nissan", "Skyline GT-R", 1999, "R34", "Coupe", "RB26 legend, import icon"),
    ("Nissan", "Skyline GT-R", 1993, "R32", "Coupe", "Godzilla, AWD RB26"),
    ("Nissan", "240SX", 1991, "S13", "Coupe", "Drift staple, SR swap favorite"),
    ("Nissan", "240SX", 1997, "S14", "Coupe", "Later drift-build staple"),
    ("Nissan", "300ZX", 1994, "Z32", "Coupe", "Twin-turbo VG30DETT GT"),
    ("Nissan", "350Z", 2005, "Z33", "Coupe", "VQ35 affordable RWD coupe"),
    ("Nissan", "370Z", 2015, "Z34", "Coupe", "VQ37 raw analog coupe"),
    ("Nissan", "Z", 2023, "RZ34", "Coupe", "Twin-turbo VR30 revival"),
    ("Nissan", "Sentra", 2005, "SE-R Spec V", "Sedan", "QR25 budget sport sedan"),
    ("Infiniti", "G35", 2005, "V35", "Coupe", "VQ35 RWD enthusiast bargain"),
    ("Infiniti", "G37", 2010, "V36", "Coupe", "VQ37 sharper sport coupe"),
    ("Infiniti", "Q60", 2017, "V37", "Coupe", "VR30 twin-turbo grand tourer"),

    # --- Japanese: Mazda ---
    ("Mazda", "RX-7", 1993, "FD", "Coupe", "Sequential-turbo 13B rotary"),
    ("Mazda", "RX-7", 1991, "FC", "Coupe", "Turbo rotary, 80s icon"),
    ("Mazda", "RX-8", 2005, "SE3P", "Coupe", "Renesis rotary, suicide doors"),
    ("Mazda", "MX-5 Miata", 1994, "NA", "Roadster", "The roadster that saved roadsters"),
    ("Mazda", "MX-5 Miata", 2001, "NB", "Roadster", "Refined second-gen Miata"),
    ("Mazda", "MX-5 Miata", 2008, "NC", "Roadster", "Bigger, available PRHT"),
    ("Mazda", "MX-5 Miata", 2016, "ND", "Roadster", "Back-to-basics lightweight Skyactiv roadster"),
    ("Mazdaspeed", "Mazdaspeed3", 2010, "BL", "Hatch", "Torque-steering turbo hatch"),
    ("Mazdaspeed", "Mazdaspeed6", 2006, "GG", "Sedan", "AWD turbo sport sedan"),

    # --- Japanese: Honda / Acura ---
    ("Honda", "S2000", 2004, "AP1/AP2", "Roadster", "9k-rpm F20C/F22C roadster"),
    ("Honda", "NSX", 1995, "NA1", "Coupe", "Senna-honed mid-engine VTEC"),
    ("Acura", "NSX", 2017, "NC1", "Coupe", "Twin-turbo hybrid supercar"),
    ("Honda", "Prelude", 1999, "BB6", "Coupe", "VTEC coupe with ATTS"),
    ("Honda", "CRX", 1988, "EF", "Hatch", "Featherweight VTEC tuner base"),
    ("Acura", "Integra Type R", 1998, "DC2", "Coupe", "B18C5, FWD benchmark"),
    ("Acura", "RSX Type S", 2005, "DC5", "Coupe", "K20 high-revving coupe"),
    ("Acura", "Integra", 2023, "DE4", "Hatch", "Modern Type S revival"),
    ("Honda", "Civic Type R", 2023, "FL5", "Hatch", "FWD lap-record hatch"),
    ("Honda", "Civic Si", 1994, "5th Gen EG", "Hatch", "D16Z6, first VTEC Si"),
    ("Honda", "Civic Si", 1999, "6th Gen EM1", "Coupe", "B16A2, cult EM1 coupe"),
    ("Honda", "Civic Si", 2003, "7th Gen EP3", "Hatch", "K20A3, first i-VTEC Si"),
    ("Honda", "Civic Si", 2007, "8th Gen FG2", "Coupe", "K20Z3, helical LSD"),
    ("Honda", "Civic Si", 2008, "8th Gen FA5", "Sedan", "K20Z3, four-door Si"),
    ("Honda", "Civic Si", 2014, "9th Gen FG4", "Coupe", "K24Z7 2.4L, last NA Si"),
    ("Honda", "Civic Si", 2013, "9th Gen FB6", "Sedan", "K24Z7 2.4L NA, four-door"),
    ("Honda", "Civic Si", 2018, "10th Gen FC3", "Coupe", "L15B7 turbo, last Si coupe"),
    ("Honda", "Civic Si", 2019, "10th Gen FC1", "Sedan", "L15B7 turbo return"),
    ("Honda", "Civic Si", 2022, "11th Gen FE1", "Sedan", "L15CA turbo, low-rpm torque"),

    # --- Japanese: Subaru / Mitsubishi ---
    ("Subaru", "WRX STI", 2015, "VA", "Sedan", "EJ257 rally-bred AWD turbo"),
    ("Subaru", "BRZ", 2022, "ZD8", "Coupe", "Boxer twin to the GR86"),
    ("Subaru", "Legacy", 2007, "GT spec.B", "Sedan", "Sleeper turbo wagon/sedan"),
    ("Mitsubishi", "Lancer", 2006, "Evolution IX", "Sedan", "4G63 rally homologation"),
    ("Mitsubishi", "Lancer", 2010, "Evolution X", "Sedan", "4B11T final Evo"),
    ("Mitsubishi", "3000GT", 1994, "VR-4", "Coupe", "Twin-turbo AWD tech flagship"),
    ("Mitsubishi", "Eclipse", 1997, "GSX 2G", "Coupe", "4G63 turbo AWD DSM"),

    # --- German: BMW ---
    ("BMW", "M3", 1990, "E30", "Coupe", "S14 motorsport homologation"),
    ("BMW", "M3", 1997, "E36", "Coupe", "Inline-six everyday M car"),
    ("BMW", "M3", 2003, "E46", "Coupe", "S54, the enthusiast benchmark"),
    ("BMW", "M3", 2010, "E92", "Coupe", "S65 V8 high-revving M3"),
    ("BMW", "M2", 2018, "F87", "Coupe", "Compact rear-drive enthusiast M"),
    ("BMW", "M4", 2015, "F82", "Coupe", "S55 twin-turbo coupe"),
    ("BMW", "M5", 2002, "E39", "Sedan", "S62 V8 super-sedan icon"),
    ("BMW", "M5", 2007, "E60", "Sedan", "S85 V10 F1-inspired sedan"),
    ("BMW", "1 Series M", 2011, "E82", "Coupe", "N54 cult classic 1M"),
    ("BMW", "335i", 2010, "E92", "Coupe", "N54 tuner-favorite twin-turbo"),
    ("BMW", "Z4 M", 2008, "E86", "Coupe", "S54 clownshoe coupe"),

    # --- German: Audi / Mercedes / VW / Porsche ---
    ("Audi", "RS4", 2007, "B7", "Sedan", "4.2 V8 quattro super-sedan"),
    ("Audi", "S4", 2001, "B5", "Sedan", "2.7 biturbo tuner favorite"),
    ("Audi", "TT RS", 2018, "8S", "Coupe", "Five-cylinder turbo coupe"),
    ("Audi", "R8", 2010, "Type 42", "Coupe", "V8/V10 everyday supercar"),
    ("Audi", "RS3", 2018, "8V", "Sedan", "Warbling five-cylinder sedan"),
    ("Mercedes-Benz", "C63 AMG", 2010, "W204", "Sedan", "6.2 M156 V8 super-sedan"),
    ("Mercedes-Benz", "190E", 1990, "2.5-16 Cosworth", "Sedan", "Cosworth-built DTM homologation"),
    ("Mercedes-Benz", "AMG GT", 2017, "C190", "Coupe", "Front-mid V8 GT"),
    ("Volkswagen", "Golf R", 2018, "Mk7", "Hatch", "AWD turbo everyday rocket"),
    ("Volkswagen", "Golf GTI", 2012, "Mk6", "Hatch", "The benchmark hot hatch"),
    ("Volkswagen", "Jetta", 2014, "GLI Mk6", "Sedan", "GTI in sedan form"),
    ("Volkswagen", "Corrado", 1992, "VR6", "Coupe", "VR6 cult-classic coupe"),
    ("Porsche", "911", 2007, "997 Carrera", "Coupe", "Flat-six everyday icon"),
    ("Porsche", "911", 2021, "992 Carrera", "Coupe", "Modern turbo flat-six 911"),
    ("Porsche", "911 GT3", 2018, "991.2", "Coupe", "NA 4.0 track weapon"),
    ("Porsche", "Cayman", 2014, "981", "Coupe", "Mid-engine driver's coupe"),
    ("Porsche", "Cayman GT4", 2020, "982", "Coupe", "NA flat-six mid-engine GT4"),
    ("Porsche", "Boxster", 2013, "981", "Roadster", "Mid-engine flat-six roadster"),
    ("Porsche", "944", 1988, "944 Turbo", "Coupe", "Transaxle-balanced 80s Porsche"),

    # --- American: Ford ---
    ("Ford", "Mustang", 2016, "Shelby GT350", "Coupe", "Flat-plane Voodoo V8"),
    ("Ford", "Mustang", 2020, "Shelby GT500", "Coupe", "Supercharged Predator V8"),
    ("Ford", "Mustang", 1990, "Fox-body GT", "Coupe", "5.0 pushrod drag staple"),
    ("Ford", "Mustang SVT Cobra", 2003, "Terminator", "Coupe", "Supercharged 'Terminator' legend"),
    ("Ford", "Focus RS", 2017, "Mk3", "Hatch", "AWD drift-mode hot hatch"),
    ("Ford", "Focus ST", 2015, "Mk3", "Hatch", "Torquey turbo daily hatch"),
    ("Ford", "Fiesta ST", 2016, "Mk7", "Hatch", "Tiny tossable turbo hatch"),
    ("Ford", "GT", 2006, "Mk1", "Coupe", "Supercharged modular V8 supercar"),

    # --- American: Chevrolet / GM ---
    ("Chevrolet", "Corvette", 2016, "C7 Stingray", "Coupe", "LT1 small-block sports car"),
    ("Chevrolet", "Corvette", 2008, "C6 Z06", "Coupe", "LS7 7.0 track Corvette"),
    ("Chevrolet", "Corvette", 2020, "C8 Stingray", "Coupe", "First mid-engine Corvette"),
    ("Chevrolet", "Corvette", 2002, "C5 Z06", "Coupe", "LS6 affordable performance icon"),
    ("Chevrolet", "Camaro", 2018, "ZL1", "Coupe", "Supercharged LT4 track muscle"),
    ("Chevrolet", "Cobalt SS", 2008, "Supercharged/Turbo", "Coupe", "Surprise GM sport compact"),
    ("Cadillac", "CTS-V", 2009, "Gen 2", "Sedan", "Supercharged LSA super-sedan"),
    ("Cadillac", "ATS-V", 2016, "Gen 1", "Coupe", "Twin-turbo V6 M4 rival"),
    ("Pontiac", "GTO", 2006, "Holden-based", "Coupe", "LS2 sleeper muscle coupe"),
    ("Pontiac", "Firebird", 2002, "Trans Am WS6", "Coupe", "LS1 fourth-gen F-body"),
    ("Pontiac", "Solstice", 2007, "GXP", "Roadster", "Turbo Ecotec roadster"),

    # --- American: Mopar ---
    ("Dodge", "Challenger", 2016, "Hellcat", "Coupe", "Supercharged 6.2 Hellcat V8"),
    ("Dodge", "Challenger", 2015, "R/T Scat Pack", "Coupe", "392 naturally aspirated Hemi"),
    ("Dodge", "Viper", 2003, "ZB Gen 3", "Coupe", "8.3 V10 raw American exotic"),
    ("Dodge", "Viper", 2017, "Gen 5 ACR", "Coupe", "8.4 V10 track-record ACR"),
    ("Dodge", "Neon", 2004, "SRT-4", "Sedan", "Turbo budget sport compact"),
    ("Chrysler", "300", 2008, "300C SRT8", "Sedan", "6.1 Hemi full-size muscle"),

    # --- Hot hatch / sport compact (other) ---
    ("Mini", "Cooper", 2015, "S F56", "Hatch", "Turbo go-kart hatch"),
    ("Mini", "Cooper", 2018, "JCW F56", "Hatch", "Hottest factory Mini"),
    ("Hyundai", "Veloster N", 2019, "JS", "Hatch", "Corner-carving Korean hot hatch"),
    ("Hyundai", "Elantra N", 2022, "CN7", "Sedan", "Track-ready sport sedan"),
    ("Hyundai", "Genesis Coupe", 2013, "BK", "Coupe", "Affordable turbo/V6 RWD coupe"),
    ("Kia", "Stinger", 2018, "GT CK", "Sedan", "Twin-turbo V6 fastback GT"),
    ("Genesis", "G70", 2019, "IK", "Sedan", "3.3T sport sedan sleeper"),

    # --- Lightweight / exotic enthusiast favorites ---
    ("Lotus", "Elise", 2005, "S2", "Roadster", "Featherweight mid-engine purity"),
    ("Lotus", "Exige", 2006, "S2", "Coupe", "Hardtop track-focused Elise"),
    ("Lotus", "Evora", 2017, "400/410", "Coupe", "Supercharged 2+2 mid-engine"),
    ("Alfa Romeo", "4C", 2015, "960", "Coupe", "Carbon-tub turbo featherweight"),
    ("Alfa Romeo", "Giulia", 2017, "Quadrifoglio", "Sedan", "Ferrari-derived twin-turbo V6"),
    ("Jaguar", "F-Type", 2016, "R", "Coupe", "Supercharged V8 British GT"),
    ("Nissan", "Pulsar", 1991, "GTI-R", "Hatch", "Homologation AWD turbo pocket rocket"),

    # --- Classics / vintage enthusiast icons ---
    ("Datsun", "240Z", 1972, "S30", "Coupe", "L24 long-hood Z origin"),
    ("BMW", "2002", 1972, "tii", "Coupe", "The car that made BMW"),
    ("Chevrolet", "Chevelle", 1970, "SS 454", "Coupe", "Big-block muscle pinnacle"),
    ("Plymouth", "Barracuda", 1970, "'Cuda", "Coupe", "Hemi E-body muscle icon"),
    ("Ford", "Mustang", 1969, "Boss 302", "Coupe", "Trans-Am homologation classic"),
    ("Volkswagen", "Beetle", 1968, "Type 1", "Coupe", "Air-cooled tuning canvas"),

    # --- Mainstream mix — Honda (Task 9: curated enthusiast+mainstream, brand by brand) ---
    ("Honda", "CR-V", 2019, "5th Gen (RW)", "SUV", "America's default compact SUV — sensible, spacious, Honda-tough"),
    ("Honda", "Civic", 2008, "8th Gen (FA/FG)", "Sedan", "Bulletproof R18 commuter, 200k-mile reputation"),
    ("Honda", "Civic", 2013, "9th Gen (FB)", "Sedan", "Efficient, no-drama daily compact"),
    ("Honda", "Civic", 2018, "10th Gen (FC)", "Sedan", "Turbo-era Civic — sharp, frugal, roomy"),
    ("Honda", "Civic", 2022, "11th Gen (FE)", "Sedan", "Grown-up, refined, still cheap to run"),
    ("Honda", "Accord", 2010, "8th Gen (CP/CS)", "Sedan", "Roomy K24/V6 family sedan"),
    ("Honda", "Accord", 2015, "9th Gen (CR)", "Sedan", "Earth Dreams efficiency; last of the V6"),
    ("Honda", "Accord", 2019, "10th Gen (CV)", "Sedan", "Turbo-four sport-sedan sharpness"),
    ("Honda", "Accord", 2023, "11th Gen (CY)", "Sedan", "Hybrid-led, refined commuter"),
]


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(here, "data", "catalog.json")
    catalog = [
        {"make": mk, "model": md, "year": yr, "generation": gen, "body": body, "note": note}
        for (mk, md, yr, gen, body, note) in CARS
    ]
    with open(out, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(catalog)} cars to {out}")


if __name__ == "__main__":
    main()
