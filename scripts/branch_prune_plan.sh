#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-origin}"
MAX_DAYS="${MAX_DAYS:-45}"
MODE="${MODE:-dry-run}"
NOW_EPOCH="$(date -u +%s)"

echo "== branch-prune-plan =="
echo "date_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "remote=$REMOTE"
echo "max_days=$MAX_DAYS"
echo "mode=$MODE"

git fetch "$REMOTE" --prune >/dev/null 2>&1 || true

candidates=()
while IFS= read -r ref; do
  branch="${ref#refs/remotes/$REMOTE/}"
  [[ "$branch" == "HEAD" || "$branch" == "main" ]] && continue

  ts="$(git log -1 --format=%ct "$ref" 2>/dev/null || echo 0)"
  [[ "$ts" -gt 0 ]] || continue
  age_days=$(( (NOW_EPOCH - ts) / 86400 ))

  if git merge-base --is-ancestor "$ref" "$REMOTE/main" 2>/dev/null; then
    merged="yes"
  else
    merged="no"
  fi

  if [[ "$merged" == "yes" && "$age_days" -gt "$MAX_DAYS" ]]; then
    candidates+=("$branch")
  fi
done < <(git for-each-ref --format='%(refname)' "refs/remotes/$REMOTE")

if [[ ${#candidates[@]} -eq 0 ]]; then
  echo "no_prune_candidates"
  echo "== end branch-prune-plan =="
  exit 0
fi

echo "prune_candidates=${#candidates[@]}"
for b in "${candidates[@]}"; do
  echo "candidate=$b"
done

if [[ "$MODE" == "apply" ]]; then
  echo "\n-- applying deletes --"
  for b in "${candidates[@]}"; do
    echo "deleting $REMOTE/$b"
    git push "$REMOTE" --delete "$b"
  done
else
  echo "\n-- dry-run delete commands --"
  for b in "${candidates[@]}"; do
    echo "git push $REMOTE --delete $b"
  done
fi

echo "== end branch-prune-plan =="
