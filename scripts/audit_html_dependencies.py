#!/usr/bin/env python3
"""Inventario reproducible de dependencias HTML locales de SHALOM.

Uso: python3 scripts/audit_html_dependencies.py
No modifica archivos. Reporta entradas, scripts, estilos, referencias y errores.
"""
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]
ATTRIBUTES = {"script": "src", "link": "href"}

class Assets(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.entries = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ATTRIBUTES and attrs.get(ATTRIBUTES[tag]):
            self.entries.append((tag, attrs[ATTRIBUTES[tag]]))

def local_path(page, raw):
    parsed = urlsplit(raw)
    if parsed.scheme or parsed.netloc or raw.startswith(("#", "//", "data:")):
        return None
    name = unquote(parsed.path)
    if not name or name.startswith("/"):
        return None  # absolute URLs require deployment-aware analysis
    candidate = (page.parent / name).resolve()
    if not candidate.is_relative_to(ROOT):
        return None
    return candidate.relative_to(ROOT).as_posix()

def main():
    pages = sorted(ROOT.glob("*.html"))
    used_by = defaultdict(list)
    missing = []
    print("# Inventario HTML de SHALOM\n")
    print("Generado con `python3 scripts/audit_html_dependencies.py`. "
          "Incluye dependencias declaradas en HTML, no cargas dinámicas ni globals.\n")
    for page in pages:
        parser = Assets()
        parser.feed(page.read_text(encoding="utf-8"))
        print(f"## `{page.name}`\n")
        if not parser.entries:
            print("Sin scripts ni hojas de estilo externas declaradas.\n")
        for tag, raw in parser.entries:
            path = local_path(page, raw)
            kind = "JS" if tag == "script" else "CSS/recurso"
            if path is None:
                print(f"- {kind} externo/absoluto: `{raw}`")
                continue
            used_by[path].append(page.name)
            exists = (ROOT / path).is_file()
            print(f"- {kind}: `{path}`" + ("" if exists else " **NO EXISTE**"))
            if not exists:
                missing.append((page.name, path))
        print()
    print("## Archivos compartidos entre páginas\n")
    shared = [(p, sorted(set(pages))) for p, pages in used_by.items()
              if len(set(pages)) > 1]
    for path, owners in sorted(shared):
        print(f"- `{path}`: {', '.join(owners)}")
    if not shared:
        print("No se detectaron referencias compartidas.")
    print("\n## Archivos JS/CSS sin referencia HTML directa\n")
    all_assets = sorted(p.relative_to(ROOT).as_posix()
                        for p in ROOT.glob("*")
                        if p.is_file() and p.suffix in {".js", ".css"})
    unreferenced = sorted(set(all_assets) - set(used_by))
    for path in unreferenced:
        print(f"- `{path}`")
    if not unreferenced:
        print("Ninguno.")
    print("\n**Advertencia:** «sin referencia HTML directa» NO significa "
          "«sin uso». Puede cargarse dinámicamente, desde otro script o por "
          "un service worker. No borrar automáticamente.\n")
    if missing:
        print(f"ERROR: {len(missing)} referencias locales inexistentes.", file=sys.stderr)
        return 1
    print(f"Resultado: {len(pages)} páginas; {len(used_by)} recursos locales "
          f"distintos; {len(unreferenced)} JS/CSS sin referencia HTML directa.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
