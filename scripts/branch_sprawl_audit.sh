#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-origin}"
MAX_DAYS="${MAX_DAYS:-45}"
NOW_EPOCH="$(date -u +%s)"

echo "== branch-sprawl-audit =="
echo "date_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "remote=$REMOTE"
echo "max_days=$MAX_DAYS"

git fetch "$REMOTE" --prune >/dev/null 2>&1 || true

echo "\nbranch,last_commit_date,age_days,merged_to_main"
while IFS= read -r ref; do
  branch="${ref#refs/remotes/$REMOTE/}"
  [[ "$branch" == "HEAD" ]] && continue
  [[ "$branch" == "main" ]] && continue

  ts="$(git log -1 --format=%ct "$ref" 2>/dev/null || echo 0)"
  iso="$(git log -1 --format=%cI "$ref" 2>/dev/null || echo unknown)"
  if [[ "$ts" -gt 0 ]]; then
    age_days=$(( (NOW_EPOCH - ts) / 86400 ))
  else
    age_days=99999
  fi

  if git merge-base --is-ancestor "$ref" "$REMOTE/main" 2>/dev/null; then
    merged="yes"
  else
    merged="no"
  fi

  echo "$branch,$iso,$age_days,$merged"
done < <(git for-each-ref --format='%(refname)' "refs/remotes/$REMOTE")

echo "\n-- prune candidates (merged=yes and age_days>$MAX_DAYS) --"
while IFS=, read -r b _ age merged; do
  [[ "$b" == "branch" ]] && continue
  if [[ "$merged" == "yes" && "$age" -gt "$MAX_DAYS" ]]; then
    echo "$b"
  fi
done < <(
  while IFS= read -r ref; do
    branch="${ref#refs/remotes/$REMOTE/}"
    [[ "$branch" == "HEAD" ]] && continue
    [[ "$branch" == "main" ]] && continue
    ts="$(git log -1 --format=%ct "$ref" 2>/dev/null || echo 0)"
    if [[ "$ts" -gt 0 ]]; then age_days=$(( (NOW_EPOCH - ts) / 86400 )); else age_days=99999; fi
    if git merge-base --is-ancestor "$ref" "$REMOTE/main" 2>/dev/null; then merged="yes"; else merged="no"; fi
    echo "$branch,_,${age_days},${merged}"
  done < <(git for-each-ref --format='%(refname)' "refs/remotes/$REMOTE")
)

echo "== end branch-sprawl-audit =="
