# SFBC KV1 HTTPS Demo

Static-first exploratory package for Santa Fe Brewing: website refresh, media workflow, brew-ops pilot, and security posture.

## Purpose

This branch contains a Brian/Jenna-facing demonstration of what can be built quickly without disrupting the current team, BrewOS, or payment systems.

## Core stance

- Preserve Santa Fe Brewing's voice and public content logic.
- Help Jenna and the media team move faster; do not replace their creative work.
- Help managers stop living in scattered laptops and spreadsheets.
- Protect BrewOS before discussing replacement.
- Keep the first pilot outside cardholder-data scope.

## Demo contents

- `site/index.html` — self-contained repo demo suitable for quick GitHub Pages review.
- `docs/BRIAN_JENNA_PACKET.md` — human-readable client packet.
- `docs/SECURITY_POSTURE.md` — HTTPS, headers, BrewOS, and PCI boundary posture.
- `docs/LIGHTHOUSE_SUMMARY.md` — Lighthouse run notes and honest scoring caveat.
- `docs/SFBC_CONTENT_LOGIC_MAP.md` — current site logic captured into reusable templates.

## Full asset packet

The full local packet includes WebP hero images, the deeper multi-page site, Lighthouse HTML/JSON artifacts, and static QA reports. The repo version is text/SVG-friendly so it can be pushed safely through this connector.

## Recommended HTTPS deployment

Use Netlify or Cloudflare Pages first. GitHub Pages gives HTTPS, but Netlify/Cloudflare can apply the included security headers more directly.

## Merge note

This branch is safe to merge as a static demo package. It does not introduce Worker code, POS integration, payment handling, secrets, or customer tracking.

## Boundaries

No payment handling. No cardholder data. No POS replacement. No surveillance. Human approval required before publishing.
