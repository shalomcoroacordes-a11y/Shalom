#!/usr/bin/env python3
"""Mapa informativo de dependencias JavaScript estáticas de SHALOM.

No modifica archivos ni decide qué borrar. Se ejecuta desde cualquier carpeta:
    python3 scripts/audit_js_dependencies.py
"""
from collections import defaultdict
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = (
    re.compile(r"""\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""\bimport\s+(?:[^;'"]+?\s+from\s+)?['"]([^'"]+)['"]"""),
    re.compile(r"""\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)"""),
    re.compile(r"""\bexport\s+[^;'"]*?\s+from\s+['"]([^'"]+)['"]"""),
)
EXCLUDED = {"node_modules", ".git", ".expo", "android", "ios", "dist", "build"}
EXTENSIONS = (".js", ".cjs", ".mjs", ".json")

def candidates(source, specifier):
    if not specifier.startswith("."):
        return []
    base = source.parent / specifier
    return [base, *(Path(str(base) + ext) for ext in EXTENSIONS),
            *(base / ("index" + ext) for ext in EXTENSIONS)]

def main():
    files = sorted(p for p in ROOT.rglob("*") if p.is_file()
                   and p.suffix in {".js", ".cjs", ".mjs"}
                   and not set(p.relative_to(ROOT).parts).intersection(EXCLUDED))
    incoming = defaultdict(set)
    missing = []
    external = defaultdict(set)
    print("# Dependencias JavaScript de SHALOM\n")
    print("Análisis de importaciones literales y require(); no incluye referencias "
          "a globals, eventos, rutas dinámicas ni scripts inyectados.\n")
    for source in files:
        relative = source.relative_to(ROOT).as_posix()
        content = source.read_text(encoding="utf-8")
        found = set()
        for pattern in PATTERNS:
            found.update(pattern.findall(content))
        if not found:
            continue
        print(f"## `{relative}`\n")
        for specifier in sorted(found):
            if not specifier.startswith("."):
                external[specifier].add(relative)
                print(f"- paquete o módulo externo: `{specifier}`")
                continue
            target = next((p.resolve() for p in candidates(source, specifier)
                           if p.is_file()), None)
            if target and target.is_relative_to(ROOT):
                destination = target.relative_to(ROOT).as_posix()
                incoming[destination].add(relative)
                print(f"- `{specifier}` → `{destination}`")
            else:
                missing.append((relative, specifier))
                print(f"- `{specifier}` → **NO RESUELTO** (revisar)")
        print()
    print("## Módulos con varios consumidores\n")
    for path, users in sorted(incoming.items()):
        if len(users) > 1:
            print(f"- `{path}`: {', '.join(sorted(users))}")
    print("\n## Referencias relativas sin resolver\n")
    for path, specifier in missing:
        print(f"- `{path}` → `{specifier}`")
    if not missing:
        print("Ninguna detectada.")
    print("\n**Importante:** la ausencia de referencias estáticas no demuestra "
          "que un archivo no se utilice. Este análisis es orientativo; "
          "revisar también HTML, variables globales y cargas dinámicas.")
    print(f"\nResultado: {len(files)} archivos JS analizados; "
          f"{len(incoming)} módulos locales referenciados; "
          f"{len(missing)} referencias relativas sin resolver.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
