# Canonical PR Guide

Date: 2026-05-14 (UTC)

## Purpose
Standardize PR quality across canonical repos (`chuco-site`, `newmexicosocialists`) and prevent lane drift.

## Required PR sections
1. Summary
2. Canonical lane check
3. Deployment contract
4. Risk & rollback
5. Validation evidence
6. Post-merge tasks

## Merge gate
A PR must not be merged unless all are true:
- Correct canonical repo
- Target branch is `main`
- Rollback tag already created
- Smoke checks passed
- Production path identified

## Suggested smoke checks
- `git status --short`
- `git log --oneline -n 5`
- project-specific runtime check (if available)

## Lane drift warning signs
- Copying production pages into `collective`
- Deploying from feature branches
- Multiple hosts active for the same site
- Missing rollback tag before merge

## Reference docs
- `docs/INCIDENT_RECOVERY_PLAYBOOK.md`
- `docs/LANE_CONVERGENCE_STATUS.md`
