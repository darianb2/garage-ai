"""Assembles one clean car profile from free data sources.

This is the core of the Garage AI "data engine". Instead of looking a car up in
a fixed list, we BUILD its profile on demand. Today the live half comes from
NHTSA's free public APIs (recalls, complaints, crash-test ratings); the spec
half (engine, horsepower, trims) is still served from our hand-curated JSON via
the optional `specs` argument, until we add a commercial specs API.

The shape returned here is deliberately source-agnostic: when we swap NHTSA for
a richer specs API later, the routes and templates that read a profile won't
have to change.
"""

import re
from collections import Counter

from nhtsa import get_complaints, get_recalls, get_safety_ratings

# How many complaint summaries to include for display, and how many grouped
# "common issue" components to surface. Counts/derivations always use the full
# complaint list, not these trimmed samples.
SAMPLE_COMPLAINTS = 8
TOP_ISSUES = 6

# NHTSA stores owner narratives in ALL CAPS with erratic spacing, which reads as
# broken/shouting. We display them in sentence case instead. These short, common
# automotive/road acronyms are restored to uppercase so "abs"/"mph" don't look
# wrong after lowercasing.
_ACRONYMS = {
    "abs", "ac", "awd", "rwd", "fwd", "4wd", "dot", "ecu", "esc", "vsc", "tpms",
    "mph", "rpm", "psi", "suv", "gps", "led", "usb", "vin", "pcm", "tsb", "eps",
}


def _sentence_case(text):
    """Turn an ALL-CAPS NHTSA narrative into readable sentence case.

    Collapses runs of whitespace, lowercases, then re-capitalizes the start of
    each sentence, the pronoun "I", and a few common acronyms. Not perfect (other
    proper nouns are lost), but far more readable than the raw shouting capitals.
    """
    if not text:
        return text
    text = re.sub(r"\s+", " ", text).strip().lower()
    text = re.sub(r"(^|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), text)
    text = re.sub(r"\bi\b", "I", text)
    text = re.sub(r"\b[a-zA-Z]+\b",
                  lambda m: m.group(0).upper() if m.group(0).lower() in _ACRONYMS else m.group(0),
                  text)
    return text


def _clean_components(text):
    """'STEERING,VEHICLE SPEED CONTROL' -> 'Steering, Vehicle Speed Control'."""
    if not text:
        return text
    return ", ".join(p.strip().title() for p in text.split(",") if p.strip())


def _common_issues(complaints, limit=TOP_ISSUES):
    """Group complaints by the component owners blamed -> [(component, count)].

    This is the brief's "common issues derived from complaint patterns": the
    parts people complain about most are, in practice, what tends to break.
    """
    counter = Counter()
    for complaint in complaints:
        # NHTSA lists components as a comma-separated string, e.g.
        # "ELECTRICAL SYSTEM, ENGINE". Count each part on its own.
        for part in (complaint.get("components") or "").split(","):
            part = part.strip().title()
            if part:
                counter[part] += 1
    return counter.most_common(limit)


def _reliability_signal(recalls, complaints):
    """A free, honest reliability proxy from recall + complaint volume.

    IMPORTANT: this is raw report volume, NOT normalized by how many of the car
    were sold, so a popular car looks "worse" simply by being common. We surface
    the real numbers and a coarse label, and say so. When we have a curated
    reliability note in the JSON, that is the more trustworthy signal.
    """
    n_recalls = len(recalls)
    n_complaints = len(complaints)
    serious = sum(1 for c in complaints
                  if c.get("crash") or c.get("fire") or c.get("injuries") or c.get("deaths"))
    total = n_recalls + n_complaints
    if total == 0:
        label = "No NHTSA reports on file"
    elif total < 15:
        label = "Few reports"
    elif total < 60:
        label = "A moderate number of reports"
    else:
        label = "Many reports"
    return {
        "recalls": n_recalls,
        "complaints": n_complaints,
        "serious": serious,
        "label": label,
        "caveat": "Raw NHTSA report volume, not adjusted for how many were sold "
                  "- common cars naturally show more. Treat as a rough signal.",
    }


def build_profile(make, model, year, specs=None):
    """Assemble one car profile from live NHTSA data + optional curated specs.

    `specs` is the hand-curated JSON for this car (engine, hp, etc.) when we
    have it, or None for a car that isn't in our garage yet. Recalls and
    complaints are the core; the crash-test lookup is best-effort and degrades
    to None so a flaky NCAP call can't sink the whole profile.
    """
    recalls = get_recalls(make, model, year)
    complaints = get_complaints(make, model, year)
    try:
        safety = get_safety_ratings(make, model, year)
    except Exception:
        safety = None  # secondary signal - never let it break the profile
    # Clean the sample narratives for display: sentence-case the shouting capitals
    # and tidy the comma-separated component string. The full list is still used
    # for counts/derivations above; only these displayed samples are cleaned.
    samples = [
        {**c,
         "components": _clean_components(c.get("components")),
         "summary": _sentence_case(c.get("summary"))}
        for c in complaints[:SAMPLE_COMPLAINTS]
    ]
    return {
        "make": make,
        "model": model,
        "year": year,
        "specs": specs,
        "recalls": recalls,
        "complaints_count": len(complaints),
        "complaints": samples,                          # cleaned sample for display
        "common_issues": _common_issues(complaints),    # derived from full list
        "reliability": _reliability_signal(recalls, complaints),
        "safety": safety,
    }


if __name__ == "__main__":
    # Quick manual test:  ./.venv/bin/python car_profile.py infiniti q50 2016
    import json
    import sys

    make = sys.argv[1] if len(sys.argv) > 1 else "infiniti"
    model = sys.argv[2] if len(sys.argv) > 2 else "q50"
    year = sys.argv[3] if len(sys.argv) > 3 else "2016"

    profile = build_profile(make, model, year)
    print(json.dumps(profile, indent=2, default=str))
