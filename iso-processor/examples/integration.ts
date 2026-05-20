/**
 * Integration example: submit a document and wait for the PDF.
 * Run with: npx ts-node examples/integration.ts
 */

import { ISOProcessorClient } from '../src/client';
import * as fs from 'fs';
import * as path from 'path';

const WORKER_URL = process.env.WORKER_URL ?? 'http://localhost:8787';

async function main() {
  const client = new ISOProcessorClient({ workerUrl: WORKER_URL });

  // 1. Authenticate
  console.log('Authenticating...');
  await client.authenticate({
    username: process.env.ISO_USERNAME ?? 'admin',
    password: process.env.ISO_PASSWORD ?? 'changeme',
  });

  // 2. Load example document
  const documentJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'document.json'), 'utf8')
  );

  // 3. Submit and wait
  console.log('Submitting document...');
  const result = await client.submitAndWait(documentJson, {
    pollIntervalMs: 2000,
    timeoutMs: 60_000,
    onProgress: (s) => console.log(`  status: ${s.status}`),
  });

  // 4. Report
  if (result.status === 'complete') {
    console.log('✅ Done!');
    console.log('  PDF URL:', result.pdf_url);
    console.log('  Validation:', JSON.stringify(result.validation_result, null, 2));
  } else {
    console.error('❌ Failed:', result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
