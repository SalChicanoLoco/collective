import { describe, it, expect } from 'vitest';
import { DocumentSchema, SectionSchema, AssetSchema, TemplateConfigSchema } from '../src/schema';

const validSection = {
  id: 'intro',
  heading_en: 'Introduction',
  heading_es: 'Introducción',
  body_en: 'This is the introduction.',
  body_es: 'Esta es la introducción.',
  order: 0,
};

const validDoc = {
  doc_id: 'test-001',
  title_en: 'Test Document',
  title_es: 'Documento de Prueba',
  metadata: {
    author: 'Test Author',
    organization: 'Test Org',
    created_at: '2024-01-01T00:00:00Z',
  },
  template_config: { language_mode: 'bilingual' as const },
  sections: [validSection],
};

describe('AssetSchema', () => {
  it('accepts valid asset', () => {
    expect(() =>
      AssetSchema.parse({ name: 'logo', url: 'https://example.com/logo.png', position: 'header', width_mm: 40, height_mm: 20 })
    ).not.toThrow();
  });

  it('rejects invalid position', () => {
    expect(() =>
      AssetSchema.parse({ name: 'logo', url: 'https://example.com/logo.png', position: 'sidebar', width_mm: 40, height_mm: 20 })
    ).toThrow();
  });

  it('rejects negative dimensions', () => {
    expect(() =>
      AssetSchema.parse({ name: 'logo', url: 'https://example.com/logo.png', position: 'header', width_mm: -1, height_mm: 20 })
    ).toThrow();
  });
});

describe('TemplateConfigSchema', () => {
  it('applies defaults', () => {
    const config = TemplateConfigSchema.parse({});
    expect(config.font).toBe('Linux Libertine');
    expect(config.font_size).toBe(11);
    expect(config.language_mode).toBe('bilingual');
  });

  it('rejects invalid language_mode', () => {
    expect(() => TemplateConfigSchema.parse({ language_mode: 'fr' })).toThrow();
  });

  it('rejects font_size out of range', () => {
    expect(() => TemplateConfigSchema.parse({ font_size: 100 })).toThrow();
  });
});

describe('SectionSchema', () => {
  it('accepts valid section', () => {
    expect(() => SectionSchema.parse(validSection)).not.toThrow();
  });

  it('rejects section id with spaces', () => {
    expect(() => SectionSchema.parse({ ...validSection, id: 'has space' })).toThrow();
  });

  it('requires body_en', () => {
    const { body_en: _, ...noBody } = validSection;
    expect(() => SectionSchema.parse(noBody)).toThrow();
  });
});

describe('DocumentSchema', () => {
  it('validates a complete document', () => {
    const doc = DocumentSchema.parse(validDoc);
    expect(doc.doc_id).toBe('test-001');
    expect(doc.sections).toHaveLength(1);
    expect(doc.template_config.language_mode).toBe('bilingual');
  });

  it('rejects doc_id with spaces or special chars', () => {
    expect(() => DocumentSchema.parse({ ...validDoc, doc_id: 'test doc!' })).toThrow();
  });

  it('rejects empty sections array', () => {
    expect(() => DocumentSchema.parse({ ...validDoc, sections: [] })).toThrow();
  });

  it('rejects duplicate section IDs', () => {
    expect(() =>
      DocumentSchema.parse({
        ...validDoc,
        sections: [validSection, { ...validSection, order: 1 }],
      })
    ).toThrow('Section IDs must be unique');
  });

  it('applies metadata defaults', () => {
    const doc = DocumentSchema.parse(validDoc);
    expect(doc.metadata.version).toBe('1.0.0');
    expect(doc.metadata.tags).toEqual([]);
  });

  it('rejects missing required metadata fields', () => {
    expect(() =>
      DocumentSchema.parse({ ...validDoc, metadata: { created_at: '2024-01-01T00:00:00Z' } })
    ).toThrow();
  });
});
