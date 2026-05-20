# Cloudflare Agent Bootstrap Prompt

Copy everything between the START and END lines and paste it into the Cloudflare AI agent.

---START---

You are setting up a Cloudflare Workers project called **iso-processor** in the
GitHub repo **SalChicanoLoco/collective**. Do each step in order. Confirm each
one before moving to the next.

## Account
Account ID: `8ebf20b18b7419bbfdb87e18038867b4`

## Step 1 — Create cloud resources

Create these three resources in account `8ebf20b18b7419bbfdb87e18038867b4`:

1. **Queue** named `iso-processor-queue`
2. **KV namespace** named `PDF_STORAGE`
3. **D1 database** named `iso-processor-db`

Save the IDs you get back. You will need them in Step 2.

## Step 2 — Update wrangler.toml in GitHub

In the repo `SalChicanoLoco/collective`, edit the file
`iso-processor/wrangler.toml`.

Replace:
- `REPLACE_WITH_KV_NAMESPACE_ID` → the KV namespace ID from Step 1
- `REPLACE_WITH_D1_DATABASE_ID` → the D1 database ID from Step 1

Commit the file with message: `chore(iso-processor): add real Cloudflare resource IDs`

Push to branch `claude/generate-schema-template-Ez5Lu`.

## Step 3 — Apply D1 schema

Run this SQL against the `iso-processor-db` D1 database you just created.
The file is at `iso-processor/schema.sql` in the repo. Execute all statements.

## Step 4 — Set GitHub Actions secret

Create a Cloudflare API token with these permissions:
- Workers Scripts: Edit
- D1: Edit
- KV Storage: Edit
- Queues: Edit

Then set it as a GitHub Actions secret in repo `SalChicanoLoco/collective`:
- Secret name: `CF_API_TOKEN`
- Secret value: the token you just created

## Step 5 — Confirm

Tell me:
- Queue name and status
- KV namespace ID
- D1 database ID
- That wrangler.toml was committed to the branch
- That CF_API_TOKEN secret is set on the GitHub repo

---END---
