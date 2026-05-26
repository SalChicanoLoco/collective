# Sena Colectivo redesign spec

## Mode
Feature branch: `feature/site-design-system`

This redesign is controlled. It does not hot-migrate production hosting, touch Merc Mercado, or delete archived legal material.

## Public positioning
Sena's AI Collective / Sena Colectivo is an AI systems and civic-technology studio rooted in New Mexico.

Grant writing is a service, not the core identity.

Public-facing pillars:

1. AI systems architecture
2. Bilingual publication infrastructure
3. Civic and community technology
4. Local marketplace and small-business platforms
5. Research-to-publication workflows
6. Custom AI tools, skills, and operating patterns
7. Cloudflare-ready web deployment
8. Human-reviewed automation

## Portfolio proof
Surface these as proof of work:

- Merc Mercado: local handmade marketplace and high-performance Cloudflare/Astro reference project
- NewMexicoSocialists.org renovation: civic publishing and organizing site work
- Fish tank / axolotl demo: interactive care/game and public education experiment
- AI ecosystem enhancements: custom tools, skills, workflows, cockpit/lane orchestration, AI operating-system style patterns
- AI data-center publication system: newspaper, periodical, political brief, calculation spine

## Rebrand guidance
Do not over-center NUMARA in public copy. Treat it as internal or legacy architecture language unless explicitly revived.

Explore broader public terms:

- Sena Core
- Colectivo Core
- Civic Compute Studio
- Mesa Systems
- Acequia Systems
- Fieldwork AI
- La Maquina Colectiva

## Bilingual operations
No mixed-language default mode.

Required:
- clear EN/ES toggle
- persistent language preference
- Spanish and English content blocks or language-specific routes
- correct `html lang`
- SEO-safe metadata strategy
- bilingual-ready documents, forms, and publication templates

Preferred long-term architecture:

1. SEO-critical pages use static bilingual routes.
2. Transitional static pages can use the shared language toggle.
3. Cloudflare Worker later handles language redirects, cookies, and edge headers.
4. Canonical publication translations must be reviewed, not generated live at request time.

## Lighthouse targets
Target 95+ on:

- Performance
- Accessibility
- Best Practices
- SEO

Security/header goals:

- HTTPS only
- strict transport security when on Cloudflare
- conservative CSP where feasible
- no unnecessary third-party scripts
- no mixed content
- no exposed secrets
- static pages must remain crawlable and fast

## Static-first implementation
Current repo is static HTML. Refactor first:

- `/assets/css/site.css`
- `/assets/js/site.js`
- semantic HTML
- shared navigation
- shared footer
- print CSS
- portfolio copy
- publication taxonomy

Only after static refactor should we evaluate Cloudflare migration.

## Cloudflare migration target
Future target is Cloudflare Pages/Workers.

Merc Mercado may be inspected as a reference only. Do not modify it.

Potential future Cloudflare responsibilities:

- edge security headers
- language redirects
- redirects/rewrites
- R2 PDF/media downloads if archive grows
- analytics-compatible static performance

## Archive rule
Atencio/Alicia work is archived from active public navigation.

Do not promote it as part of Sena Colectivo's public redesign. Keep records safe.

## Acceptance criteria for this branch

- Shared CSS exists.
- Shared bilingual toggle exists.
- Homepage uses shared system.
- Homepage has stronger SEO and positioning copy.
- Atencio archive note exists.
- No Merc Mercado changes.
- No hosting migration.
- No PDF binary churn.
