# Cloudflare Agent Bootstrap Prompt

Copy everything between START and END and paste it into the Cloudflare AI agent.

---START---

You are fully setting up a Cloudflare Workers project called **iso-processor**.
Do every step in order. Do not ask me to run any terminal commands. Handle everything through the Cloudflare API and GitHub API.

## Account
Account ID: `8ebf20b18b7419bbfdb87e18038867b4`  
GitHub repo: `SalChicanoLoco/collective`  
Branch: `claude/generate-schema-template-Ez5Lu`

---

## Step 1 — Create Cloudflare resources

Using the Cloudflare API for account `8ebf20b18b7419bbfdb87e18038867b4`, create:

1. **Queue** named `iso-processor-queue`
2. **KV namespace** named `PDF_STORAGE`
3. **D1 database** named `iso-processor-db`

Save all three IDs.

---

## Step 2 — Patch wrangler.toml in GitHub

Edit `iso-processor/wrangler.toml` in repo `SalChicanoLoco/collective` on branch `claude/generate-schema-template-Ez5Lu`.

Make these two replacements:
- `REPLACE_WITH_KV_NAMESPACE_ID` → the KV namespace ID from Step 1
- `REPLACE_WITH_D1_DATABASE_ID` → the D1 database ID from Step 1

Commit message: `chore(iso-processor): add real Cloudflare resource IDs`

---

## Step 3 — Apply D1 schema

Fetch the file `iso-processor/schema.sql` from the repo and execute all of its SQL statements against the `iso-processor-db` D1 database you created in Step 1.

---

## Step 4 — Set Worker secrets via Cloudflare API

Use the Cloudflare Workers Secrets API to set these three secrets on the Worker named `iso-processor` in account `8ebf20b18b7419bbfdb87e18038867b4`:

**Secret 1 — JWT_SECRET**  
Generate a cryptographically random 64-character hex string yourself and use it as the value. Show me the first 8 characters only so I can verify it was set.

**Secret 2 — GEMINI_API_KEY**  
Ask me to paste my Gemini API key directly into this chat. Then set it as the secret. Do not echo it back to me.

**Secret 3 — TYPST_API_URL** (not secret but set as a var)  
Value: `https://api.typst.app`

---

## Step 5 — Create Cloudflare API token and set GitHub secret

Create a scoped Cloudflare API token with these permissions:
- Workers Scripts: Edit
- D1: Edit  
- KV Storage: Edit
- Queues: Edit

Then set it as a GitHub Actions secret in repo `SalChicanoLoco/collective`:
- Secret name: `CF_API_TOKEN`
- Secret value: the token you just created

---

## Step 6 — Confirm everything

Reply with a checklist:
- [ ] Queue `iso-processor-queue` created (show ID)
- [ ] KV namespace `PDF_STORAGE` created (show ID)
- [ ] D1 database `iso-processor-db` created (show ID)
- [ ] `wrangler.toml` patched and committed to branch
- [ ] D1 schema applied
- [ ] Worker secret `JWT_SECRET` set (show first 8 chars)
- [ ] Worker secret `GEMINI_API_KEY` set
- [ ] GitHub secret `CF_API_TOKEN` set

---END---
