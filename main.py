print("Welcome to Garage AI")

cars = {
    "Honda Civic Si": {
        "engine": "1.5L turbo I4",
        "horsepower": 200,
        "torque": "192 lb-ft",
        "drivetrain": "FWD",
        "transmission": "6-speed manual",
        "0_to_60": "6.7 sec",
        "fuel_economy": "27 city / 37 hwy mpg",
        "curb_weight": "3,012 lbs",
        "reliability": "8/10 — bulletproof Honda drivetrain; watch 10th-gen oil dilution",
        "popular_mods": [
            "Hondata FlashPro ECU tune (+50-70 whp — the single biggest gain)",
            "Cold air intake + upgraded front-mount intercooler",
            "Catback exhaust + downpipe",
            "Lowering springs or coilovers + rear sway bar",
            "Summer performance tires — the chassis can use more grip than stock",
        ],
        "oil_type": "0W-20 full synthetic",
        "oil_interval": "Every 5,000-7,500 miles",
        "generations": {
            "5th Gen EG (1992–1995)": "125hp D16Z6 VTEC — first Civic Si with VTEC, double-wishbone suspension all around.",
            "6th Gen EK (1996–2000)": "160hp B16A2 — cult classic coupe (EM1). Last gen with front double-wishbone. Highly sought after.",
            "7th Gen EP/EM (2002–2005)": "160hp K20A3 — EP3 hatchback in Europe, EM2 coupe in North America. Dropped double-wishbone up front.",
            "8th Gen FG (2006–2011)": "197hp K20Z3 — high-revving VTEC, 6-speed manual, limited-slip diff. First Si sedan debuted in 2007.",
            "9th Gen FB (2012–2015)": "201hp K24Z7 — largest engine in Si history, 2.4L naturally aspirated, limited-slip diff, 31mpg highway.",
            "10th Gen FC/FK (2017–2021)": "205hp 1.5L turbo (L15B7) — returned to turbo power, broader torque band, known for oil dilution in cold climates.",
            "11th Gen FE1 (2022–present)": "200hp 1.5L turbo — slight power drop but torque peaks earlier (below 2,000 rpm). Better daily driveability.",
        },
        "common_issues": [
            "Oil dilution (fuel mixing into oil in cold climates) — affects 10th gen most",
            "AC compressor failure",
            "Infotainment freezing",
        ],
        "maintenance_tips": [
            "Check oil level frequently on 10th gen due to known dilution issue",
            "Use Honda-approved 0W-20 synthetic",
            "Inspect brake pads — sport driving wears them faster",
        ],
    },
    "Subaru WRX": {
        "engine": "2.4L turbo H4 (FA24F)",
        "horsepower": 271,
        "torque": "258 lb-ft",
        "drivetrain": "AWD",
        "transmission": "6-speed manual / CVT",
        "0_to_60": "5.5 sec",
        "fuel_economy": "19 city / 26 hwy mpg",
        "curb_weight": "3,320 lbs",
        "reliability": "7/10 — rugged boxer/AWD; CVT and older EJ head gaskets are weak points",
        "popular_mods": [
            "Cobb Accessport ECU tune (E85 flex-fuel popular)",
            "Catless/high-flow downpipe, intake, top-mount intercooler",
            "Catback exhaust",
            "Coilovers or lowering springs + front/rear sway bars",
            "Note: FA24 is knock-sensitive — use a conservative, well-proven tune",
        ],
        "oil_type": "5W-30 full synthetic",
        "oil_interval": "Every 6,000 miles",
        "generations": {
            "1st Gen GC/GF (1992–2000)": "JDM only initially. 237hp EJ20T boxer turbo. Became a rally legend with Prodrive WRC campaigns.",
            "2nd Gen GD/GG (2002–2007)": "First gen sold in the US. 227hp EJ205. Three face styles: bugeye (2002–03), blobeye (2004–05), hawkeye (2006–07).",
            "3rd Gen GE/GH (2008–2014)": "265hp EJ255. Wider body option. Last generation to use the iconic EJ engine family.",
            "4th Gen VA (2015–2021)": "268hp FA20F — switched to direct-injection FA-series engine. First WRX as its own standalone model (not Impreza WRX).",
            "5th Gen VB (2022–present)": "271hp FA24F — grew to 2.4L. CVT added alongside manual. Dropped hatchback body, polarizing choice among fans.",
        },
        "common_issues": [
            "Head gasket failure (older EJ engines — less common on FA24)",
            "CVT reliability concerns at high mileage",
            "Turbo heatsoaking on track use",
        ],
        "maintenance_tips": [
            "Change oil every 6k miles — turbos punish extended intervals",
            "Let engine warm up before pushing hard",
            "Inspect intercooler hoses for cracks at 60k+",
        ],
    },
    "Audi S3": {
        "engine": "2.0L turbo I4 (EA888)",
        "horsepower": 306,
        "torque": "295 lb-ft",
        "drivetrain": "AWD (Quattro)",
        "transmission": "7-speed dual-clutch (S tronic)",
        "0_to_60": "4.4 sec",
        "fuel_economy": "23 city / 32 hwy mpg",
        "curb_weight": "3,527 lbs",
        "reliability": "6/10 — fast and refined, but carbon buildup and German upkeep costs add up",
        "popular_mods": [
            "APR or Unitronic Stage 1-2 ECU tune (330-370+ hp)",
            "Intake, upgraded intercooler, downpipe",
            "DSG/TCU transmission tune for faster, firmer shifts",
            "IS38 turbo upgrade for big-power builds",
            "Coilovers + sway bars",
        ],
        "oil_type": "5W-40 full synthetic (VW 502.00 spec)",
        "oil_interval": "Every 10,000 miles (Audi LongLife) — recommend 5,000 for longevity",
        "generations": {
            "1st Gen 8L (1999–2003)": "210–225hp 1.8T inline-4. Facelift in 2002. The S3 that started it all — compact, Quattro AWD, surprisingly quick.",
            "2nd Gen 8P (2006–2012)": "261hp 2.0T FSI. Available in 3-door and 5-door. 0–62 in 5.7 sec. Electronically limited to 155mph.",
            "3rd Gen 8V (2013–2020)": "300hp at launch, bumped to 310hp in 2016 facelift. Sharper styling. Available as sedan (2014+) and convertible.",
            "4th Gen 8Y (2020–present)": "306hp 2.0T. Aggressive new look with widened fenders ('Quattro Blisters'). Shift-by-wire shifter replaces traditional gear selector.",
        },
        "common_issues": [
            "Carbon buildup on intake valves (direct injection) — all generations",
            "DSG shudder at low speeds when cold",
            "Water pump and thermostat failure (60-90k miles)",
        ],
        "maintenance_tips": [
            "Walnut blast intake valves every 40-60k miles",
            "Use only VW 502.00 approved oil — non-spec oil voids warranty",
            "Replace water pump and thermostat proactively at 80k",
        ],
    },
    "Ford Mustang GT": {
        "engine": "5.0L V8 (Coyote)",
        "horsepower": 460,
        "torque": "420 lb-ft",
        "drivetrain": "RWD",
        "transmission": "6-speed manual / 10-speed auto",
        "0_to_60": "4.3 sec",
        "fuel_economy": "15 city / 24 hwy mpg",
        "curb_weight": "3,705 lbs",
        "reliability": "7/10 — robust Coyote V8; hard launches and track use stress the drivetrain",
        "popular_mods": [
            "Supercharger (Roush/Whipple/Procharger) — the big power move, 700+ hp",
            "Cold air intake + ECU tune",
            "Long-tube headers + catback exhaust",
            "Lowering springs/coilovers + subframe bushings",
            "Sticky tires to tame wheel hop on launches",
        ],
        "oil_type": "5W-50 full synthetic",
        "oil_interval": "Every 7,500 miles (normal) / 5,000 miles (track use)",
        "generations": {
            "4th Gen SN95 (1994–2004)": "215hp 5.0L pushrod V8 at launch, swapped to 4.6L modular OHC V8 in 1996 (260hp). 'New Edge' facelift in 1999.",
            "5th Gen S197 (2005–2014)": "300hp 4.6L V8 (2005–2010). Major upgrade in 2011 with 5.0L Coyote DOHC producing 412hp. First Mustang on its own platform.",
            "6th Gen S550 (2015–2023)": "435hp at launch, bumped to 460hp in 2018. First Mustang with independent rear suspension. Available worldwide for the first time.",
            "7th Gen S650 (2024–present)": "480–486hp Coyote V8 (with active exhaust). New dual-throttle intake. Most powerful stock GT ever built.",
        },
        "common_issues": [
            "IRS half-shaft failure under hard launches (S550+)",
            "Transmission fluid overheating on track (10-speed auto)",
            "Wheel hop with manual on stock tires",
        ],
        "maintenance_tips": [
            "Upgrade diff and transmission fluid to racing spec if tracking",
            "Check rear axle half-shafts if launching hard regularly",
            "Coolant overflow tank cracks over time — inspect at 50k+",
        ],
    },
    "Toyota GR86": {
        "engine": "2.4L flat-4 (FA24)",
        "horsepower": 228,
        "torque": "184 lb-ft",
        "drivetrain": "RWD",
        "transmission": "6-speed manual / 6-speed auto",
        "0_to_60": "6.1 sec",
        "fuel_economy": "20 city / 27 hwy mpg (manual)",
        "curb_weight": "2,811 lbs",
        "reliability": "8/10 — simple, light, naturally aspirated; few chronic issues",
        "popular_mods": [
            "Forced induction (HKS turbo / supercharger kits, 300+ hp) — main power path",
            "Cold air intake, catback exhaust, Tomei header",
            "ECU tune (modest NA gains — power isn't this car's strength)",
            "Coilovers, sway bars, chassis bracing, sticky tires — transforms the car",
            "Big brake kit for track use",
        ],
        "oil_type": "0W-20 full synthetic",
        "oil_interval": "Every 6,000 miles",
        "generations": {
            "1st Gen ZN6 — Scion FR-S (2012–2016)": "200hp 2.0L FA20 flat-4. Co-developed with Subaru (sold as BRZ). Scion branding in the US until the brand was killed in 2016.",
            "1st Gen ZN6 — Toyota 86 (2017–2020)": "205hp after revised gear ratios and minor tune update. Rebranded Toyota 86 after Scion was discontinued.",
            "2nd Gen ZN8 — Toyota GR86 (2022–present)": "228hp 2.4L FA24 — 18% more power, 11% more torque. Subaru Global Platform adds 50% more torsional rigidity. Nearly a full second quicker to 60.",
        },
        "common_issues": [
            "Low torque at low RPM — power lives above 4,500 rpm (1st gen especially)",
            "Clutch wear if slipping on spirited launches",
            "Infotainment lag (minor)",
        ],
        "maintenance_tips": [
            "Let revs climb before shifting — engine rewards high RPM",
            "Brake fluid degrades quickly on track — flush every season",
            "Tires wear fast under spirited driving — check pressure often",
        ],
    },
    "Infiniti Q50 3.7": {
        "engine": "3.7L V6 (VQ37VHR)",
        "horsepower": 328,
        "torque": "269 lb-ft",
        "drivetrain": "RWD / AWD",
        "transmission": "7-speed automatic",
        "0_to_60": "5.3 sec (RWD)",
        "fuel_economy": "20 city / 29 hwy mpg (RWD)",
        "curb_weight": "3,574 lbs",
        "reliability": "7/10 — durable VQ V6; watch oil consumption and warping brake rotors",
        "popular_mods": [
            "Uprev or Ecutek ECU tune",
            "Cold air intake, headers, catback exhaust (modest NA gains)",
            "Plenum spacer / underdrive pulley",
            "Coilovers + sway bars",
            "Note: naturally aspirated — gains are modest vs the turbo VR30 cars",
        ],
        "oil_type": "5W-30 full synthetic (Nissan Ester oil recommended)",
        "oil_interval": "Every 5,000-6,000 miles",
        "generations": {
            "2014 (Launch)": "Debuted at 2013 NAIAS. Replaced the G37. Introduced Direct Adaptive Steering (steer-by-wire). 3.7L VQ37VHR and Hybrid (354hp) available.",
            "2015": "Final year of the 3.7L engine. Minor refinements. Last chance to get the naturally aspirated V6 in the Q50.",
        },
        "common_issues": [
            "Valve train noise — often quieted with Nissan ester oil",
            "Rear timing cover gasket leak (oil pressure stresses paper gasket)",
            "Oil consumption from worn valve seals or piston rings at high mileage",
        ],
        "maintenance_tips": [
            "Use Nissan genuine ester oil to reduce valve train noise",
            "Inspect rear timing cover for oil seepage at 60k+ miles",
            "Check oil level every fill-up — engine can consume oil silently",
        ],
    },
    "Infiniti Q50 3.0t": {
        "engine": "3.0L twin-turbo V6 (VR30DDTT)",
        "horsepower": 300,
        "torque": "295 lb-ft",
        "drivetrain": "RWD / AWD",
        "transmission": "7-speed automatic",
        "0_to_60": "5.1 sec",
        "fuel_economy": "20 city / 29 hwy mpg (RWD)",
        "curb_weight": "3,820 lbs",
        "reliability": "6/10 — strong engine, but turbo complexity and wastegate rattle at mileage",
        "popular_mods": [
            "Ecutek tune or JB4 piggyback (+40-100 whp → 350-400 whp)",
            "Catless downpipes, cold air intakes, upgraded intercoolers (FBO ~440-475 whp)",
            "E85 flex fuel + upgraded HPFP/LPFP (500+ whp on stock turbos)",
            "Coilovers + sway bars",
            "Huge tuning headroom — one of the best bang-for-buck platforms out there",
        ],
        "oil_type": "5W-30 or 5W-40 full synthetic",
        "oil_interval": "Every 5,000 miles (recommended — do not stretch intervals on a turbo)",
        "generations": {
            "2016–2017 (VR30 Introduction)": "3.7L replaced by 3.0L twin-turbo VR30DDTT. 300hp and 400hp (Red Sport) variants introduced. 2nd-gen Direct Adaptive Steering.",
            "2018–2023 (Refresh)": "Visual refresh unveiled at 2017 Geneva Motor Show. Improved interior quality, clearer trim levels, added driver-assistance tech. Base 2.0T four-cylinder added.",
            "2024 (Final Year)": "Infiniti announced discontinuation in August 2024. Last model year for US and Canada after 11 years. Slow sales ended the run.",
        },
        "common_issues": [
            "Wastegate rattle — pivot point wears inside turbo housing",
            "Valve body issues and rear differential bushing wear at high mileage",
            "Oil consumption if intervals are extended",
        ],
        "maintenance_tips": [
            "Do not extend oil changes past 5,000 miles — turbos are oil-dependent",
            "Change transmission fluid every 30-40k miles (Infiniti says lifetime — ignore that)",
            "Monitor coolant level — turbocharged engines are harder on cooling systems",
        ],
    },
    "Infiniti Q50 Red Sport 400": {
        "engine": "3.0L twin-turbo V6 (VR30DDTT — high output)",
        "horsepower": 400,
        "torque": "350 lb-ft",
        "drivetrain": "RWD / AWD",
        "transmission": "7-speed automatic",
        "0_to_60": "4.5 sec",
        "fuel_economy": "20 city / 26 hwy mpg (RWD)",
        "curb_weight": "3,890 lbs",
        "reliability": "6/10 — same VR30 under more stress; DAS steering quirks knock points off",
        "popular_mods": [
            "Ecutek/JB4 tune (430+ whp with tune alone on the high-output VR30)",
            "Full bolt-ons (downpipes/intakes/intercoolers) ~475 whp",
            "E85 + fuel system upgrades = 500-525 whp on stock turbos",
            "Coilovers, sway bars, big brake kit",
            "Best starting point in the Q50 range for a serious power build",
        ],
        "oil_type": "5W-30 or 5W-40 full synthetic",
        "oil_interval": "Every 5,000 miles",
        "generations": {
            "2016–2017 (Launch)": "Introduced alongside the 3.0t. 400hp from same VR30DDTT block with higher boost. Standard steer-by-wire DAS — controversial among enthusiasts.",
            "2018–2023 (Refresh)": "Same refresh as the 3.0t. More aggressive Red Sport-specific styling cues and Brembo brakes. Interior quality improved significantly.",
            "2024 (Final Year)": "Last production year. Discontinued alongside full Q50 lineup. Used copies remain one of the best performance sedan values on the used market.",
        },
        "common_issues": [
            "Steer-by-wire (DAS) feels numb — no road feedback at low speeds",
            "Wastegate rattle (same as 3.0t — turbo housing wear)",
            "Firm suspension transmits road harshness into the cabin",
        ],
        "maintenance_tips": [
            "Same engine as 3.0t — follow same strict 5k oil change interval",
            "DAS system can be replaced with a conventional rack if preferred",
            "Inspect turbo boost hoses for cracks — high output puts more stress on them",
        ],
    },
}

choice = input("What car are you researching? ")
car = cars.get(choice)

if car is None:
    print("I don't have data on that car yet.")
else:
    print(f"\n{'=' * 40}")
    print(f"  {choice}")
    print(f"{'=' * 40}")
    print(f"  Engine:       {car['engine']}")
    print(f"  Horsepower:   {car['horsepower']} hp")
    print(f"  Torque:       {car['torque']}")
    print(f"  Drivetrain:   {car['drivetrain']}")
    print(f"  Transmission: {car['transmission']}")
    print(f"  0-60 mph:     {car['0_to_60']}")
    print(f"  Fuel Economy: {car['fuel_economy']}")
    print(f"  Curb Weight:  {car['curb_weight']}")
    print(f"  Reliability:  {car['reliability']}")
    print(f"\n  Oil Type:     {car['oil_type']}")
    print(f"  Oil Interval: {car['oil_interval']}")
    print(f"\n  Generation History:")
    for gen, notes in car["generations"].items():
        print(f"    {gen}")
        print(f"      {notes}")
    print(f"\n  Common Issues:")
    for issue in car["common_issues"]:
        print(f"    - {issue}")
    print(f"\n  Maintenance Tips:")
    for tip in car["maintenance_tips"]:
        print(f"    - {tip}")
    print(f"\n  Popular Mods:")
    for mod in car["popular_mods"]:
        print(f"    - {mod}")
