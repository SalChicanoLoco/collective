#!/usr/bin/env bash
set -euo pipefail

fail=0

echo "== go-no-go-readiness =="

for f in \
  docs/CLEANUP_SNAPSHOT.md \
  docs/canonical-lanes.json \
  docs/REPO_CLEANUP_EXECUTION.md \
  docs/GO_NO_GO_TEMPLATE.md; do
  if [[ -f "$f" ]]; then
    echo "OK file: $f"
  else
    echo "MISSING file: $f"
    fail=1
  fi
done

if grep -q "canonical lane validation passed" docs/CLEANUP_SNAPSHOT.md; then
  echo "OK cleanup snapshot contains canonical validation pass"
else
  echo "FAIL cleanup snapshot missing canonical validation pass"
  fail=1
fi

if grep -q "no_prune_candidates\|prune_candidates=" docs/CLEANUP_SNAPSHOT.md; then
  echo "OK cleanup snapshot contains branch prune output"
else
  echo "FAIL cleanup snapshot missing branch prune output"
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "go-no-go-readiness: NOT READY"
  exit 2
fi

echo "go-no-go-readiness: READY"
