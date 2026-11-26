#!/usr/bin/env bash
# Thin entry point; use the same upgrade checks as Pública.
set -euo pipefail
exec bash "$(dirname "$0")/../../mobile/scripts/verify-upgrade-on-emulator.sh" admin
