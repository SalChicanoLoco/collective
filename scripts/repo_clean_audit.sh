#!/usr/bin/env bash
set -euo pipefail

echo "== repo-clean-audit =="
echo "date_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "cwd=$(pwd)"
echo "branch=$(git branch --show-current)"
echo "\n-- status --"
git status --short

echo "\n-- latest commits --"
git log --oneline -n 8

echo "\n-- docs checks --"
for f in \
  docs/INCIDENT_RECOVERY_PLAYBOOK.md \
  docs/LANE_CONVERGENCE_STATUS.md \
  docs/CANONICAL_PR_GUIDE.md \
  docs/REPO_CLEANUP_EXECUTION.md \
  .github/pull_request_template.md; do
  if [[ -f "$f" ]]; then
    echo "OK $f"
  else
    echo "MISSING $f"
  fi
done

echo "\n-- duplicate lane surface checks --"
if [[ -d dev ]]; then
  echo "WARN dev/ exists (potential CHUCO duplicate surface)"
else
  echo "OK dev/ removed"
fi
if [[ -f staging/newmexicosocialists/nmnewsfeed.html ]]; then
  echo "WARN staging/newmexicosocialists/nmnewsfeed.html exists (potential NMS duplicate surface)"
else
  echo "OK NMS staging copy removed"
fi

echo "\n== end repo-clean-audit =="
