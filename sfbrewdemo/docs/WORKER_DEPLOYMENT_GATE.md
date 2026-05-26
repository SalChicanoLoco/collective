# Worker Deployment Gate — SFBC KV1

## Status

Do not deploy this package to Cloudflare Workers yet. This package is static-site safe and should be deployed first as static assets on Netlify, Cloudflare Pages, or GitHub Pages.

## Findings

- No `wrangler.toml`.
- No Worker entrypoint.
- No KV namespace binding.
- No D1 binding.
- No R2 binding.
- No Durable Object binding.
- No `.env` file.
- No secrets in repo files.
- No outbound `fetch()` calls in site JavaScript.
- No payment code.
- No customer tracking code.
- No analytics pixel.
- No form submission endpoint.
- No POS integration.

## One issue corrected in the full local packet

The age/responsibility gate originally used static `innerHTML`. It did not include user input, but the full v3 packet replaces it with explicit DOM creation before any edge deployment path.

## Required before Worker use

1. A separate Worker package folder.
2. A reviewed `wrangler.toml`.
3. No secrets in source.
4. Read-only API keys via environment variables only.
5. Explicit CSP/headers at the Worker response layer.
6. A deny-by-default route map.
7. No POS or cardholder-data access without a separate PCI scope review.
8. Git diff review before deploy.

## Recommendation

Use this package as a static HTTPS demo first. Do not put it on a Worker unless there is a specific server-side reason.
