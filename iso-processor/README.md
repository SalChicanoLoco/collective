# ISO Processor

Isomorphic, cost-free bilingual document generator. Separates text generation
(LLM) from rendering (Typst) with Cloudflare Workers edge compute and Gemini
multimodal validation.

## Architecture

```
Claude API          →  structured JSON (prose + translations)
Cloudflare Worker   →  validates schema, queues job, returns doc_id
Cloudflare Queue    →  background compile
Typst               →  deterministic PDF from JSON
Gemini Flash        →  visual diff validation
Cloudflare KV/D1    →  PDF storage + immutable audit log
```

## Stack (all free tier)

| Layer | Service |
|-------|---------|
| Compute | Cloudflare Workers |
| Queue | Cloudflare Queues |
| Storage | Cloudflare KV + D1 |
| PDF render | Typst |
| LLM (brain) | Claude API |
| LLM (eyes) | Gemini 2.0 Flash |

## Deploy (Cloudflare Git integration)

Pushes to `main` that touch `iso-processor/**` trigger the GitHub Actions workflow
(`.github/workflows/iso-processor-deploy.yml`) automatically — no manual `wrangler deploy` needed.

### One-time bootstrap (run locally, once)

```bash
cd iso-processor

# 1. Install wrangler and log in
npm install
wrangler login

# 2. Create cloud resources, patch wrangler.toml, set secrets
bash setup-cloud.sh

# 3. Commit the patched wrangler.toml (IDs are non-secret)
git add wrangler.toml && git commit -m "chore: add real CF resource IDs"

# 4. Add CF_API_TOKEN to GitHub repo secrets
#    GitHub → Settings → Secrets → Actions → New secret
#    Name: CF_API_TOKEN   Value: (Cloudflare API token with Workers:Edit permission)
```

After that, every `git push origin main` with a change under `iso-processor/` deploys automatically.

### Local dev

```bash
npm run dev              # wrangler dev on :8787
npm test                 # unit tests
WORKER_URL=http://localhost:8787 npx vitest run tests/e2e.test.ts  # e2e
```

## Test Typst template locally

```bash
brew install typst
cp examples/document.json src/templates/document.json
typst compile src/templates/nsf-sbir.typst output.pdf
open output.pdf
```

## API

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /auth` | none | Exchange credentials for JWT |
| `GET /tools` | none | MCP tool discovery |
| `POST /process` | JWT | Submit document, returns 202 + job_id |
| `POST /mcp-tool` | JWT | Execute MCP tool (read_section, validate_parity, render) |
| `GET /status/:job_id` | JWT | Poll job status |

## File structure

```
iso-processor/
├── schema.sql                    # D1 tables
├── wrangler.toml                 # Worker config
├── src/
│   ├── schema.ts                 # Zod document schema (shared source of truth)
│   ├── types.ts                  # Cloudflare Worker env + shared types
│   ├── utils.ts                  # JWT sign/verify (Web Crypto, no deps)
│   ├── worker.ts                 # Hono app + queue export
│   ├── queue-consumer.ts         # Typst compile + Gemini validate
│   ├── client.ts                 # PWA/Tauri fetch client
│   ├── templates/
│   │   └── nsf-sbir.typst        # NSF SBIR Phase I bilingual template
│   └── prompts/
│       └── visual-diff.md        # Gemini system prompt
├── tests/
│   ├── schema.test.ts
│   ├── worker.test.ts
│   └── e2e.test.ts
└── examples/
    ├── document.json             # Sample NSF SBIR document
    └── integration.ts            # Full pipeline example
```

## Success criteria

- [ ] Schema validates sample documents without error
- [ ] Typst template compiles JSON → readable bilingual PDF
- [ ] Visual Diff prompt returns structured JSON validation
- [ ] Worker accepts `POST /process`, returns 202 with job_id
- [ ] Queue consumer compiles async without blocking CPU
- [ ] D1 stores immutable audit trail per job
- [ ] Client library polls until completion
- [ ] End-to-end: JSON → final PDF in < 30 seconds
