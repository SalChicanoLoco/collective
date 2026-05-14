# Incident Recovery Playbook (No Netlify)

Date: 2026-05-14 (UTC)

## Goal
Recover publish stability with **zero Netlify usage**, minimal local-machine dependency, and clear repository ownership.

## Current known state
- CHUCO app exists under `dev/` in this repository.
- Temporary NewMexicoSocialists landing copy exists under `staging/newmexicosocialists/nmnewsfeed.html`.
- NewMexicoSocialists has its own dedicated repository and should be canonical for that site.

## Principles
1. One site = one canonical repository.
2. One production branch = `main`.
3. No branch-preview deploys during incident recovery.
4. No multi-host mixing while stabilizing.

## Canonical ownership map
- `chuco-site` repository: CHUCO app only.
- `newmexicosocialists` repository: Socialist site only.
- `collective`: shared assets, experiments, and non-canonical copies only.

## Step-by-step recovery

### Phase 1 — Freeze chaos
- Stop all non-main deploy triggers on your chosen host.
- Disable branch previews.
- Pause stale deploy hooks from old repos.

### Phase 2 — Restore Socialist site from canonical repo
1. Use only the `newmexicosocialists` repository.
2. Deploy branch: `main`.
3. Verify production URL loads expected page.

Validation checks:
- Home page returns HTTP 200.
- Key page content renders.
- Last commit hash on host matches `main` commit.

### Phase 3 — Keep CHUCO isolated
1. Ensure CHUCO publishes only from `chuco-site` repository.
2. Do not route CHUCO deploy from `collective`.
3. Keep CHUCO deployment independent of Socialist site releases.

### Phase 4 — Remove duplicate copy from collective (after canonical sites are live)
- Remove temporary `staging/newmexicosocialists/nmnewsfeed.html` copy from `collective` once Socialist site is confirmed live from its own repo.
- Keep `collective` free of canonical production copies that belong elsewhere.

### Phase 5 — Branch and alert hygiene
- Delete stale feature branches that are merged/obsolete.
- Keep only active long-lived branches.
- Reduce alert channels to production-only failures.

## Rollback strategy
If a deployment fails:
1. Re-deploy last known-good `main` commit tag.
2. Freeze merges until service is restored.
3. Record incident notes and root cause before resuming normal flow.

## Minimal operating checklist for every release
- [ ] Correct canonical repo selected.
- [ ] Correct branch selected (`main`).
- [ ] Smoke check passed.
- [ ] Rollback tag exists.
- [ ] Production URL validation complete.

## Notes
This playbook intentionally avoids host-specific commands and UI assumptions so it can be executed from your preferred cloud IDE/VM workflow.
