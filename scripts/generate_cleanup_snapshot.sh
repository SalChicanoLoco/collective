#!/usr/bin/env bash
set -euo pipefail

OUT="docs/CLEANUP_SNAPSHOT.md"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

{
  echo "# Cleanup Snapshot"
  echo
  echo "Generated at: $TS"
  echo
  echo "## Branch + status"
  echo '
```text'
  echo "branch=$(git branch --show-current)"
  git status --short
  echo '```'
  echo
  echo "## Cleanup gate output"
  echo '
```text'
  make cleanup-gate
  echo '```'
} > "$OUT"

echo "WROTE $OUT"
