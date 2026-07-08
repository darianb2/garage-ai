#!/usr/bin/env python3
"""Source hero photos for catalog cars from Wikimedia Commons.

Commons is the one *free* source with the breadth to cover specific
make/model/generation cars, and using its official API with attribution is
licensing — not scraping (see frontend/src/lib/images.js). For each car we
search Commons, score the candidates (free license, wide framing, front/quarter
shot, right body style, name match), download the best via a 1600px thumbnail,
convert to WebP, and record attribution.

Targets, by default, the "profiled" catalog rows (make/model has a curated
data/cars/*.json profile) that don't yet have an image. Slugs already on disk
are skipped, so re-running continues where it left off. Auto-builds each car's
search query/tokens/avoid from the catalog row; OVERRIDES hand-tunes any that
the review pass shows are wrong.

Outputs:
  frontend/public/images/<slug>.webp   the optimized hero photo
  frontend/public/images/CREDITS.md    attribution table (CC-BY-SA needs credit)
  scripts/image_manifest.json          per-car pick + rejected alternates (review)

Run:  .venv/bin/python scripts/fetch_images.py            # all profiled rows
      .venv/bin/python scripts/fetch_images.py 12         # cap this run to 12
Pillow is a dev-only dependency (not in requirements.txt); Render just serves the
committed .webp files. Wire new slugs into frontend/src/lib/images.js after review.
"""
import glob
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "frontend", "public", "images")
CATALOG = os.path.join(ROOT, "data", "catalog.json")
CARS_DIR = os.path.join(ROOT, "data", "cars")
MANIFEST = os.path.join(ROOT, "scripts", "image_manifest.json")
# Consumed by the frontend Credits page so attribution is visible to users
# (CC-BY/CC-BY-SA require it). Regenerated on every run from the manifest.
FRONTEND_CREDITS = os.path.join(ROOT, "frontend", "src", "data", "credits.json")

API = "https://commons.wikimedia.org/w/api.php"
# Commons *requires* a descriptive User-Agent or it blocks the request.
UA = "garage-ai/1.0 (https://garage-ai-34hw.onrender.com; darianb2.db@gmail.com) image sourcing"

MAX_W = 1600          # cap hero width; heroes render ~16:9, CSS object-contain fits
WEBP_QUALITY = 82

# Free licenses we accept. CC0 / public-domain need no attribution; CC-BY(-SA)
# do — we credit everything in CREDITS.md regardless, which satisfies all of them.
FREE_LICENSE = re.compile(r"^(cc0|cc[ -]?by([ -]sa)?([ -][0-9.]+)?|public domain|pd|pdm)", re.I)
# Hard blocks checked FIRST: FREE_LICENSE is a prefix match, so "CC BY-NC 2.0"
# would otherwise pass on its "cc by" prefix. NC/ND aren't allowed on Commons,
# but mis-tagged files exist; GFDL-only is free but requires shipping the full
# license text, which a hero-photo credit line can't satisfy.
BLOCKED_LICENSE = re.compile(r"\bnc\b|non[ -]?commercial|\bnd\b|no[ -]?deriv|gfdl", re.I)


def license_ok(license_name):
    lic = (license_name or "").replace("-", " ").strip()
    return not BLOCKED_LICENSE.search(lic) and bool(FREE_LICENSE.match(lic))

# Words that mark a good vs. bad hero framing, scored against the file title.
GOOD = ("front", "quarter", "3/4", "34", "profile", "side", "exterior")
# Globally-bad-for-a-hero terms (angle, condition, or a doctored/atypical example).
# Body-style mismatches are handled per-car via `avoid`.
# NB: no "rally" — it substring-matches Honda's "Rallye Red" paint. "drift"/
# "race" are kept (rarely appear as paint names).
BAD = ("rear", "back", "interior", "dash", "engine", "wheel", "badge", "logo",
       "detail", "seat", "trunk", "boot", "gauge", "close", "tuned", "modified",
       "widebody", "wide body", "stance", "drift", "race", "night",
       "wreck", "crash", "police", "taxi", "replica")

# Hand-tuned query/tokens/avoid for cars the review pass showed the auto-builder
# gets wrong. Keyed by slug; merged over the auto-generated target.
OVERRIDES = {
    "toyota-supra-a80-mk4": {"query": "Toyota Supra A80 front", "avoid": ["tuned", "night", "sz-r"]},
    "bmw-m3-e46": {"query": "BMW M3 E46 coupe", "avoid": ["touring", "estate", "wagon", "cabrio", "convertible"]},
    "nissan-gt-r-r35": {"query": "Nissan GT-R R35 front", "avoid": ["nismo", "carbon", "facelift"]},
    # Hard cases where name alone is ambiguous across market/variant/sibling model.
    "toyota-gr-corolla-e210": {"query": "Toyota GR Corolla 2023", "avoid": ["altis", "gr-s", "cross", "sedan"]},
    "toyota-corolla-12th-gen-e210": {"query": "2021 Toyota Corolla hatchback front", "avoid": ["cross", "altis", "gr-s", "convertible"]},
    "honda-civic-si-10th-gen-fc3": {"query": "2018 Honda Civic Si Coupe", "avoid": ["ef9", "eg", "ek", "ef8", "sir", "del sol"]},
    "volkswagen-golf-gti-mk6": {"pin": "Volkswagen Golf VI GTI front.JPG"},
    "honda-civic-type-r-fk8": {"query": "Honda Civic Type R FK8 Rallye Red", "avoid": ["wrap", "gold", "matte", "tuned", "modified"]},
    # Hand-vetted `pin`s replacing the first-pass "soft spots" (rear/livery/wrong
    # body). Each pin is a specific Commons file chosen from the probe results.
    "bmw-m3-e36": {"pin": "BMW M3 Coupé (E36, 1998) (52453439602).jpg"},
    "honda-civic-si-9th-gen-fb6": {"pin": "2013 Honda Civic Si sedan.jpg"},
    "honda-insight-3rd-gen-ze4": {"pin": "2019 Honda Insight Hybrid Touring front NYIAS 2019.jpg"},
    "honda-hr-v-1st-gen-ru": {"pin": "2017 Honda HR-V EX Automatic 1.5 Front.jpg"},
    "honda-pilot-3rd-gen": {"pin": "2016 Honda Pilot LX, front 12.10.24.jpg"},
    "subaru-wrx-gd-blobeye": {"pin": "Subaru IMPREZA WRX STI (GH-GDB) front.JPG"},
    "honda-civic-si-6th-gen-em1": {"pin": "99-00 Civic Si.jpg"},
    "honda-odyssey-5th-gen-rl6": {"query": "2019 Honda Odyssey USA", "avoid": ["rc1", "absolute", "jdm", "aero"]},
    "honda-cr-v-5th-gen-rw": {"query": "2019 Honda CR-V", "avoid": ["6th", "sixth", "2023", "2024", "2025"]},
    "toyota-yaris-mazda2-based": {"query": "Toyota Yaris 2019 sedan", "avoid": ["hatchback", "gr "]},
    # A-brands review pass (2026-07): 13 of 43 first picks failed the visual
    # check (rear views, race/concept cars, heavily modified show cars, one
    # photo of a building). Pins hand-chosen from Commons probe results.
    # Commons has no acceptable free front-3/4 of a USDM 3rd-gen (DC2) Integra
    # GS-R (only rears, a 2nd-gen, and Type R trims) — reviewed 2026-07. Skip:
    # the styled CarImage placeholder beats a wrong-generation photo.
    "acura-integra-gs-r-dc2": {"skip": True},
    "acura-integra-type-r-dc2": {"pin": "2001 Acura Integra Type-R in Phoenix Yellow, Front Right (St. Ignace 2023).jpg"},
    "acura-nsx-nc1": {"pin": "2017 Honda NSX 3.5 Front.jpg"},
    "acura-rdx-turbo-tb1": {"pin": "2007 Acura RDX 2.4 Turbo SH AWD (51413127857).jpg"},
    "acura-rsx-type-s-dc5": {"pin": "My 2006 RSX Type-S.jpg"},
    "audi-quattro-ur-quattro": {"pin": "Audi Ur-Quattro (9532193009).jpg"},
    "audi-r8-type-42": {"pin": "2009 Audi R8 Quattro V8.jpg"},
    "audi-rs-e-tron-gt-j1": {"pin": "2022 Audi e-tron GT RS.jpg"},
    "audi-rs5-b9": {"pin": "2019 Audi RS5 Coupe TFSi Quattro Automatic 2.9.jpg"},
    "audi-rs7-c7": {"pin": "Audi RS7 Sportback - przód (MSP16).jpg"},
    "audi-s3-8y": {"pin": "2023 Audi S3 TFSi Quattro.jpg"},
    "audi-s4-b5": {"pin": "Audi S4 (Type B5) silver fl.jpg"},
    "audi-s6-c7": {"pin": "Audi S6 (C7) Washington DC Metro Area, USA (1).jpg"},
    # B-brands review pass (2026-07): 22 of 36 first picks failed the visual
    # check — mostly rear shots hiding behind generic filenames (850i, i8, M1,
    # M3 G80, M8...), plus modified/wrapped show cars (M2s, M4 F82, 325is) and
    # one wrong car outright (an X5 45e M Sport standing in for the X5 M).
    "bentley-continental-gt-w12": {"pin": "2005 green Bentley Continental GT front.JPG"},
    "bmw-135i-e82": {"pin": "BMW 135i (3).jpg"},
    # Commons has no clean stock USDM 325is front shot (only rears, race cars,
    # heavy mods) — this JDM 325i M Technic is the same E30 two-door with a
    # factory kit, the closest honest match. Reviewed 2026-07.
    "bmw-325is-e30": {"pin": "BMW E-A25 325i M Technic Version (No.16) (23051409250).jpg"},
    "bmw-335i-e92": {"pin": "BMW335i 1.JPG"},
    "bmw-540i-e39": {"pin": "BMW E39 jaslo.JPG"},
    "bmw-850i-e31": {"pin": "BMW 850i (E31, 1991) (52451311033).jpg"},
    "bmw-i4-m50-g26": {"pin": "BMW i4 M50 1X7A7379.jpg"},
    "bmw-i8-i12": {"pin": "BMW i8 Front (left) New.jpg"},
    "bmw-m1-e26": {"pin": "BMW M1, front right (Brooklyn).jpg"},
    "bmw-m2-f87": {"pin": "2017 BMW M2 front.jpg"},
    "bmw-m2-g87": {"pin": "BMW G87 M2 Motorworld Munich 1X7A0071.jpg"},
    # Category/phrase queries miss most M235i files (not categorized under
    # BMW F22) — a plain full-text "M235i" search finds plenty. Reviewed 2026-07.
    "bmw-m235i-f22": {"pin": "2014-2018 BMW M235i (F22) coupe (2018-07-30) 01.jpg"},
    "bmw-m240i-g42": {"pin": "BMW 2-Series Coupé (G42) M240i xDrive (2022) (52226831652).jpg"},
    "bmw-m3-f80": {"pin": "2018 BMW M3 Front.jpg"},
    "bmw-m3-g80": {"pin": "2021 BMW M3 Competition Automatic 3.0 Front.jpg"},
    "bmw-m4-f82": {"pin": "BMW M4 Coupé (F82) front.JPG"},
    "bmw-m5-e34": {"pin": "BMW M5 E34 front.jpg"},
    "bmw-m8-competition-f92": {"pin": "BMW M8 Competition Coupé (G15, 2022) (53798736676).jpg"},
    "bmw-x5-m-f95": {"pin": "BMW X5M (F95) Washington DC Metro Area, USA (1).jpg"},
    "bmw-z3-m-coupe-e36-8": {"pin": "2000mqp.jpg"},
    "bmw-z4-m40i-g29": {"pin": "2019 BMW Z4 M40i Front.jpg"},
    "bmw-z4-m-e86": {"pin": "2007 BMW Z4 M Coupé in Monaco Blue Metallic, front left.jpg"},
    "buick-gsx-stage-1": {"pin": "1970 Buick GSX 455 Coupe (33285990451).jpg"},
    # C-brands review pass (2026-07): 15 of 43 first picks failed the visual
    # check — a hood-open ATS-V, a bare Caterham chassis (kit frame), an
    # infotainment-screen shot for the Camaro Z/28, race cars (C7.R, the
    # Chevrolet SS slot returned Camaro Cup cars), a wheel close-up (C8 Z06),
    # rear/head-on framings (300C SRT8, C6), and a Chevelle coupe standing in
    # for the El Camino. The 5th-gen Camaro Z/28 was invisible to full-text
    # search; Category:"Chevrolet Camaro Z28 (5th generation)" surfaced it.
    "cadillac-ats-v-gen-1": {"pin": "Cadillac ATS-V (24508373830).jpg"},
    "caterham-seven-620r": {"pin": "2020 Caterham Seven 620R.jpg"},
    "chevrolet-camaro-ss-396-2nd-gen": {"pin": "1971 Camaro SS (10).jpg"},
    "chevrolet-camaro-z-28-5th-gen": {"pin": "Chevrolet Camaro Z28 Hirschaid 2022-20220709-RM-120103 (cropped).jpg"},
    "chevrolet-camaro-ss-6th-gen": {"pin": "2016 Chevrolet Camaro 2SS.jpg"},
    "chevrolet-corvette-c1": {"pin": "1962 Chevrolet C1 Corvette Roadster (21327773141).jpg"},
    "chevrolet-corvette-c4-zr-1": {"pin": "1990 Chevrolet Corvette ZR1.jpg"},
    "chevrolet-corvette-c6-z06": {"pin": "'07 Chevrolet Corvette Z06.jpg"},
    "chevrolet-corvette-c7-stingray": {"pin": "2016 Chevrolet Corvette Stingray coupe, front left, 06-06-2026.jpg"},
    "chevrolet-corvette-c8-z06": {"pin": "Chevrolet Corvette Z06 (C8, 2023) (53797860737).jpg"},
    "chevrolet-el-camino-ss-454": {"pin": "2022 Downtown West Allis Classic Car Show 030 (1970 Chevrolet El Camino SS).jpg"},
    "chevrolet-nova-ss-396": {"pin": "1969 Chevrolet Nova SS 396 in Burnished Brown Poly, Front Right, 06-11-2022.jpg"},
    "chevrolet-ss-holden-based": {"pin": "2014 Chevrolet SS front.png"},
    "chevrolet-colorado-zr2-3rd-gen": {"pin": "2024 Chevrolet Colorado ZR2, front right, 07-18-2024.jpg"},
    "chrysler-300-300c-srt8": {"pin": "2008 Chrysler 300C SRT-8 sedan (19601667854).jpg"},
    # D-brands review pass (2026-07): 11 of 20 first picks failed the visual
    # check — a Challenger "Hellcat side" shot, an SRT-8 Hellcat (hood open)
    # standing in for the SRT Demon, a snakeskin-wrapped Charger show car with
    # its doors up, a Durango 392 (rear view) for the Hellcat, a 4th-gen (2001)
    # van for the 5th-gen Grand Caravan, a De Tomaso Pantera *race* car, a
    # Stealth ES for the R/T Turbo, a base Viper for the ACR, and a low-res /
    # cluttered pair of the Datsun 280Z and Viper GTS. Two rare cars were
    # invisible to full-text search — the 2018 SRT Demon (buried under 1971
    # Dart "Demon"s) and it needed Category:"Dodge Challenger Demon".
    "datsun-280z-s30": {"pin": "1976 Datsun 280Z, front 6.16.19.jpg"},
    "de-tomaso-pantera-gts": {"pin": "1974 De Tomaso Pantera GTS in Red and Black, front left.jpg"},
    "dodge-challenger-hellcat": {"pin": "2015 Dodge Challenger SRT Hellcat (21607516352).jpg"},
    "dodge-challenger-srt-demon": {"pin": "Dodge Challenger Demon 2 Genf 2018 (cropped).jpg"},
    "dodge-charger-r-t-scat-pack": {"pin": "2021 Dodge Charger Scat Pack, front right (Cruisin' the River Lowellville Car Show, June 19th, 2023).jpg"},
    "dodge-durango-srt-hellcat": {"pin": "Dodge Durango SRT Hellcat MYLE Festival 2025 DSC 9644.jpg"},
    "dodge-grand-caravan-5th-gen-rt": {"pin": "2012 Dodge Grand Caravan RT -- 2012 DC.JPG"},
    "dodge-stealth-r-t-turbo": {"pin": "1991 Dodge Stealth RT Turbo, Front Left, 10-03-2021.jpg"},
    "dodge-viper-gen-5-acr": {"pin": "2016 Dodge Viper ACR with Extreme Aero package, front left, 06-16-2024.jpg"},
    "dodge-viper-gts-gen-2": {"pin": "1997 Dodge Viper (35083948226).jpg"},
    "dodge-viper-zb-gen-3": {"pin": "2003 Dodge Viper SRT-10 Roadster in Viper Red, Front Right (St. Ignace 2023).jpg"},
    # F brands (hand-picked after contact-sheet review)
    "ferrari-testarossa-type-f110": {"pin": "1988 Ferrari Testarossa (30567369747).jpg"},
    "ferrari-f50-f50": {"pin": "1997 Ferrari F50 front.jpg"},
    "ferrari-laferrari-f150": {"pin": "Ferrari LaFerrari (2015) (53321819267).jpg"},
    "ford-focus-3rd-gen-c346": {"pin": "2013 Ford Focus SE in Blue Candy Metallic Tinted Clearcoat, Front Left, 06-26-2022.jpg"},
    "ford-focus-st-mk3": {"pin": "2015 Ford Focus ST, Front Left, 04-04-2021.jpg"},
    "ford-bronco-raptor-u725": {"pin": "Ford Bronco Raptor (2024) (53621271856).jpg"},
    "ford-gt40-mk-ii": {"pin": "1966 Ford GT40 Mark II no. 5 at NYIAS 2022, front left.jpg"},
    "ford-mustang-fox-body-gt": {"pin": "1990 Ford Mustang GT 5.0 Hatchback in Ultra Blue, front right.jpg"},
    "ford-mustang-gt-s197-5-0": {"pin": "Ford MUSTANG V8 GT Coupé Premium (S197) front.JPG"},
    "ford-mustang-mach-1": {"pin": "Ford Mustang Mach1, 2021 front.jpg"},
    "ford-mustang-mach-e-gt": {"pin": "2023 Ford Mustang Mach-E GT in Rapid Red 01.jpg"},
    "ford-mustang-shelby-gt350": {"pin": "2020 Ford Mustang Shelby GT350, front three-quarter view, A Paris Street Market at Aspen Grove car show 2026-05-02.jpg"},
    "ford-taurus-sho-gen-1": {"pin": "Ford Taurus SHO (second-gen).jpg"},
    # G brands (hand-picked after contact-sheet review)
    "genesis-gv70-jk": {"pin": "2022 Genesis GV70 AWD, front 12.15.21.jpg"},
    "genesis-gv80-jx1": {"pin": "2021 Genesis GV80 3.5T Advanced, front left, 09-09-2023.jpg"},
    "gmc-syclone-gmt400": {"pin": "1991 GMC Syclone in Black, front right (Saratoga).jpg"},
    # H brands (hand-picked after contact-sheet review; many replaced a pre-sweep Honda batch)
    "honda-accord-9th-gen-cr": {"pin": "2013 Honda Accord LX sedan in White Orchard Pearl, front right, 04-26-2025.jpg"},
    "honda-accord-8th-gen-cp-cs": {"pin": "2008 Honda Accord EX-L, Front Right, 11-21-2021.jpg"},
    "honda-civic-11th-gen-fe": {"pin": "2022 Honda Civic LX Sedan, front right, 11-02-2022.jpg"},
    "honda-civic-8th-gen-fa-fg": {"pin": "2008 Honda Civic DX-G in Alabaster Silver, Front Left, 07-31-2022.jpg"},
    "honda-civic-eg6-sir-jdm": {"pin": "Tuned Honda Civic SiR (E-EG6) front.jpg"},
    "honda-civic-ek9-type-r-jdm": {"pin": "1997 Honda Civic Type R (EK9), front left.jpg"},
    "honda-civic-si-9th-gen-fb6": {"pin": "2014 Honda Civic Si Sedan in Rallye Red, front left, 2024-10-04.jpg"},
    # 11th-gen Si: the year-search kept surfacing the same snow-covered orange car;
    # this CC0 black sedan is a clean sunny front-3/4 (and it's the model tile's face).
    "honda-civic-si-11th-gen-fe1": {"pin": "22 Honda Civic Si.jpg"},
    # BB1 Prelude: the auto-pick was a Mercedes CLS55 parked in front of the Prelude
    # (the file title carries both names). Pin an isolated 4th-gen front-3/4 instead.
    "honda-prelude-bb1-4th-gen": {"pin": "1994 Honda Prelude 2.0 I (8094200560).jpg"},
    "honda-cr-z-zf1": {"pin": "2014 Honda CR-Z Sport-T i-VTEC 1.5 Front.jpg"},
    "honda-crx-ef": {"pin": "1991 Honda CRX Si in Rio Red, front left.jpg"},
    "honda-fit-3rd-gen-gk": {"pin": "2015 Honda Fit Hybrid front - JDM import.jpg"},
    "honda-odyssey-4th-gen-rl5": {"pin": "2013 Honda Odyssey EX, Front Right, 10-16-2020.jpg"},
    "honda-ridgeline-2nd-gen": {"pin": "2017 Honda Ridgeline RTL-E, front right (Hershey 2019).jpg"},
    "honda-s660-jw5": {"pin": "Honda S660 α (JW5) front.JPG"},
    "honda-nsx-na1": {"pin": "1991 Acura NSX, front left (Huntington).jpg"},
    "honda-beat-pp1": {"pin": "MG 1108 (51600971356).jpg"},
    "hummer-h1-alpha": {"pin": "Hummer H1 red front.jpg"},
    "hyundai-kona-n-os": {"pin": "2023 Denver Auto Show Hyundai Kona N front quarter.jpg"},
    "hyundai-tiburon-gk": {"pin": "2008 Hyundai Tiburon, front 8.25.19.jpg"},
    "hyundai-tucson-4th-gen-nx4": {"pin": "2022 Hyundai Tucson SEL, front 5.2.22.jpg"},
    "hyundai-veloster-n-js": {"pin": "2022 Hyundai Veloster N in Performance Blue, Front Right, 05-22-2022.jpg"},
    # I/J brands (hand-picked after contact-sheet review). The auto-search kept
    # defaulting coupes to sedans (no "sedan" opposite in gen_avoid) and top trims
    # to base trims, so these pin the correct body/trim.
    "infiniti-g35-v35": {"pin": "2006-Infiniti-G35-coupe.jpg"},              # was a sedan
    "infiniti-g37-v36": {"pin": "Infiniti G37 Coupé (CV36) front.JPG"},      # was a sedan
    "infiniti-q50-red-sport-400-v37": {"pin": "Infiniti Q50S - Mondial de l'Automobile de Paris 2016 - 001.jpg"},  # was a rear/modified shot
    "jaguar-f-type-r": {"pin": "Jaguar F-Type R Coupé (2016) (54000152815).jpg"},  # was a rear-view F-Type S
    "jeep-gladiator-jt-mojave": {"pin": "2022 Jeep Gladiator Mojave in Sting-Grey, Front Right, 03-06-2022.jpg"},  # was a Sport
    "jeep-grand-cherokee-wk2-trackhawk": {"pin": "Jeep Grand Cherokee Trackhawk Genf 2018.jpg"},  # was a Laredo
    "jeep-grand-wagoneer-ws": {"pin": "2022 Jeep Grand Wagoneer Series III in Bright White and Black, front left.jpg"},  # decluttered
    "jeep-wrangler-jl": {"pin": "2018 Jeep Wrangler Unlimited Sport 4-door front 6.10.18.jpg"},  # Sport, to differ from 392
    "jeep-wrangler-jl-rubicon-392": {"pin": "23 Jeep Wrangler Unlimited Rubicon 392.jpg"},  # was a Sahara
    # K brands (hand-picked after contact-sheet review).
    "kia-carnival-4th-gen-ka4": {"pin": "2022 Kia Carnival LX in Silky Silver, front left.jpg"},  # was the old 1st-gen minivan
    "kia-forte-gt": {"pin": "2019 Kia Forte LXS in Currant Red, front left.jpg"},  # was a Forte5 hatch, rear view (no free GT sedan on Commons)
    "kia-rio-4th-gen-yb": {"pin": "Kia Rio4 1.4 EX sedan 2023.jpg"},  # was the 5-door hatch; catalog is the sedan
    # L brands (hand-picked after contact-sheet review).
    "lamborghini-huracan-lb724": {"pin": "The frontview of Lamborghini huracan LP610-4.JPG"},  # was a rear 3/4
    "lamborghini-murcielago-lp640": {"pin": "Lamborghini Murciélago LP640 Coupé (ABA-BE537) front.jpg"},  # was a rear/side view
    "lancia-stratos-stratos-hf": {"pin": "1974 Lancia Stratos Stradale at Greenwich 2021, front left.jpg"},  # was a rear 3/4
    "land-rover-range-rover-l460": {"pin": "Range Rover L460 HSE Belgravia Green Metallic - front.jpg"},  # was a rear 3/4
    "lexus-gs-f-l10": {"pin": "Lexus GS F (DBA-URL10-FEZRH) front.jpg"},  # was a GS 300, rear view
    "lexus-is-500-xe30": {"pin": "Lexus IS 500\"F SPORT Performance\" (5BA-USE30-BEZLH) front.jpg"},  # was a modified race-liveried car, rear
    "lexus-rc-f-xc10": {"pin": "2015 Lexus RC F in Ultra White, front right.jpg"},  # was the RC 300h F Sport hybrid
    "lexus-is-f-xe20": {"pin": "Lexus IS F USE20 Obsidian - front.jpg"},  # was the IS F CCS concept show car
    "lexus-lc-500-z100": {"pin": "2018 Lexus LC500, Deep Blue Mica, front right.jpg"},  # was a dim auto-show floor shot
    "lexus-sc-300-z30": {"pin": "1996 Lexus SC 300 3.0L front 6.13.18.jpg"},  # was a modified/lowered, cluttered lot
    "lucid-air-grand-touring": {"pin": "2022 Lucid Air Grand Touring in Zenith Red, front left.jpg"},  # was a rear view
    # M brands (hand-picked after contact-sheet review).
    "mazda-cx-9-2nd-gen-tc": {"pin": "2020 Mazda CX-9 Touring, Soul Red Crystal Metallic, front left.jpg"},  # was 1st-gen / wrong angle
    "mazda-mazdaspeed-protege-bj": {"pin": "'03 Mazdaspeed Protegé Sedan (Les chauds vendredis '10).jpg"},  # was wrong Protege trim
    "mazda-rx-3-s102a": {"pin": "1973 Mazda RX3 Series II Coupe (23738913081).jpg"},  # was an RX-7/8 mispick
    "mazdaspeed-mazdaspeed3-bl": {"pin": "2012 Mazdaspeed3 in Liquid Silver Metallic, Front Right, 08-14-2022.jpg"},  # was 1st-gen / rear
    "mazdaspeed-mazdaspeed6-gg": {"pin": "Mazdaspeed Atenza (DBA-GG3P) front.jpg"},  # was a rear/wrong-trim shot
    "mazda-323-gtx-bf": {"pin": "1987 Mazda 323 Formule 4 1.6i Turbo 4WD front.jpg"},  # was a rally car / rear
    "mclaren-570s-sports-series": {"pin": "2017 McLaren 570S Coupé in Volcano Yellow, front left.jpg"},  # was a rear 3/4
    "mclaren-p1-p1": {"pin": "2014 McLaren P1 (Volcano Orange, front left), leaving Greenwich 2018.jpg"},  # was a rear view
    "mercedes-benz-190e-2-5-16-cosworth": {"pin": "Tuned Mercedes-Benz 190E 2.3-16 (W201) front.jpg"},  # was a DTM race car; no stock 2.5-16 front on Commons
    "mercedes-benz-amg-gt-c190": {"pin": "Blue Mercedes-AMG GT S (C190) front.JPG"},  # was a rear/wrong-angle shot
    "mercedes-benz-c63-amg-w205": {"pin": "2016 Mercedes-AMG C 63 S Premium Automatic Coupe 4.0 Front.jpg"},  # was a rear 3/4
    "mercedes-benz-sl55-amg-r230": {"pin": "2007 Mercedes SL55 Auto.jpg"},  # was a rear/wrong-gen shot
    "mercedes-benz-slk55-amg-r171": {"pin": "Mercedes SLK55 R171.jpg"},  # was a rear view
    "mercedes-benz-slr-mclaren-c199": {"pin": "Mercedes-Benz SLR McLaren (C199) front.JPG"},  # was a rear 3/4
    "mg-mgb-chrome-bumper": {"pin": "1970 MGB Mk II Roadster (16332095745).jpg"},  # was a rubber-bumper / GT
    "mini-cooper-classic-cooper-s": {"pin": "1968 Austin Mini Cooper S 1275cc Front.jpg"},  # was a rear/modified shot
    "mini-cooper-s-f56": {"pin": "2017 Mini Cooper S 2.0 Front.jpg"},  # was a JCW / wrong trim
    "mini-cooper-jcw-f56": {"pin": "Mini Hatch (F56) John Cooper Works 3-4-front 2025-08.jpg"},  # was a Cooper S / wrong trim
    "mini-cooper-jcw-gp-f56": {"pin": "2020 Mini JCW GP 3.jpg"},  # was a wrong-gen GP / rear
    "maserati-mc20-m240": {"pin": "2023 Maserati MC20 in Digital Mint, front right.jpg"},  # was a rear 3/4
    "mitsubishi-fto-gpx-de3a": {"pin": "1995 FTO GPX Mivec.jpg"},  # was a decaled GS
    "mitsubishi-lancer-evolution-ix": {"pin": "Mitsubishi LANCER Evolution IX MR GSR (GH-CT9A) front.jpg"},  # was a possible-VIII / mislabel
    "mitsubishi-outlander-gn": {"pin": "2022 Mitsubishi Outlander SEL 2.5 in Alloy Silver, front left.jpg"},  # was the wrong 3rd-gen
    "mitsubishi-starion-esi-r": {"pin": "1989 Mitsubishi Starion 2.6 Turbo EX (front).jpg"},  # was a rear/obstructed shot
    # N brand (Nissan) — hand-picked after contact-sheet review.
    "nissan-300zx-z31": {"pin": "1986 Nissan 300ZX Turbo, Front Right, 10-10-2021.jpg"},  # was a soap-marked windshield sale car
    "nissan-350z-z33": {"pin": "2004 Nissan 350Z 3.5 Front.jpg"},  # was a GT2 race car
    "nissan-gt-r-r35": {"pin": "2015 Nissan GT-R Premium in Pearl White, Front Left, 06-17-2022 (2).jpg"},  # was a dim, obstructed garage shot
    "nissan-pulsar-gti-r": {"pin": "Nissan PULSAR GTI-R (E-RNN14) front.jpg"},  # was a Castrol/JECS rally car
    "nissan-sentra-se-r-spec-v": {"pin": "NissanSentraSE-RSpecV.jpg"},  # was a base 1.8S, wrong trim
    "nissan-silvia-s15": {"pin": "Nissan Silvia spec-S AERO (GF-S15) front.jpg"},  # was a rear/side view
    "nissan-skyline-gt-r-r32": {"pin": "1991 Nissan Skyline GT-R R32 front, Bonhams 6.1.19.jpg"},  # was a Trampio/Advan race car
    "nissan-stagea-260rs-wgnc34": {"pin": "Nissan STAGEA 260RS (WC34) front.JPG"},  # was a dim garage shot
    "nissan-xterra-pro-4x-n50": {"pin": "2008 Nissan Xterra, front left, 01-01-2026.jpg"},  # was the wrong 1st-gen WD22
    "nissan-z-rz34": {"pin": "2023 Nissan Z Performance 6MT in Passion Red TriCoat, Front Left, 05-17-2023.jpg"},  # was a dim reflective showroom
    # P brand (Pagani, Plymouth, Porsche) — hand-picked after contact-sheet review.
    "pagani-zonda-c12-f": {"pin": "Pagani Zonda F.jpg"},  # was a doors-up motorshow display car
    "plymouth-barracuda-cuda": {"pin": "1970 Plymouth AAR Cuda 340 (31456408978).jpg"},  # was a rear 3/4 view
    "porsche-911-992-carrera": {"pin": "Porsche 992 Carrera S coupe IMG 5832.jpg"},  # was a Turbo S, wrong trim
    "porsche-911-997-carrera": {"pin": "2011 Porsche 911 Carrera S coupe, front right, 06-07-2025.jpg"},  # was a GT3 RS, rear view
    "porsche-911-turbo-930": {"pin": "1988 Porsche 911 930 Turbo.jpg"},  # was a Flatnose/slantnose, atypical
    "porsche-911-gt3-rs-991-2": {"pin": "2019 Porsche 911 991 GT3 RS 10.jpg"},  # was indoor, behind velvet ropes
    "porsche-918-spyder-918": {"pin": "2015 Porsche 918 Spyder, front left, 06-08-2024.jpg"},  # auto-search found no free candidate
    "porsche-924-924-turbo": {"pin": "1982 Porsche 924 Turbo.jpg"},  # was a 924 Carrera GT (rare homologation), not std Turbo
    "porsche-944-944-turbo": {"pin": "1986 Porsche 944 Turbo.jpg"},  # was a 944 S2, wrong trim
    "porsche-cayenne-turbo-gt-9ya": {"pin": "2022 Porsche Cayenne Turbo GT Auto 3.jpg"},  # was a rear 3/4 view
    "porsche-cayman-gt4-982": {"pin": "2019 718 GT4 in Grey at FOS21.jpg"},  # was a GT4 RS Clubsport race car
    "porsche-cayman-gt4-rs-982": {"pin": "2022 Porsche 718 Cayman GT4 RS (39251).jpg"},  # was a GT4 RS Clubsport race car
    # O/R brands (Oldsmobile, Opel, Ram, Renault, Rivian) — hand-picked after contact-sheet review.
    "oldsmobile-442-w-30": {"pin": "1970 Oldsmobile 442 W30.jpg"},  # was a 1971 base 442, not the 1970 W-30
    "opel-manta-gt-e": {"pin": "1984 Opel Manta B GT-E (16870964736).jpg"},  # was a Vauxhall Cavalier (wrong car)
    "ram-1500-dt-trx": {"pin": "23 Ram 1500 TRX (1).jpg"},  # was a base Crew Cab with a bull bar, not the TRX widebody
    "renault-5-turbo": {"pin": "1984 Renault 5 Turbo 2.jpg"},  # was the FWD Gordini/Alpine Turbo, not the mid-engine widebody
    "rivian-r1t-launch-edition": {"pin": "2022 Rivian R1T Adventure in Forest Green, front left.jpg"},  # was a rear-left view
    # S brands (Saab, SEAT, Shelby, Skoda, Subaru) — hand-picked after contact-sheet review.
    "saab-9-3-viggen": {"pin": "Saab-9-3-coupe-viggen.jpg"},  # was a Saab 9-5 SportCombi wagon (wrong model)
    "seat-leon-cupra-r-mk2": {"pin": "Seat Leon 1P Cupra R Tribu.JPG"},  # was a Mk1 Cupra (wrong gen)
    "shelby-cobra-427": {"pin": "1967 Shelby 427 Cobra starboard fore quarter, lighter. DSC 0734 (47528138991).jpg"},  # was a side-profile driving shot
    "shelby-gt500-mk-i": {"pin": "1968 Shelby Mustang GT500KR Fastback (32916787850).jpg"},  # was a possible Eleanor restomod on an indoor stand
    "skoda-octavia-vrs-mk3": {"pin": "2013 Skoda Octavia III RS (Typ 5E) 2.0 TSI Rio-Rot-Metallic Vorderansicht Nockalmstrasse.JPG"},  # was a rear 3/4 view
    "subaru-ascent-wm": {"pin": "2019 Subaru Ascent front 12.29.18.jpg"},  # was a rear 3/4 view
    "subaru-baja-sport": {"pin": "2003 Subaru Baja in Mystic Blue Pearl, front left, 10-12-2025.jpg"},  # was a distant row of Subarus
    "subaru-forester-xt-sg": {"pin": "03-05 Subaru Forester XT.jpg"},  # was a small base-looking Forester; want the XT hood scoop
    "subaru-impreza-2-5-rs-gc8": {"pin": "2001 Subaru Impreza 2.5 RS 4-dr, front right.jpg"},  # was a rear 3/4 view
    "subaru-legacy-gt-spec-b": {"pin": "08-Subaru-Legacy-SpecB.jpg"},  # was a 2001 3rd-gen GT with a bike rack (wrong gen)
    "subaru-svx-alcyone": {"pin": "Subaru Alcyone in Black Mica, front left.jpg"},  # was a 2.5:1 panoramic crop
    "subaru-wrx-va": {"pin": "2015 Subaru WRX Limited, Front Right, 04-10-2021.jpg"},  # pre-existing rear 3/4 view (Honda-lesson re-review)
}

kebab = lambda s: re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", (s or "").lower()))


def _get(url, tries=2):
    last = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 — one polite retry, then give up
            last = e
            time.sleep(1.5)
    raise last


def strip_html(s):
    if not s:
        return ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()


# --- Target building: which cars to fetch, and how to search for each ----------

def primary_slug(v):
    return "-".join(x for x in [kebab(v.get("make")), kebab(v.get("model")),
                                kebab(v.get("generation"))] if x)


def curated_keys():
    """make+model keys that have a curated data/cars/*.json profile."""
    keys = set()
    for f in glob.glob(os.path.join(CARS_DIR, "*.json")):
        keys.add(kebab(json.load(open(f)).get("name", "")))
    return keys


def chassis_code(generation):
    """Pull the chassis code out of a generation string: '9th Gen FG4' -> 'FG4',
    'A80 (Mk4)' -> 'A80', 'ND' -> 'ND'."""
    g = re.sub(r"\(.*?\)", "", generation or "")
    g = re.sub(r"\b\d+(st|nd|rd|th)\b", "", g, flags=re.I)
    g = re.sub(r"\bgen(eration)?\b", "", g, flags=re.I).strip()
    toks = [t for t in re.split(r"[\s/]+", g) if t]
    for t in toks:            # prefer a token with a digit (E46, FG4, A80, ZN8)
        if re.search(r"\d", t):
            return t
    return toks[0] if toks else ""


def gen_query(c):
    # Year disambiguates generation far better than the chassis code for
    # mainstream models (Commons filenames use years, not codes like XV70).
    code = chassis_code(c.get("generation"))
    year = str(c.get("year") or "")
    return " ".join(x for x in [c["make"], c["model"], code, year] if x)


def gen_tokens(c):
    toks = {w for w in re.split(r"\s+", (c["model"] or "").lower()) if len(w) >= 2}
    code = chassis_code(c.get("generation")).lower()
    if code:
        toks.add(code)
    return sorted(toks)


def gen_avoid(c):
    """Body-style opposites, so a coupe search doesn't pick the wagon/convertible
    variant (the E46-M3-Touring mistake, generalized)."""
    body = (c.get("body") or "").lower()
    av = set()
    open_top = any(k in body for k in ("roadster", "convertible", "spyder", "cabrio"))
    if open_top:
        av |= {"hardtop", "coupe"}
    else:
        av |= {"convertible", "cabriolet", "cabrio", "roadster", "spyder", "spider"}
    if not any(k in body for k in ("wagon", "estate", "touring", "avant")):
        av |= {"wagon", "estate", "touring", "avant", "kombi"}
    return sorted(av)


def build_targets(limit=None, makes=None):
    """Rows to fetch. Default: catalog rows whose make+model has a curated
    profile. With `makes`: EVERY catalog row of those makes (the brand-by-brand
    whole-catalog sweep), ordered alphabetically make -> model -> year."""
    cat = json.load(open(CATALOG))
    if makes:
        wanted = {m.strip().lower() for m in makes}
        cat = [c for c in cat if (c.get("make") or "").lower() in wanted]
        cat.sort(key=lambda c: ((c.get("make") or "").lower(),
                                (c.get("model") or "").lower(),
                                c.get("year") or 0))
    curated = curated_keys()
    have = {p[:-5] for p in os.listdir(IMG_DIR) if p.endswith(".webp")} \
        if os.path.isdir(IMG_DIR) else set()
    out, seen = [], set()
    for c in cat:
        if not makes and kebab(f"{c['make']} {c['model']}") not in curated:
            continue
        slug = primary_slug(c)
        if not slug or slug in have or slug in seen:
            continue
        seen.add(slug)
        if OVERRIDES.get(slug, {}).get("skip"):
            continue  # reviewed: no acceptable free image on Commons yet
        row = {
            "slug": slug,
            "car": f"{c['make']} {c['model']} ({c.get('generation') or c.get('year')})",
            "make": c["make"], "model": c["model"],
            "code": chassis_code(c.get("generation")),
            "body": c.get("body", ""),
            "year": c.get("year"),
            "query": gen_query(c),
            "tokens": gen_tokens(c),
            "avoid": gen_avoid(c),
        }
        if slug in OVERRIDES:
            row.update(OVERRIDES[slug])
        out.append(row)
    return out[:limit] if limit else out


# --- Commons search + scoring --------------------------------------------------

def search(query, limit=15):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": query, "gsrnamespace": "6", "gsrlimit": str(limit),
        "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime|user",
        "iiurlwidth": str(MAX_W),
    }
    data = json.loads(_get(API + "?" + urllib.parse.urlencode(params)))
    return list(data.get("query", {}).get("pages", {}).values())


def get_file(filename):
    """Fetch one exact Commons file by title (for pins) — more reliable than
    search, which may not surface or rank the wanted file."""
    params = {
        "action": "query", "format": "json", "titles": f"File:{filename}",
        "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime|user",
        "iiurlwidth": str(MAX_W),
    }
    data = json.loads(_get(API + "?" + urllib.parse.urlencode(params)))
    for p in data.get("query", {}).get("pages", {}).values():
        if "imageinfo" in p:
            return p
    return None


def candidate_queries(car):
    """Specific-first, then broaden for recall. 'make model code year' is precise
    but often returns nothing (few files carry both a chassis code and a year);
    dropping terms recovers results while the year-guard keeps the generation
    honest."""
    base = f"{car['make']} {car['model']}".strip()
    code, year = car.get("code", ""), str(car.get("year") or "")
    variants = []
    if car["slug"] in OVERRIDES and OVERRIDES[car["slug"]].get("query"):
        variants.append(OVERRIDES[car["slug"]]["query"])
    for q in (f"{base} {code} {year}", f"{base} {year}", f"{base} {code}", base):
        variants.append(" ".join(q.split()))
    seen, out = set(), []
    for q in variants:
        if q and q not in seen:
            seen.add(q); out.append(q)
    return out


def _cand(page, sc=None, why=None):
    ii = (page.get("imageinfo") or [{}])[0]
    em = ii.get("extmetadata", {}) or {}
    return {
        "score": sc, "reasons": why or [], "title": page.get("title", ""),
        "thumb": ii.get("thumburl") or ii.get("url"),
        "page": ii.get("descriptionurl"), "license": license_of(em),
        "license_url": (em.get("LicenseUrl", {}) or {}).get("value", ""),
        "artist": strip_html((em.get("Artist", {}) or {}).get("value", "")) or ii.get("user", ""),
        "width": ii.get("width"), "height": ii.get("height"),
    }


def best_candidates(car):
    """Return (query_used, ranked). A `pin` in OVERRIDES forces a specific,
    hand-vetted file (bypassing the scorer); otherwise walk the query cascade and
    return the first query that yields any acceptable candidate."""
    pin = OVERRIDES.get(car["slug"], {}).get("pin")
    if pin:
        try:
            p = get_file(pin)
            if p:
                cand = _cand(p)
                # Pins are hand-vetted for CONTENT, but the license gate still
                # applies — a pin must never smuggle in a non-free file.
                if license_ok(cand["license"]):
                    return f"pin:{pin}", [cand]
                print(f"  ! pin license blocked ({cand['license']!r}): {pin!r} "
                      "(falling back to search)")
            else:
                print(f"  ! pin not found: {pin!r} (falling back to search)")
        except Exception:  # noqa: BLE001 — fall through to the cascade
            pass
    for q in candidate_queries(car):
        try:
            pages = search(q)
        except Exception:  # noqa: BLE001 — try the next, broader query
            continue
        ranked = []
        for p in pages:
            sc, why = score(p, car["tokens"], car.get("avoid", []), car.get("year"))
            if sc is not None:
                ranked.append(_cand(p, sc, why))
        if ranked:
            ranked.sort(key=lambda x: x["score"], reverse=True)
            return q, ranked
    return None, []


def license_of(em):
    return (em.get("LicenseShortName", {}) or {}).get("value", "") or ""


def score(page, tokens, avoid=(), target_year=None):
    """Rank a candidate for hero use, or (None, why) if disqualified."""
    ii = (page.get("imageinfo") or [{}])[0]
    em = ii.get("extmetadata", {}) or {}
    title = (page.get("title", "") or "").lower()
    lic = license_of(em)

    if ii.get("mime") not in ("image/jpeg", "image/png"):
        return None, f"mime {ii.get('mime')}"
    if not license_ok(lic):
        return None, f"non-free: {lic!r}"
    w, h = ii.get("width", 0), ii.get("height", 0)
    if w < 1200:
        return None, f"small ({w}px)"
    if h and w / h < 1.15:
        return None, f"portrait ({w}x{h})"
    hit_avoid = [a.strip() for a in avoid if a.strip() and a.strip() in title]
    if hit_avoid:
        return None, "avoid:" + ",".join(hit_avoid)
    # Generation guard: if the title names year(s) and none land within 6 of the
    # target, it's almost certainly the wrong generation (1999 Camry vs XV70).
    if target_year:
        years = [int(y) for y in re.findall(r"\b(?:19|20)\d{2}\b", title)]
        if years and not any(abs(y - target_year) <= 6 for y in years):
            return None, f"year-off ({min(years)}-{max(years)} vs {target_year})"

    s, reasons = 0.0, []
    if re.match(r"^(cc0|public|pd)", lic.replace("-", " ").strip(), re.I):
        s += 2.0; reasons.append("CC0/PD")
    ratio = w / h if h else 1.5
    s += 2.0 - min(abs(ratio - 1.6), 1.0) * 2.0
    hits = [t.strip() for t in tokens if t.strip() and t.strip() in title]
    s += 1.2 * len(hits)
    if hits:
        reasons.append("tokens:" + ",".join(hits))
    if any(g in title for g in GOOD):
        s += 1.0; reasons.append("good-angle")
    if "front" in title:
        s += 1.5; reasons.append("front")
    if any(b in title for b in BAD):
        s -= 2.5; reasons.append("bad-angle")
    # Reward a title year near the target so a correctly-dated photo outranks a
    # generic-titled wrong-generation one (which the year-guard can't reject).
    if target_year:
        yrs = [int(y) for y in re.findall(r"\b(?:19|20)\d{2}\b", title)]
        if any(abs(y - target_year) <= 3 for y in yrs):
            s += 2.5; reasons.append("year-match")
    s += min(w / 4000.0, 1.0) * 0.5
    return round(s, 2), reasons


def to_webp(raw, dest):
    im = Image.open(io.BytesIO(raw))
    if im.mode not in ("RGB", "L"):
        im = im.convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.save(dest, "WEBP", quality=WEBP_QUALITY, method=6)
    return im.size


# --- Persistence ---------------------------------------------------------------

def load_manifest():
    if os.path.exists(MANIFEST):
        data = json.load(open(MANIFEST))
        if isinstance(data, list):
            return {m["slug"]: m for m in data if "slug" in m}
        return data
    return {}


def save_manifest(man):
    json.dump(sorted(man.values(), key=lambda m: m["slug"]), open(MANIFEST, "w"), indent=2)


def write_credits(man):
    lines = [
        "# Image credits", "",
        "Hero photos sourced from Wikimedia Commons under free licenses "
        "(CC0 / public-domain / CC-BY / CC-BY-SA). CC-BY(-SA) requires the "
        "attribution below. Fetched by `scripts/fetch_images.py`.", "",
        "| Car | File | Author | License |",
        "| --- | --- | --- | --- |",
    ]
    for m in sorted(man.values(), key=lambda m: m["car"]):
        if m.get("status") != "ok":
            continue
        p = m["pick"]
        page = p.get("page") or ""
        title = p["title"].replace("File:", "")
        lines.append(f"| {m['car']} | [{title}]({page}) | {p['artist'] or '—'} | "
                     f"[{p['license']}]({p.get('license_url') or page}) |")
    with open(os.path.join(IMG_DIR, "CREDITS.md"), "w") as f:
        f.write("\n".join(lines) + "\n")


def needs_credit(license_name):
    """CC BY / CC BY-SA require attribution; CC0 / public-domain do not."""
    return license_name.strip().lower().startswith("cc by")


def write_frontend_credits(man):
    """Emit the data the /credits page renders (Title, Author, Source, License)."""
    os.makedirs(os.path.dirname(FRONTEND_CREDITS), exist_ok=True)
    out = []
    for m in sorted(man.values(), key=lambda m: m["car"]):
        if m.get("status") != "ok":
            continue
        p = m["pick"]
        out.append({
            "car": m["car"],
            "title": p["title"].replace("File:", ""),
            "author": p.get("artist") or "Unknown",
            "license": p["license"],
            "licenseUrl": p.get("license_url") or p.get("page") or "",
            "source": p.get("page") or "",
            "attributionRequired": needs_credit(p["license"]),
        })
    with open(FRONTEND_CREDITS, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)


# --- Main ----------------------------------------------------------------------

def main():
    limit, makes = None, None
    for arg in sys.argv[1:]:
        if arg.startswith("--makes="):
            makes = [m for m in arg.split("=", 1)[1].split(",") if m.strip()]
        elif arg.isdigit():
            limit = int(arg)
        else:
            sys.exit(f"usage: fetch_images.py [limit] [--makes=Make1,Make2,...]  "
                     f"(got {arg!r})")
    os.makedirs(IMG_DIR, exist_ok=True)
    manifest = load_manifest()
    targets = build_targets(limit, makes)
    scope = f"makes: {', '.join(makes)}" if makes else "profiled rows"
    print(f"{len(targets)} cars to fetch ({scope}, missing an image)\n")

    ok = 0
    for i, car in enumerate(targets, 1):
        print(f"[{i}/{len(targets)}] {car['car']}  [{car['slug']}]")
        used_q, ranked = best_candidates(car)

        if not ranked:
            print("  ! no acceptable candidate (non-free / too small / wrong body / gen)")
            manifest[car["slug"]] = {**car, "status": "no-candidate", "alternates": []}
            save_manifest(manifest)
            time.sleep(0.5)
            continue

        best = ranked[0]
        status = "ok"
        try:
            raw = _get(best["thumb"])
            dest = os.path.join(IMG_DIR, car["slug"] + ".webp")
            size = to_webp(raw, dest)
            kb = os.path.getsize(dest) // 1024
            tag = "pinned" if best["score"] is None else f"score {best['score']}"
            print(f"  {best['license']:<14} {tag:<12} "
                  f"{best['title'].replace('File:', '')[:58]}")
            print(f"  -> {car['slug']}.webp ({size[0]}x{size[1]}, {kb}KB)")
            ok += 1
        except Exception as e:  # noqa: BLE001
            print(f"  ! download/convert failed: {e}")
            status = "download-error"

        manifest[car["slug"]] = {**car, "status": status, "query_used": used_q,
                                 "pick": best, "alternates": ranked[1:4]}
        save_manifest(manifest)  # incremental, so a crash keeps progress
        time.sleep(0.5)          # be polite to Commons

    write_credits(manifest)
    write_frontend_credits(manifest)
    print(f"\n{ok}/{len(targets)} images saved this run. "
          f"Manifest -> scripts/image_manifest.json")


if __name__ == "__main__":
    main()
