# Muse Image Generation Prompt Pack — Sena Colectivo

Use this brief with your Muse API agent to generate cohesive hero images and section backgrounds for `senacolectivo.com`.

---

## Technical & Brand Constraints (Mandatory)

- **Output directory:** `public/assets/img/`
- **Format & Size:** `.webp` (quality 82–88), target **≤ 150 KB** per image.
  - Hero / section backgrounds: `1920×1080` (16:9)
  - Social `og:image`: `1200×630`
- **Palette Harmony (must read cleanly under both `HUD` and `Earth` themes):**
  - Ground: deep obsidian slate `#070a0f` to warm desert earth `#0f0c08`
  - Accents: restrained ice cyan `#4cc9f0` and warm amber/gold `#e8a825` / `#f4a261`
- **Hard Exclusions:**
  - **NO** text, letters, numbers, logos, watermarks, or UI chrome inside the image.
  - **NO** generic purple/magenta AI gradients, cyberpunk neon clutter, or glowing brains.
  - Keep **30–40% negative space** on the left or center so overlaid typography stays high-contrast.

---

## Prompt 1 — Homepage Hero (`public/assets/img/hero-graph-mesa.webp`, `1920×1080`)

> Minimalist architectural photography meets precision telemetry: a wide twilight silhouette of a Northern New Mexico high-desert mesa under a deep obsidian-slate sky (`#070a0f`). Subtle, ultra-fine geometric constellation lines and small glowing nodes in ice cyan (`#4cc9f0`) and warm amber (`#e8a825`) trace topographic contours across the upper right sky, leaving clean dark negative space on the left. Crisp, restrained, Starfleet-bridge tactical aesthetic, no text, no logos, photorealistic lighting, 16:9.

---

## Prompt 2 — Constellation Mesh Background (`public/assets/img/hero-graph-constellation.webp`, `1920×1080`)

> Ultra-clean dark engineering background (`#070a0f` to `#0d131c`). Faint orthogonal architectural drafting grid at 5% opacity with a sparse, balanced network of thin cyan (`#4cc9f0`) and warm amber (`#f4a261`) vector-like filaments and tiny precision nodes drifting toward the right edge. High negative space, subtle depth of field, zero clutter, no text, no glowing orbs, 16:9.

---

## Prompt 3 — Desert Mesa Network (`public/assets/img/hero-mesa-network.webp`, `1920×1080`)

> Wide-angle twilight landscape of Northern New Mexico arroyos and basalt mesas in deep earth tones (`#0f0c08`), overlaid with ultra-thin golden-amber (`#e8a825`) geodesic survey lines and subtle elevation ticks along the ridge. Calm, authoritative, civic-infrastructure mood, dark foreground for clean white/sand text contrast, no text, no watermarks, 16:9.

---

## Prompt 4 — Greenhouse CAD Studio Visual (`public/assets/img/greenhouse-cad-hero.webp`, `1920×1080`)

> Architectural visualization of a passive-solar sunken pit greenhouse with a compacted earth berm on the north side and angled south glazing in the New Mexico high desert at blue hour. Half photorealistic earth-and-timber structure, half crisp cyan (`#4cc9f0`) and amber (`#e8a825`) CAD wireframe blueprint projection on a dark `#070a0f` background. Clean engineering aesthetic, no text, no labels, 16:9.

---

## Prompt 5 — Arid Infrastructure / Publications (`public/assets/img/arid-datacenter-hero.webp`, `1920×1080`)

> Stark, minimalist editorial photograph of a desert horizon in New Mexico at dusk with subtle solar arrays and distant power transmission silhouettes against a deep slate-indigo sky (`#070a0f`), accented by faint cyan (`#4cc9f0`) topographic contour lines. Serious, documentary, zero hype, no text, 16:9.

---

## Prompt 6 — OpenGraph Social Card (`public/assets/img/og-share.webp`, `1200×630`)

> Minimalist dark obsidian (`#070a0f`) and desert earth (`#0f0c08`) abstract horizon with a clean, balanced geometric network of fine cyan (`#4cc9f0`) and gold (`#e8a825`) lines along the lower third, leaving the upper two-thirds open and dark. No text, no logos, sharp, 1200×630.

---

## Agent Integration Checklist

1. Save generated files into `public/assets/img/` using the exact filenames above.
2. Verify every file is valid WebP and ≤ 150 KB (`ls -lh public/assets/img/`).
3. Keep explicit `width` and `height` attributes on every `<img>`, `fetchpriority="high"` on the hero image, and `loading="lazy" decoding="async"` on below-fold images.
4. If adding `og:image` in `src/layouts/BaseLayout.astro`, point it to `https://senacolectivo.com/assets/img/og-share.webp`.
5. Run `ASTRO_TELEMETRY_DISABLED=1 npm run build` and `ASTRO_TELEMETRY_DISABLED=1 npm run typecheck` before deploying.
