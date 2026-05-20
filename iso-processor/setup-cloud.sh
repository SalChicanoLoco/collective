#!/usr/bin/env bash
# One-time cloud resource bootstrap for iso-processor.
# Run this ONCE from your local machine before the first git-push deploy.
# Prerequisites: wrangler installed and authenticated (wrangler login)
set -euo pipefail

ACCOUNT_ID="8ebf20b18b7419bbfdb87e18038867b4"
WORKER_NAME="iso-processor"

echo "==> Creating Cloudflare Queue..."
wrangler queues create iso-processor-queue || echo "  (already exists, skipping)"

echo ""
echo "==> Creating KV namespace for PDF storage..."
KV_OUTPUT=$(wrangler kv namespace create PDF_STORAGE 2>&1)
echo "$KV_OUTPUT"
KV_ID=$(echo "$KV_OUTPUT" | grep -oE '"id": "[a-f0-9]+"' | head -1 | grep -oE '[a-f0-9]{32}' || true)

echo ""
echo "==> Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create iso-processor-db 2>&1)
echo "$D1_OUTPUT"
D1_ID=$(echo "$D1_OUTPUT" | grep -oE 'database_id = "[a-f0-9-]+"' | head -1 | grep -oE '[a-f0-9-]{36}' || true)

echo ""
if [[ -n "$KV_ID" && -n "$D1_ID" ]]; then
  echo "==> Patching wrangler.toml with real resource IDs..."
  sed -i "s/REPLACE_WITH_KV_NAMESPACE_ID/$KV_ID/" wrangler.toml
  sed -i "s/REPLACE_WITH_D1_DATABASE_ID/$D1_ID/" wrangler.toml
  echo "  KV id  : $KV_ID"
  echo "  D1 id  : $D1_ID"
  echo ""
  echo "  wrangler.toml updated. Commit the change before pushing."
else
  echo "  Could not auto-parse IDs. Update wrangler.toml manually:"
  echo "    REPLACE_WITH_KV_NAMESPACE_ID  →  (from KV output above)"
  echo "    REPLACE_WITH_D1_DATABASE_ID   →  (from D1 output above)"
fi

echo ""
echo "==> Applying D1 schema..."
wrangler d1 execute iso-processor-db --remote --file=schema.sql

echo ""
echo "==> Setting secrets (you will be prompted for each value)..."
wrangler secret put GEMINI_API_KEY
wrangler secret put JWT_SECRET

echo ""
echo "✅  Cloud resources ready. Push to main to trigger the first deploy."
