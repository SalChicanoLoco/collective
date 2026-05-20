import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentSchema } from '../src/schema';

// Lightweight stub for Hono app — full Worker integration tests use wrangler's
// vitest-pool-workers; these unit tests cover the logic layer directly.

const validDoc = {
  doc_id: 'worker-test-001',
  title_en: 'Worker Test',
  title_es: 'Prueba de Worker',
  metadata: {
    author: 'Test',
    organization: 'TestOrg',
    created_at: '2024-01-01T00:00:00Z',
  },
  template_config: { language_mode: 'bilingual' as const },
  sections: [
    {
      id: 'section-1',
      heading_en: 'Heading',
      heading_es: 'Encabezado',
      body_en: 'Body text here.',
      body_es: 'Texto del cuerpo aquí.',
      order: 0,
    },
  ],
};

describe('Schema validation (worker gate)', () => {
  it('parses a valid document successfully', () => {
    const result = DocumentSchema.safeParse(validDoc);
    expect(result.success).toBe(true);
  });

  it('returns structured errors for invalid input', () => {
    const result = DocumentSchema.safeParse({ doc_id: 'bad doc id!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = result.error.flatten();
      expect(flat.fieldErrors).toBeDefined();
    }
  });
});

describe('validate_parity logic', () => {
  function checkParity(doc: typeof validDoc, tolerance = 0.2) {
    return doc.sections
      .filter((s) => (s as any).char_count_parity !== false)
      .filter((s) => {
        const max = Math.max(s.body_en.length, s.body_es.length);
        return Math.abs(s.body_en.length - s.body_es.length) / max > tolerance;
      });
  }

  it('passes when bodies are within tolerance', () => {
    expect(checkParity(validDoc)).toHaveLength(0);
  });

  it('flags when bodies diverge beyond tolerance', () => {
    const divergent = {
      ...validDoc,
      sections: [
        {
          ...validDoc.sections[0],
          body_en: 'Short.',
          body_es: 'Este es un texto mucho más largo que el original en inglés y debería superar la tolerancia establecida del veinte por ciento.',
        },
      ],
    };
    expect(checkParity(divergent)).toHaveLength(1);
  });
});
