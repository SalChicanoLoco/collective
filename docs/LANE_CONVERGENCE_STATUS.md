# Lane Convergence Status

Date: 2026-05-14 (UTC)

## Purpose
This repository (`collective`) is no longer a canonical production lane for CHUCO or NewMexicoSocialists.

## Canonical lanes
- CHUCO production lane: `chuco-site` repository (`main`).
- NewMexicoSocialists production lane: `newmexicosocialists` repository (`main`).

## What was removed from collective
- `dev/` CHUCO app surface (duplicate deployment surface).
- `staging/newmexicosocialists/nmnewsfeed.html` temporary publishing copy.

## Why
Keeping canonical site copies inside `collective` caused lane drift and deploy ambiguity.

## Operational rule
One site, one canonical repository, one production branch.

## Recovery note
If an emergency placeholder is ever needed in `collective` again, it must:
1. be explicitly tagged as temporary,
2. include an expiry date,
3. include canonical source repo + commit reference.
