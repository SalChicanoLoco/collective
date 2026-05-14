#!/usr/bin/env bash
set -euo pipefail

echo "== cleanup-gate =="

echo "[1/4] validate_canonical_lanes"
bash scripts/validate_canonical_lanes.sh

echo "\n[2/4] repo_clean_audit"
bash scripts/repo_clean_audit.sh

echo "\n[3/4] branch_sprawl_audit"
bash scripts/branch_sprawl_audit.sh

echo "\n[4/4] branch_prune_plan (dry-run)"
MODE=dry-run bash scripts/branch_prune_plan.sh

echo "\n== cleanup-gate: complete =="
