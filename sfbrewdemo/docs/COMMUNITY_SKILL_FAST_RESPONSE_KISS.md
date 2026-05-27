# Community Skill — Fast Response Static Site Construction

## Skill name

Fast Response Static Site Construction — KISS / Occam Mode

## Context

Salvador received kudos from Google Developers for fast response time in code. This skill captures the operating pattern behind that result so it can be reused for community projects, small businesses, nonprofits, and local operators who need useful web infrastructure without unnecessary complexity.

## Core doctrine

KISS plus Occam's Razor:

- Build the smallest useful thing first.
- Remove unnecessary services before adding new ones.
- Prefer static HTML/CSS/JS when the site does not need a backend.
- Prefer HTTPS static hosting before Workers, servers, databases, or frameworks.
- Avoid runtime dependencies unless they solve a real business problem.
- Keep human approval in the loop before public publishing.

## When to use this skill

Use this mode when a project needs:

- A fast landing page.
- A client-facing demo.
- A community resource page.
- A public packet or explainer.
- A campaign site.
- A small business service page.
- A lightweight event, venue, or product archive.
- A proof-of-concept before paid implementation.

## Design rules

1. Start with plain content and clear navigation.
2. Use semantic HTML.
3. Inline only the critical CSS for tiny demos; split CSS for larger sites.
4. Avoid heavy JavaScript.
5. Avoid third-party trackers and widgets by default.
6. Optimize images before deployment.
7. Use static `_headers` and `_redirects` on Cloudflare Pages or Netlify.
8. Keep payment, authentication, and private data out of the first static demo.

## Performance checklist

- No framework unless needed.
- No external font dependency unless justified.
- No blocking third-party scripts.
- No analytics by default.
- No autoplay media.
- Responsive layout from the first pass.
- Images compressed to WebP/AVIF where possible.
- Cache rules defined.
- Lighthouse/static QA report included when appropriate.

## Security checklist

- HTTPS required.
- Content Security Policy defined.
- HSTS where appropriate.
- No secrets in source.
- No `.env` in repo.
- No cardholder data.
- No customer tracking unless explicitly approved.
- No Cloudflare Worker unless there is a server-side reason.

## Community use

This skill is intended for low-budget, high-need community work where speed and clarity matter more than fashionable stack choices. It is especially useful for local businesses, mutual aid groups, nonprofits, artists, land grant/community projects, and small teams that are overworked and do not need a complex CMS to publish clear information.

## Example one-liner

"We can build the first useful version fast because we keep the architecture honest: static first, HTTPS by default, no unnecessary backend, no overbuilt framework, and no hidden complexity."

## NUMARA KV1 note

Mode: KISS_OCCAM_FAST_RESPONSE
State: STATIC_FIRST
Risk posture: LOW_SURFACE_AREA
Default deployment: Cloudflare Pages or Netlify
Worker posture: HOLD unless server-side logic is required
Human gate: REQUIRED
