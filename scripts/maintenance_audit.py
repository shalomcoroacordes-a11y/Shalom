#!/usr/bin/env python3
"""Read-only maintenance audit. No Supabase access or file mutations."""
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE = {".git", "node_modules", ".expo", "dist", "build"}
class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "script" and d.get("src"): self.assets.append(("js", d["src"]))
        if tag == "link" and d.get("rel") == "stylesheet" and d.get("href"):
            self.assets.append(("css", d["href"]))

def main():
    pages = sorted(ROOT.glob("*.html"))
    used = defaultdict(set)
    problems = []
    for page in pages:
        parser = Parser()
        parser.feed(page.read_text(encoding="utf8"))
        seen = set()
        for kind, ref in parser.assets:
            url = urlsplit(ref)
            if url.scheme or ref.startswith("//"): continue
            path = url.path.lstrip("/")
            if not path: continue
            if (kind, path) in seen:
                problems.append(f"{page.name}: repeated {kind} reference {path}")
            seen.add((kind, path))
            target = (page.parent / path).resolve()
            if not target.is_relative_to(ROOT) or not target.is_file():
                problems.append(f"{page.name}: missing {kind} {path}")
                continue
            used[target.relative_to(ROOT).as_posix()].add(page.name)
    # Dynamic literal script injections (not automatically dead code).
    for source in ROOT.glob("*.js"):
        data = source.read_text(encoding="utf8")
        for match in re.finditer(r"""(?:\.src\s*=|setAttribute\(\s*['"]src['"]\s*,)\s*['"]([^'"]+\.js(?:\?[^'"]*)?)['"]""", data):
            name = urlsplit(match.group(1)).path
            if name.startswith(("http:", "https:", "//")): continue
            target = ROOT / name
            if not target.is_file(): problems.append(f"{source.name}: missing dynamic script {name}")
            else: used[name].add(source.name + " (dynamic)")
    root_js = sorted(ROOT.glob("*.js"))
    root_css = sorted(ROOT.glob("*.css"))
    # Candidates are suggestions only: global JS callbacks and CSS imports can use them.
    candidates = [p.name for p in root_js + root_css if p.name not in used]
    large = sorted(
        ((p.relative_to(ROOT).as_posix(), p.stat().st_size)
         for p in ROOT.rglob("*.js")
         if not set(p.relative_to(ROOT).parts).intersection(EXCLUDE)),
        key=lambda item: item[1], reverse=True
    )[:12]
    report = {
        "pages_checked": len(pages),
        "root_js": len(root_js),
        "root_css": len(root_css),
        "large_js": large,
        "possibly_unreferenced_assets_NOT_SAFE_TO_DELETE": candidates,
        "issues": problems,
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main())
