#!/usr/bin/env bash
# Sets Worker runtime secrets AFTER the Cloudflare agent has run.
# Run from iso-processor/ directory.
#
# Prerequisite: wrangler login
set -euo pipefail

echo "==> Setting Worker secrets..."
echo ""
echo "  GEMINI_API_KEY — free key at https://aistudio.google.com/app/apikey"
wrangler secret put GEMINI_API_KEY

echo ""
echo "  JWT_SECRET — any strong random string (e.g.: openssl rand -hex 32)"
wrangler secret put JWT_SECRET

echo ""
echo "✅  Secrets set. Push to main to trigger the deploy."
