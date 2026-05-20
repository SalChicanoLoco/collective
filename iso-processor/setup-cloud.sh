#!/usr/bin/env bash
# One-time cloud bootstrap for iso-processor.
# Run ONCE from the iso-processor/ directory on your local machine.
#
# Prerequisites (all free):
#   wrangler installed & authenticated  →  wrangler login
#   gh CLI installed & authenticated    →  gh auth login
#
# Usage:
#   cd iso-processor
#   bash setup-cloud.sh
set -euo pipefail

REPO="SalChicanoLoco/collective"

# ── 1. Cloudflare resources ──────────────────────────────────────────────────

echo "==> [1/6] Creating Cloudflare Queue..."
wrangler queues create iso-processor-queue 2>&1 || echo "  (already exists — skipping)"

echo ""
echo "==> [2/6] Creating KV namespace for PDF storage..."
KV_OUTPUT=$(wrangler kv namespace create PDF_STORAGE 2>&1)
echo "$KV_OUTPUT"
KV_ID=$(echo "$KV_OUTPUT" | grep -oP '(?<="id": ")[a-f0-9]+' | head -1 || true)

echo ""
echo "==> [3/6] Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create iso-processor-db 2>&1)
echo "$D1_OUTPUT"
D1_ID=$(echo "$D1_OUTPUT" | grep -oP '(?<=database_id = ")[a-f0-9-]+' | head -1 || true)

# ── 2. Patch wrangler.toml ───────────────────────────────────────────────────

echo ""
if [[ -n "$KV_ID" && -n "$D1_ID" ]]; then
  echo "==> [4/6] Patching wrangler.toml..."
  sed -i "s/REPLACE_WITH_KV_NAMESPACE_ID/$KV_ID/" wrangler.toml
  sed -i "s/REPLACE_WITH_D1_DATABASE_ID/$D1_ID/"  wrangler.toml
  echo "  KV id  : $KV_ID"
  echo "  D1 id  : $D1_ID"
else
  echo "  ⚠️  Could not auto-parse resource IDs."
  echo "  Edit wrangler.toml manually before continuing:"
  echo "    REPLACE_WITH_KV_NAMESPACE_ID  →  (from KV output above)"
  echo "    REPLACE_WITH_D1_DATABASE_ID   →  (from D1 output above)"
  echo "  Then re-run this script."
  exit 1
fi

# ── 3. Apply DB schema ───────────────────────────────────────────────────────

echo ""
echo "==> [5/6] Applying D1 schema (remote)..."
wrangler d1 execute iso-processor-db --remote --file=schema.sql

# ── 4. Worker secrets ────────────────────────────────────────────────────────

echo ""
echo "==> [6/6] Setting Worker secrets..."
echo "  You'll be prompted for each value."
echo ""
echo "  GEMINI_API_KEY  → get free key at https://aistudio.google.com/app/apikey"
wrangler secret put GEMINI_API_KEY

echo ""
echo "  JWT_SECRET      → any strong random string (e.g. output of: openssl rand -hex 32)"
wrangler secret put JWT_SECRET

# ── 5. GitHub Actions secret ─────────────────────────────────────────────────

echo ""
echo "==> Setting CF_API_TOKEN in GitHub repo secrets..."
echo "  Create a Cloudflare API token at:"
echo "  https://dash.cloudflare.com/profile/api-tokens"
echo "  Required permissions: Workers Scripts:Edit, D1:Edit, KV Storage:Edit, Queue:Edit"
echo ""
echo -n "  Paste your CF_API_TOKEN: "
read -rs CF_API_TOKEN
echo ""
gh secret set CF_API_TOKEN --body "$CF_API_TOKEN" --repo "$REPO"
echo "  ✓ CF_API_TOKEN saved to GitHub secrets"

# ── 6. Commit patched wrangler.toml ──────────────────────────────────────────

echo ""
echo "==> Committing patched wrangler.toml..."
git add wrangler.toml
git commit -m "chore(iso-processor): add real Cloudflare resource IDs"
git push
echo "  ✓ Committed and pushed — deploy workflow will trigger on next push to main"

echo ""
echo "✅  All done! Push any change under iso-processor/ to main to deploy."
