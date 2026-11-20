# Sena Colectivo — Architecture, Edge AI & Operations Guide

**Repository:** `https://github.com/SalChicanoLoco/collective`  
**Active Branch:** `feat/senacolectivo-worker-site`  
**Staging:** `https://test.senacolectivo.com` (`wrangler.test.jsonc` → Worker `senacolectivo-test`)  
**Production:** `https://senacolectivo.com` (`wrangler.jsonc` → Worker `senacolectivo-site`)  
**Contact:** `salvadorsena@senacolectivo.com` · `(505) 451-9341`

---

## 1. Stack & File Layout

- **Astro 5 (Static Output):** `src/pages/` compiles into `./dist/` with zero client-side framework bloat.
  - Shared shell: `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`
  - Canonical page blocks: `src/components/PageHero.astro`, `src/components/Card.astro`
  - Bundled CSS: `src/styles/global.css` (`HUD | Earth | CAD` themes via `data-theme` on `<html>`)
  - Legacy static subpage theme bridge: `public/assets/css/subpage-theme.css` + `public/assets/js/site.js`
- **Cloudflare Worker (`worker/index.ts`):**
  - Serves `./dist` via `env.ASSETS` (so `archive/`, `private/`, `docs/`, `scripts/` are **never** deployed).
  - Enforces security headers via `public/_headers` (for static assets) and `withSecurityHeaders()` (for Worker routes).
  - `PUBLIC_MAINTENANCE=true` switches `/` and `Header.astro` to the Maintenance-in-Progress landing page.

---

## 2. How the Edge AI & Delta Quadrant Substrate Works

### A. Public Bilingual Edge Concierge (`POST /api/ask`)
1. Browser submits `{ question }` (`1–300` chars) via `public/assets/js/ask.js` (no inline JS; strict `script-src 'self'` CSP).
2. `worker/index.ts` runs `hasInjectionSignal(question)` (`worker/substrate.ts`), blocking prompt-injection/command-lure payloads (`403`).
3. Worker calls **Cloudflare Workers AI** (`env.AI.run('@cf/meta/llama-3.2-3b-instruct', ...)`), grounded by `COLLECTIVE_SYSTEM_PROMPT` with verified facts (consulting since 2003, Merc Mercado `$2,500` / `$1,000` floor, `salvadorsena@senacolectivo.com`, `(505) 451-9341`).
4. If `env.AI` is unbound or fails, it returns a deterministic fallback response (`mode: "fallback"`).

### B. Collective-Substrate (`Delta Quadrant`) 3-Tier API (`worker/substrate.ts`)
- **Tier 1 — Deterministic Kernel (`POST /api/substrate/greenhouse` or `/api/delta/greenhouse`):**
  - Pure TypeScript bounds validation (`Number.isFinite`, range checks) and exact greenhouse math (area, hoops, anchors, bed width, thermal mass `gal` / `BTU/°F`, 3-tier cost). Zero LLM arithmetic.
- **Tier 2 — Edge Workers AI (`@cf/meta/llama-3.2-3b-instruct`):**
  - Low-latency edge inference and automatic fallback if Tier 3 is offline.
- **Tier 3 — Custom LM (`POST /api/substrate/infer` or `/api/delta/infer`):**
  - **Fail-closed gate:** Requires `Authorization: Bearer <SUBSTRATE_TOKEN>` (`503` if unconfigured, `401` if invalid).
  - When `CUSTOM_LM_URL` (and optional `CUSTOM_LM_TOKEN`) are set via `wrangler secret put`, forwards `{ prompt, context }` with a `6s` `AbortController` timeout, falling back to Tier 2 if unreachable.

### C. Wiring Your Custom LM Later
```bash
wrangler secret put SUBSTRATE_TOKEN   # Bearer token for /api/substrate/infer & /api/audit
wrangler secret put CUSTOM_LM_URL     # HTTPS endpoint (e.g. cloudflared tunnel to local Metal or Cloud Run)
wrangler secret put CUSTOM_LM_TOKEN   # Optional auth token for your custom LM endpoint
```

---

## 3. Greenhouse CAD Studio (`/commons-greenhouse-calculator-secure/`)

- **3D Viewport (`public/assets/js/greenhouse-cad.js`):** Interactive canvas with full `-1.55..1.57` pitch orbit, zoom, wireframe toggle, and **Iso / Top / Front (South) / Side (East)** presets.
- **2D CAD Blueprints:** Theme-synced Plan (`1 ft` minor / `4 ft` major grid, double walls, circular 55-gal barrel symbols, `H1..Hn` stations, witness + dimension lines, title block) and Cross-Section (`±0.0'` grade, berm, trench, 50° glazing, geothermal tube).
- **Exports & Validation:**
  - `Export 3D Printable .STL (1:50)` + `Validate .STL Mesh` (checks finite coords, degenerate triangles, 2-manifold watertight `0` open edges, `220×220×250 mm` bed fit).
  - `Export 2D CAD .DXF` (layered `WALLS`, `AISLE`, `GROW_BEDS`, `NORTH_BARRELS`).
  - `Export Plotter .PLT (HPGL)` (`1016 units/in`, `1:48` `1/4"=1'-0"`) + `Print Blueprint (Arch-D)` (`36×24 in` landscape).

---

## 4. Common Commands

```bash
# Build & typecheck
ASTRO_TELEMETRY_DISABLED=1 npm run build
ASTRO_TELEMETRY_DISABLED=1 npm run typecheck

# Deploy staging (test.senacolectivo.com)
wrangler deploy --config wrangler.test.jsonc

# Deploy production (senacolectivo.com)
wrangler deploy

# JiT HITL-gated headless Chrome QC (fail-closed by default)
QC_HITL_TOKEN=HITL-... QC_ALLOW_ORIGIN=https://test.senacolectivo.com npm run qc
```
