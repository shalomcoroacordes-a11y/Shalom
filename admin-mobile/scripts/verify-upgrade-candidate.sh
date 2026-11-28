#!/usr/bin/env bash
# Thin entry point; all signing and version checks use the shared implementation.
set -euo pipefail
exec bash "$(dirname "$0")/../../mobile/scripts/verify-upgrade-candidate.sh" admin
