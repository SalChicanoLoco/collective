# SF Brew Extraction Roadmap Progress (2026-05-26)

Legend: [x] done, [~] in progress, [ ] pending

## Phase 1 - Monorepo extraction

- [x] Remove `sf-brew-edge/` app tree from `collective`
- [x] Add extraction notes and handoff docs
- [x] Add `.gitignore` coverage for `node_modules`

Progress: 3 / 3 complete (100%)

## Phase 2 - Integrity and ops hygiene

- [x] Add deterministic checksum generator script
- [x] Add `make checksums` target
- [x] Commit baseline `CHECKSUMS.sha256`

Progress: 3 / 3 complete (100%)

## Phase 3 - Standalone repo activation

- [x] Recreate standalone local repo from historical snapshot
- [x] Add CI workflow (`npm ci`, `npm run build`) in standalone repo
- [~] Configure private remote and push `main`
- [ ] Set branch protection and required checks

Progress: 2.5 / 4 complete (62.5%)

## Phase 4 - Follow-through

- [ ] Add ownership/maintainer file in standalone repo
- [ ] Add release tagging convention (`v0.x` cadence)
- [ ] Close extraction loop issue in `collective`

Progress: 0 / 3 complete (0%)

## Overall

Completed units: 8.5 / 13
Overall progress: 65.4%

ASCII progress bar:

[#############-------] 65%
