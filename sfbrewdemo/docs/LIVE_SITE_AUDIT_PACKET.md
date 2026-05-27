# Live Site Audit Packet — SFBC Demo

## Live URL

https://sfbrew.senacolectivo.com/

## Deployment model

- Platform: Cloudflare Pages
- Repository: SalChicanoLoco/collective
- Output directory: sfbrewdemo/site
- Access-control target: Cloudflare Access, not frontend passcodes

## Current posture

- Static-first site
- HTTPS target
- No Worker code required
- No payment handling
- No POS integration
- No customer tracking
- No secrets in source
- No database dependency
- No forms or submission endpoint

## Lighthouse / QA status

A Lighthouse/static QA packet was prepared during the build process. Final Lighthouse scores should be generated against the live deployed URL after Cloudflare custom domain and Cloudflare Access configuration settle.

Do not claim final Lighthouse scores until the live URL has been tested.

## Brian/Jenna-safe phrasing

Built to pass Lighthouse and security review using a small static architecture. Final scores should be generated against the live Cloudflare URL once access configuration is complete.

## Recommended live audit steps

1. Confirm https://sfbrew.senacolectivo.com/ loads.
2. Confirm Cloudflare Access protects the domain if privacy is required.
3. Run Lighthouse against the live URL.
4. Save HTML and JSON reports.
5. Confirm headers with browser devtools or curl.
6. Confirm no third-party trackers or payment scripts.
7. Confirm no Worker route is attached unless explicitly needed.

## Header checks expected

- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- X-Frame-Options or frame-ancestors in CSP

## Plain-English result target

Fast, readable, inspectable, static, secure-by-default, and easy to maintain.
