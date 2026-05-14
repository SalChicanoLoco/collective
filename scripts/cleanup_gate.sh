#!/usr/bin/env bash
set -euo pipefail

echo "== cleanup-gate =="

echo "[1/3] repo_clean_audit"
bash scripts/repo_clean_audit.sh

echo "\n[2/3] branch_sprawl_audit"
bash scripts/branch_sprawl_audit.sh

echo "\n[3/3] branch_prune_plan (dry-run)"
MODE=dry-run bash scripts/branch_prune_plan.sh

echo "\n== cleanup-gate: complete =="
