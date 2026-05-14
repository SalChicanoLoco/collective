# Cleanup Snapshot

Generated at: 2026-05-14T19:50:31Z

## Branch + status

```text
branch=work
 M docs/REPO_CLEANUP_EXECUTION.md
?? docs/CLEANUP_SNAPSHOT.md
?? scripts/generate_cleanup_snapshot.sh
```

## Cleanup gate output

```text
bash scripts/cleanup_gate.sh
== cleanup-gate ==
[1/4] validate_canonical_lanes
OK canonical-lanes.json schema
OK: dev/ absent
OK: NMS staging copy absent
canonical lane validation passed
\n[2/4] repo_clean_audit
== repo-clean-audit ==
date_utc=2026-05-14T19:50:32Z
cwd=/workspace/collective
branch=work
\n-- status --
 M docs/REPO_CLEANUP_EXECUTION.md
?? docs/CLEANUP_SNAPSHOT.md
?? scripts/generate_cleanup_snapshot.sh
\n-- latest commits --
03628d8 Add canonical lane manifest and validation gate
ee98c86 Add unified cleanup gate command
6733836 Add canonical PR template, lane-convergence docs and repo-cleanup scripts; remove NMS staging copy
4168d52 Merge pull request #31 from SalChicanoLoco/codex/update-canonical-reconciliation-and-conflict-policy
9a78759 Add canonical reconciliation update and conflict policy notes
d311519 Merge pull request #30 from SalChicanoLoco/claude/airtable-numara-scaffolding-sv0m8
95a7d46 feat: NUMARA-Alicia-SNT Airtable scaffolding (NUMARA_ALICIA_META_GRAPH_V2_2)
f6a4378 Merge pull request #29 from SalChicanoLoco/claude/host-json-graph-page-spTdD
\n-- docs checks --
OK docs/INCIDENT_RECOVERY_PLAYBOOK.md
OK docs/LANE_CONVERGENCE_STATUS.md
OK docs/CANONICAL_PR_GUIDE.md
OK docs/REPO_CLEANUP_EXECUTION.md
OK .github/pull_request_template.md
\n-- duplicate lane surface checks --
OK dev/ removed
OK NMS staging copy removed
\n== end repo-clean-audit ==
\n[3/4] branch_sprawl_audit
== branch-sprawl-audit ==
date_utc=2026-05-14T19:50:32Z
remote=origin
max_days=45
\nbranch,last_commit_date,age_days,merged_to_main
\n-- prune candidates (merged=yes and age_days>45) --
== end branch-sprawl-audit ==
\n[4/4] branch_prune_plan (dry-run)
== branch-prune-plan ==
date_utc=2026-05-14T19:50:32Z
remote=origin
max_days=45
mode=dry-run
no_prune_candidates
== end branch-prune-plan ==
\n== cleanup-gate: complete ==
```
