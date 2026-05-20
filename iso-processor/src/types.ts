export type Env = {
  DB: D1Database;
  DOC_QUEUE: Queue;
  PDF_STORAGE: KVNamespace;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  TYPST_API_URL: string;
};

export type JobStatus = 'queued' | 'processing' | 'complete' | 'failed';

export type Job = {
  job_id: string;
  doc_id: string;
  status: JobStatus;
  pdf_url: string | null;
  validation_result: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type QueueMessage = {
  job_id: string;
  doc_id: string;
  priority?: 'normal' | 'high';
};

export type ValidationResult = {
  match_confidence: number;
  critical_issues: string[];
  warnings: string[];
  overall_status: 'PASS' | 'NEEDS_REVIEW' | 'FAIL';
  human_review_required: boolean;
};

export type McpTool = {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
};
