import { z } from 'zod';

export const AssetPositionSchema = z.enum(['header', 'footer', 'inline']);
export const LanguageModeSchema = z.enum(['en', 'es', 'bilingual']);

export const AssetSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  position: AssetPositionSchema,
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
});

export const TemplateConfigSchema = z.object({
  font: z.string().default('Linux Libertine'),
  font_size: z.number().min(8).max(24).default(11),
  line_spacing: z.number().min(1).max(3).default(1.15),
  margin_mm: z.number().min(10).max(50).default(25.4),
  language_mode: LanguageModeSchema.default('bilingual'),
  grant_type: z.string().optional(),
});

export const SectionSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/i),
  heading_en: z.string().min(1).max(500),
  heading_es: z.string().min(1).max(500),
  body_en: z.string().min(1),
  body_es: z.string().min(1),
  char_count_parity: z.boolean().default(true),
  assets: z.array(AssetSchema).default([]),
  order: z.number().int().nonnegative(),
});

export const DocumentMetadataSchema = z.object({
  author: z.string().min(1),
  organization: z.string().min(1),
  created_at: z.string().datetime(),
  version: z.string().default('1.0.0'),
  tags: z.array(z.string()).default([]),
});

export const DocumentSchema = z.object({
  doc_id: z.string().min(1).regex(/^[a-z0-9_-]+$/i, {
    message: 'doc_id must be alphanumeric with underscores or hyphens',
  }),
  title_en: z.string().min(1).max(200),
  title_es: z.string().min(1).max(200),
  metadata: DocumentMetadataSchema,
  template_config: TemplateConfigSchema,
  sections: z.array(SectionSchema).min(1),
}).refine(
  (doc) => {
    const ids = doc.sections.map((s) => s.id);
    return new Set(ids).size === ids.length;
  },
  { message: 'Section IDs must be unique', path: ['sections'] }
);

export type Asset = z.infer<typeof AssetSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type AssetPosition = z.infer<typeof AssetPositionSchema>;
export type LanguageMode = z.infer<typeof LanguageModeSchema>;
