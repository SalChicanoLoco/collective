import { DocumentSchema, type Document } from './schema';
import { now } from './utils';
import type { Env, QueueMessage, ValidationResult } from './types';

const GEMINI_MODEL = 'gemini-2.0-flash';

// ─── Typst compilation ───────────────────────────────────────────────────────

async function compilePdf(doc: Document, typstApiUrl: string): Promise<Uint8Array> {
  const response = await fetch(`${typstApiUrl}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document: doc, template: 'nsf-sbir' }),
  });
  if (!response.ok) {
    throw new Error(`Typst compile failed (${response.status}): ${await response.text()}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

// ─── Gemini visual validation ────────────────────────────────────────────────

const VALIDATION_PROMPT = `You are a strict PDF quality-assurance validator.
Examine this generated PDF document for formatting quality.
Check: logo/header presence, text overflow, font consistency, margin alignment, bilingual block integrity.

Return ONLY valid JSON — no prose, no markdown fences:
{
  "match_confidence": 0.95,
  "critical_issues": [],
  "warnings": [],
  "overall_status": "PASS",
  "human_review_required": false
}
Status values: PASS | NEEDS_REVIEW | FAIL
FAIL if any critical issue exists. NEEDS_REVIEW if match_confidence < 0.90 or any non-critical issue.`;

async function validateWithGemini(pdfBytes: Uint8Array, apiKey: string): Promise<ValidationResult> {
  const base64 = btoa(String.fromCharCode(...pdfBytes));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: VALIDATION_PROMPT }] },
        contents: [
          {
            parts: [
              { text: 'Validate this generated PDF document for quality and formatting.' },
              { inline_data: { mime_type: 'application/pdf', data: base64 } },
            ],
          },
        ],
        generation_config: { response_mime_type: 'application/json' },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini validation failed (${response.status}): ${await response.text()}`);
  }

  const result = await response.json<{
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
  }>();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  const parsed = JSON.parse(text) as Partial<ValidationResult>;
  return {
    match_confidence: parsed.match_confidence ?? 0,
    critical_issues: parsed.critical_issues ?? ['Validation response malformed'],
    warnings: parsed.warnings ?? [],
    overall_status: parsed.overall_status ?? 'FAIL',
    human_review_required: parsed.human_review_required ?? true,
  };
}

// ─── Queue handler ───────────────────────────────────────────────────────────

export async function queueHandler(
  batch: MessageBatch<QueueMessage>,
  env: Env
): Promise<void> {
  for (const message of batch.messages) {
    const { job_id, doc_id } = message.body;

    try {
      // Mark processing
      await env.DB.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE job_id = ?')
        .bind('processing', now(), job_id)
        .run();

      // Load document
      const row = await env.DB.prepare('SELECT document_json FROM documents WHERE doc_id = ?')
        .bind(doc_id)
        .first<{ document_json: string }>();
      if (!row) throw new Error(`Document ${doc_id} not found in D1`);

      const doc = DocumentSchema.parse(JSON.parse(row.document_json));

      // Compile PDF via Typst
      const pdfBytes = await compilePdf(doc, env.TYPST_API_URL);

      // Store PDF in KV
      const pdfKey = `pdfs/${doc_id}/${job_id}.pdf`;
      await env.PDF_STORAGE.put(pdfKey, pdfBytes, {
        metadata: { doc_id, job_id, generated_at: now() },
      });

      // Validate with Gemini
      const validation = await validateWithGemini(pdfBytes, env.GEMINI_API_KEY);

      // Write validation log
      await env.DB.prepare(
        'INSERT INTO validation_log (job_id, layer, passed, issues, timestamp) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(
          job_id,
          'gemini-visual',
          validation.overall_status === 'PASS' ? 1 : 0,
          JSON.stringify(validation.critical_issues),
          now()
        )
        .run();

      // Update job with final status
      const finalStatus = validation.overall_status === 'FAIL' ? 'failed' : 'complete';
      await env.DB.prepare(
        'UPDATE jobs SET status = ?, pdf_url = ?, validation_result = ?, updated_at = ? WHERE job_id = ?'
      )
        .bind(finalStatus, pdfKey, JSON.stringify(validation), now(), job_id)
        .run();

      message.ack();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      await env.DB.prepare('UPDATE jobs SET status = ?, error = ?, updated_at = ? WHERE job_id = ?')
        .bind('failed', errorMsg, now(), job_id)
        .run();

      // Retry up to max_retries (configured in wrangler.toml)
      message.retry();
    }
  }
}

export default { queue: queueHandler };
