#!/usr/bin/env python3
"""Reject new patch-named implementation files; grandfather existing debt."""
import re
import subprocess
import sys
from pathlib import PurePosixPath

PATCH_NAME = re.compile(r"(?:^|[-_.])(?:fix\d*|hotfix\d*|patch\d*|workaround\d*|polish\d*|v[2-9]\d*|v1\d+|final[-_.]final)(?:$|[-_.])", re.I)
SOURCE_SUFFIXES = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".css"}

def is_patch_path(path):
    p = PurePosixPath(path)
    if any(part in {"tests", "__tests__", "scripts", "docs", "node_modules"} for part in p.parts[:-1]):
        return False
    if p.name.endswith((".test.js", ".spec.js", ".test.ts", ".spec.ts")):
        return False
    return p.suffix.lower() in SOURCE_SUFFIXES and bool(PATCH_NAME.search(p.stem))

def main():
    if len(sys.argv) != 3:
        print("Usage: check_clean_changes.py BASE HEAD", file=sys.stderr)
        return 2
    base, head = sys.argv[1:]
    if not base or not head or set(base) == {"0"}:
        print("No comparable base; naming check skipped.")
        return 0
    result = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=ACR", "-z", base, head, "--"],
        capture_output=True, check=True
    )
    invalid = sorted(p for p in result.stdout.decode("utf-8").split("\0") if p and is_patch_path(p))
    if invalid:
        print("New patch-style implementation names; modify the owning module:", file=sys.stderr)
        print("\n".join(invalid), file=sys.stderr)
        return 1
    print("OK: no new patch-style implementation filenames.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
