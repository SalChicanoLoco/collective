# Repo Cleanup Execution Plan (No Deploy Until Green)

Date: 2026-05-14 (UTC)

## Rule 0
No production deployments until all cleanup gates are green.

## Phase 1 — Inventory (this repo)
- Run `bash scripts/repo_clean_audit.sh`.
- Capture branch, dirty state, and deleted-file drift.
- Confirm lane convergence docs are present.

## Phase 2 — Canonical lane alignment
- Ensure `collective` is non-canonical for CHUCO and NMS.
- Ensure CHUCO canonical lane is only `chuco-site`.
- Ensure NMS canonical lane is only `newmexicosocialists`.

## Phase 3 — Branch hygiene
- Prune obsolete branches in web UI after merge checks.
- Keep only active long-lived branches + in-flight work.

## Phase 4 — Alert hygiene
- Restrict alerts to production lane only.
- Disable stale preview/branch triggers until stability is confirmed.

## Phase 5 — Pre-deploy gate (future)
All must be true:
- [ ] Canonical lane ownership confirmed.
- [ ] `main` clean and protected.
- [ ] Rollback tag prepared.
- [ ] Smoke checks passing in canonical repo.
- [ ] URL verification checklist ready.

## Deliverables for this phase
- Audit output committed or attached to PR notes.
- Explicit GO/NO-GO decision documented before any deploy action.
