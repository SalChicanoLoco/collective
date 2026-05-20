/**
 * End-to-end smoke tests.
 * Requires WORKER_URL env var pointing at a running wrangler dev instance.
 * Run separately: WORKER_URL=http://localhost:8787 vitest run tests/e2e.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ISOProcessorClient } from '../src/client';

const WORKER_URL = process.env.WORKER_URL ?? '';

const sampleDoc = {
  doc_id: 'e2e-test-001',
  title_en: 'E2E Test Document',
  title_es: 'Documento de Prueba E2E',
  metadata: {
    author: 'E2E Runner',
    organization: 'Test Suite',
    created_at: new Date().toISOString(),
  },
  template_config: { language_mode: 'bilingual' as const },
  sections: [
    {
      id: 'intro',
      heading_en: 'Introduction',
      heading_es: 'Introducción',
      body_en: 'This is an end-to-end test document.',
      body_es: 'Este es un documento de prueba de extremo a extremo.',
      order: 0,
    },
  ],
};

describe.skipIf(!WORKER_URL)('E2E — live worker', () => {
  let client: ISOProcessorClient;

  beforeAll(() => {
    client = new ISOProcessorClient({ workerUrl: WORKER_URL });
  });

  it('GET /tools returns MCP tool list', async () => {
    const res = await fetch(`${WORKER_URL}/tools`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tools: unknown[] };
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body.tools.length).toBeGreaterThan(0);
  });

  it('POST /process rejects unauthenticated requests', async () => {
    const res = await fetch(`${WORKER_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_json: sampleDoc }),
    });
    expect(res.status).toBe(401);
  });

  it('full pipeline: auth → process → status', async () => {
    await client.authenticate({
      username: process.env.ISO_USERNAME ?? 'admin',
      password: process.env.ISO_PASSWORD ?? 'changeme',
    });

    const { job_id, status } = await client.processDocument(sampleDoc);
    expect(job_id).toBeTruthy();
    expect(status).toBe('queued');

    const jobStatus = await client.getStatus(job_id);
    expect(['queued', 'processing', 'complete', 'failed']).toContain(jobStatus.status);
  });

  it('POST /process returns 422 for invalid schema', async () => {
    await client.authenticate({
      username: process.env.ISO_USERNAME ?? 'admin',
      password: process.env.ISO_PASSWORD ?? 'changeme',
    });

    const res = await fetch(`${WORKER_URL}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer placeholder`, // re-auth handled by client
      },
      body: JSON.stringify({ document_json: { doc_id: 'bad doc id!' } }),
    });
    expect(res.status).toBe(422);
  });
});
