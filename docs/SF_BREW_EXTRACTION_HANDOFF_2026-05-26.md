# SF Brew Extraction Handoff Notes (2026-05-26)

Purpose: quick context reset for starting a fresh thread.

## What was merged

- The `sf-brew-edge/` demo app was removed from this monorepo.
- Root `README.md` now includes an extraction note.
- Root `.gitignore` now ignores `node_modules/` and `*/node_modules/`.

## Why

- Reduce merge noise in `collective`.
- Isolate fast-moving demo work in a dedicated repository.

## New repo target

- Name: `sf-brew-taproom-cockpit`
- Expected contents: former `sf-brew-edge/` app files.
- Privacy: should be private at remote hosting level.

## Current known baseline in collective

- `make check` has one pre-existing failure unrelated to extraction:
  - `Biblioteca uses deployed Worker URL - not found`

## Suggested first steps for next thread

1. Confirm remote URL and visibility for `sf-brew-taproom-cockpit`.
2. Push local standalone repo and set default branch policy.
3. Add CI for the standalone app (`npm ci`, `npm run build`).
4. Re-run `make check` in `collective` and track only net-new issues.
5. Open follow-up issue to resolve Biblioteca worker URL check.

## Scope reminder

- `collective` should not carry `sf-brew-edge` app code anymore.
- Demo iteration should happen in the standalone repo.
