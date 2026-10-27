# Sena Colectivo — Master Audit & Moving Forward Plan

**Date:** October 27, 2026  
**Active Branch:** `feature/publications-green-tech`  
**Repository:** `/Users/xavasena/collective` (`https://github.com/SalChicanoLoco/collective.git`)  
**Workspace Mirror:** `/Users/xavasena/collectivo`  

---

## 1. What Was Completed in This Session

### A. New Publications & Green Tech Branch
* Created and checked out `feature/publications-green-tech` based on `main`.
* Established the central BibTeX database: [`archive/green_tech.bib`](file:///Users/xavasena/collective/archive/green_tech.bib) with full entry for `Reolon2026_EnergyPlusWeather` and foundations (Belcher 2005, Jentsch 2008/2013, Eames 2011, Rodrigues 2023, Jia 2023, CIBSE TM59, IPCC AR6).

### B. Ingest of *Academia Green Energy* Paper
* **Paper:** *"A transparent workflow for future EnergyPlus Weather (EPW) files for building energy simulation"* (Reolon, Marengo, Picco, May 2026, DOI: [10.20935/AcadEnergy8325](https://doi.org/10.20935/AcadEnergy8325)).
* **Archival Engine Tool:** Built [`tools/archive_engine/archive_engine.py`](file:///Users/xavasena/collective/tools/archive_engine/archive_engine.py) with automated 4-pass `pdflatex` + `bibtex` multi-pass compilation.
* **Compiled Publication PDF:** Generated 2-page publication-grade PDF [`publications/future-weather-epw/future_weather_epw_brief.pdf`](file:///Users/xavasena/collective/publications/future-weather-epw/future_weather_epw_brief.pdf) (442 KB).
* **6-Part Web Publication Package** ([`docs/PUBLICATION_TAXONOMY.md`](file:///Users/xavasena/collective/docs/PUBLICATION_TAXONOMY.md)):
  1. [`index.html`](file:///Users/xavasena/collective/publications/future-weather-epw/index.html) — Hub
  2. [`newspaper.html`](file:///Users/xavasena/collective/publications/future-weather-epw/newspaper.html) — Broadsheet brief
  3. [`periodical.html`](file:///Users/xavasena/collective/publications/future-weather-epw/periodical.html) — Technical longform
  4. [`political-economics.html`](file:///Users/xavasena/collective/publications/future-weather-epw/political-economics.html) — Governance & policy brief
  5. [`calculations.html`](file:///Users/xavasena/collective/publications/future-weather-epw/calculations.html) — Mathematical & psychrometric spine
  6. [`sources.html`](file:///Users/xavasena/collective/publications/future-weather-epw/sources.html) — BibTeX ledger & DOI links
  7. [`publication-data.json`](file:///Users/xavasena/collective/publications/future-weather-epw/publication-data.json) — Structured metadata

### C. Immediate Triage & Fixes
* **SiteAnalysis infinite loop:** Removed duplicate `SiteAnalysis.html` and restored the working security & architecture audit tool in [`SiteAnalysis/index.html`](file:///Users/xavasena/collective/SiteAnalysis/index.html).

---

## 2. Repo Scrape & Deduplication Findings (The "GPT Patch Sprawl")

Our audit revealed significant fragmentation across past automated PR runs:

| Component | State / Issue | Culprit / Finding |
| :--- | :--- | :--- |
| **Greenhouse Calculator** | Fragmented into 3 competing folders | 1. `commons-greenhouse-calculator/`: full SVG engine & BOM, but orientation glitch.<br>2. `commons-greenhouse-calculator-secure/`: stripped-down rewrite with CSP.<br>3. `cgs-community-suite/`: inverted length/width axes in `renderer.js`. |
| **Site Navigation** | Broken uniformity across headers | `index.html`, `tools/index.html`, and `projects/index.html` have differing nav lists. |
| **Atencio Legal Records** | Cluttering the web root | `Atencio_Certification_of_Trust.html` & `Atencio_Trustee_Esign.html` remain in root despite `archive/atencio/README.md` mandate. |
| **Orphan Build Artifacts** | Stale external project copies | `dist/chuco-dev/` exists in repo despite `docs/canonical-lanes.json` declaring Chuco non-canonical here. |
| **Remote Branches** | 48 stale PR branches | Abandoned bot branches (`codex/*`, `claude/*`) cluttering GitHub remote. |

---

## 3. Concrete Action Plan Moving Forward

When you are ready to resume, follow these 4 phased steps:

### Phase 1: Consolidate & Fix the Greenhouse Calculator (Top Priority)
1. **Unify into one canonical home:** [`commons-greenhouse-calculator/`](file:///Users/xavasena/collective/commons-greenhouse-calculator/).
2. **Fix the geometry in SVG generation:**
   - Ensure Length = X axis, Width = Y axis.
   - Position the thermal mass barrel spine along the true North wall.
   - Align the longitudinal central access aisle cleanly between the two growing beds.
   - Render the cross-section with accurate earth berm height, sunken trench depth, and sub-soil geothermal air tube.
3. **Harmonize BOM & Costing:** Preserve the dynamic 3-tier build profile (Scrappy Salvage, Balanced Low-Cost, Upgraded Kit).
4. **Clean redirects:** Update `/commons-greenhouse-calculator-secure/` and `/cgs-community-suite/` to redirect cleanly to `/commons-greenhouse-calculator/` so no external links or bookmarks break.

### Phase 2: Site Cleanup & Deduplication
1. Move `Atencio_Certification_of_Trust.html` and `Atencio_Trustee_Esign.html` into `archive/atencio/`.
2. Delete orphaned `dist/chuco-dev/`.
3. Clean up `biblioteca-worker/biblioteca-app-clean.html` (legacy duplicate of `biblioteca/index.html`).

### Phase 3: Fix `senacolectivo.com` Navigation & Consistency
1. Align the header navigation across all pages to the canonical 5-item menu:
   - **Home** (`/`)
   - **Publications** (`/publications/`)
   - **Tools & Greenhouse** (`/tools/`)
   - **Projects** (`/projects/`)
   - **La Biblioteca** (`/biblioteca/`)
   - **Site Audit** (`/SiteAnalysis/`)
2. Verify language toggle (`EN` / `ES`) states persist across page transitions via `localStorage['sena_lang']`.
3. Update homepage cards to feature both the **Future Weather EPW Morphing** publication and the **Commons Greenhouse Calculator**.

### Phase 4: Stale Branch Pruning
1. Review [`scripts/branch_prune_plan.sh`](file:///Users/xavasena/collective/scripts/branch_prune_plan.sh).
2. Execute the remote branch prune command on GitHub to eliminate the 48 stale automated bot branches.

---

*Plan prepared and saved on branch `feature/publications-green-tech`.*
