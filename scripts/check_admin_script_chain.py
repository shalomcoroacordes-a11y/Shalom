#!/usr/bin/env python3
"""Regression guard for the ordered scripts loaded by admin.html.

Run: python3 scripts/check_admin_script_chain.py
This checks HTML declarations only; it does not execute browser code.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "admin.html"

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.entries = []

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return
        a = dict(attrs)
        if a.get("src"):
            self.entries.append((a["src"], "defer" in a, "async" in a))

def main():
    parser = Scripts()
    parser.feed(PAGE.read_text(encoding="utf-8"))
    entries = parser.entries
    names = [urlsplit(src).path.rsplit("/", 1)[-1] for src, _, _ in entries]
    errors = []
    local = [name for (src, _, _), name in zip(entries, names)
             if not urlsplit(src).scheme and not src.startswith("//")]
    for name in local:
        if local.count(name) > 1:
            errors.append(f"Duplicate admin script: {name}")
        src = entries[names.index(name)][0]
        relative = urlsplit(src).path
        target = (ROOT / relative).resolve()
        if not target.is_relative_to(ROOT) or not target.is_file():
            errors.append(f"Missing admin script: {name}")
    for name in local:
        entry = entries[names.index(name)]
        if not entry[1] or entry[2]:
            if name not in {"Supabase.js"}:
                errors.append(f"Admin module should use defer (not async): {name}")
    chains = [
        ("supabase-js", "Supabase.js", "admin-auth-controller.js"),
        ("song-chords.js", "medley-core.js", "admin-medleys.js"),
        ("repertoires-core.js", "liturgical-dates.js", "liturgical-readings.js", "calendar-web-core.js", "admin-calendar.js", "admin-repertoires.js"),
        ("admin-backup.js", "admin-backup-import.js"),
        ("admin-pro.js", "admin-category-browser-v2.js", "admin-song-category-picker.js"),
    ]
    for chain in chains:
        indexes = []
        for name in chain:
            hits = [i for i, n in enumerate(names) if name in n]
            if len(hits) != 1:
                errors.append(f"Expected exactly one admin dependency: {name}")
            else:
                indexes.append(hits[0])
        if len(indexes) == len(chain) and indexes != sorted(indexes):
            errors.append(f"Wrong admin script order: {' -> '.join(chain)}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"OK: {len(entries)} admin scripts; {len(local)} local; key dependency order preserved.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
