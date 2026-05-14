#!/usr/bin/env bash
set -euo pipefail

CFG="docs/canonical-lanes.json"

if [[ ! -f "$CFG" ]]; then
  echo "MISSING $CFG"
  exit 1
fi

python3 - <<'PY'
import json
from pathlib import Path
cfg = json.loads(Path('docs/canonical-lanes.json').read_text())
lanes = cfg.get('lanes', {})
required = {'chuco','newmexicosocialists'}
missing = required - set(lanes)
if missing:
    raise SystemExit(f"missing lanes: {sorted(missing)}")
for key in required:
    lane = lanes[key]
    for field in ('canonical_repo','canonical_branch','allowed_in_collective'):
        if field not in lane:
            raise SystemExit(f"lane {key} missing field {field}")
print('OK canonical-lanes.json schema')
PY

violations=0
if [[ -d dev ]]; then
  echo "VIOLATION: dev/ exists while chuco allowed_in_collective=false"
  violations=$((violations+1))
else
  echo "OK: dev/ absent"
fi

if [[ -f staging/newmexicosocialists/nmnewsfeed.html ]]; then
  echo "VIOLATION: staging/newmexicosocialists/nmnewsfeed.html exists while newmexicosocialists allowed_in_collective=false"
  violations=$((violations+1))
else
  echo "OK: NMS staging copy absent"
fi

if [[ "$violations" -gt 0 ]]; then
  echo "canonical lane validation failed ($violations violations)"
  exit 2
fi

echo "canonical lane validation passed"
