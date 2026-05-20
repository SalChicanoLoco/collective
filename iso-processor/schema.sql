-- ISO Processor D1 Schema
-- Apply with: wrangler d1 execute iso-processor-db --file=schema.sql
-- Apply remote: wrangler d1 execute iso-processor-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS jobs (
  job_id            TEXT    PRIMARY KEY,
  doc_id            TEXT    NOT NULL,
  status            TEXT    NOT NULL CHECK (status IN ('queued', 'processing', 'complete', 'failed')),
  pdf_url           TEXT,
  validation_result TEXT,
  error             TEXT,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  doc_id         TEXT PRIMARY KEY,
  title_en       TEXT NOT NULL,
  title_es       TEXT NOT NULL,
  grant_type     TEXT NOT NULL,
  document_json  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS validation_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id    TEXT    NOT NULL,
  layer     TEXT    NOT NULL,
  passed    INTEGER NOT NULL CHECK (passed IN (0, 1)),
  issues    TEXT    NOT NULL DEFAULT '[]',
  timestamp TEXT    NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_doc_id        ON jobs(doc_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status        ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at    ON jobs(updated_at);
CREATE INDEX IF NOT EXISTS idx_vlog_job_id        ON validation_log(job_id);
CREATE INDEX IF NOT EXISTS idx_docs_grant_type    ON documents(grant_type);
