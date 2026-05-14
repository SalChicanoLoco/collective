## Summary
- What changed?
- Why now?
- Which lane/repo does this belong to?

## Canonical lane check
- [ ] This PR belongs to the canonical repository for this site.
- [ ] This PR targets `main` only.
- [ ] No duplicate content was added to non-canonical repos.

## Deployment contract
- [ ] Production URL/path is identified.
- [ ] Rollback tag exists before merge.
- [ ] Smoke checks passed.

## Risk & rollback
- Risk level: Low / Medium / High
- Rollback command(s):
  - `git checkout <rollback-tag>`
  - `git push --force-with-lease origin main` (only if approved)

## Validation evidence
- Commands run:
  - `git status --short`
  - `git log --oneline -n 5`
- Runtime/output notes:

## Post-merge tasks
- [ ] Deploy completed
- [ ] Production URL validated
- [ ] Alerts green
