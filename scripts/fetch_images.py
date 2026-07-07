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
    # No acceptable F22 M235i on Commons (category holds only base 218d-228i
    # trims, Gran Coupés, and rears; the lone M235i file is a rear highway
    # shot) — reviewed 2026-07. Placeholder beats a wrong-badge photo.
    "bmw-m235i-f22": {"skip": True},
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
