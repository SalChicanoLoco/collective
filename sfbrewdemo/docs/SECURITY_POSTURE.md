# Security Posture — SFBC KV1 Demo

## Main principle

Reduce moving parts before adding intelligence.

## HTTPS

Recommended hosting: Netlify or Cloudflare Pages for static deployment with automatic TLS and edge headers. GitHub Pages can be used for quick demo hosting and HTTPS, but full header enforcement is better through Cloudflare or Netlify.

## Recommended headers

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
```

## Scope boundaries

- No cardholder data.
- No checkout implementation.
- No POS replacement.
- No facial recognition.
- No customer tracking.
- No automatic publishing.

## BrewOS approach

BrewOS should be treated as legacy business infrastructure. Proposed first actions:

1. Inventory machine, OS, dependencies, network exposure, database/storage, and backups.
2. Create a backup and rollback plan before modification.
3. Segment network exposure where feasible.
4. Virtualize only after a working backup and restore test.
5. Build reporting and operational augmentation outside payment scope first.

## PCI language

The public website demo and manager cockpit should stay outside payment-card scope. If future work touches cardholder-data environment boundaries, pause for PCI scope definition and payment-provider review.
