// ISO Processor client — zero secrets, JWT-only, works in PWA and Tauri

export interface ClientConfig {
  workerUrl: string;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface ProcessResult {
  job_id: string;
  doc_id: string;
  status: 'queued';
}

export interface JobStatus {
  job_id: string;
  doc_id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  pdf_url?: string;
  validation_result?: ValidationResult;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  match_confidence: number;
  critical_issues: string[];
  warnings: string[];
  overall_status: 'PASS' | 'NEEDS_REVIEW' | 'FAIL';
  human_review_required: boolean;
}

export interface WaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
  onProgress?: (status: JobStatus) => void;
}

export class ISOProcessorClient {
  private token: string | null = null;

  constructor(private readonly config: ClientConfig) {}

  /** Exchange credentials for a JWT. Call once per session. */
  async authenticate(credentials: AuthCredentials): Promise<string> {
    const res = await this.request('/auth', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (!res.ok) throw new Error(`Authentication failed: ${res.status} ${res.statusText}`);
    const { token } = (await res.json()) as { token: string };
    this.token = token;
    return token;
  }

  /** Submit a document for processing. Returns job_id + doc_id immediately (202). */
  async processDocument(documentJson: unknown): Promise<ProcessResult> {
    const res = await this.request('/process', {
      method: 'POST',
      body: JSON.stringify({ document_json: documentJson }),
    });
    if (res.status !== 202) {
      const err = await res.json();
      throw new Error(`Process failed (${res.status}): ${JSON.stringify(err)}`);
    }
    return res.json() as Promise<ProcessResult>;
  }

  /** Poll a single job status snapshot. */
  async getStatus(job_id: string): Promise<JobStatus> {
    const res = await this.request(`/status/${job_id}`);
    if (!res.ok) throw new Error(`Status check failed: ${res.status} ${res.statusText}`);
    return res.json() as Promise<JobStatus>;
  }

  /**
   * Poll /status until complete or failed, then return the final status.
   * Throws if the job doesn't finish within `timeoutMs` (default 30 s).
   */
  async waitForCompletion(job_id: string, options: WaitOptions = {}): Promise<JobStatus> {
    const { pollIntervalMs = 2000, timeoutMs = 30_000, onProgress } = options;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const status = await this.getStatus(job_id);
      onProgress?.(status);
      if (status.status === 'complete' || status.status === 'failed') return status;
      await sleep(pollIntervalMs);
    }

    throw new Error(`Timeout: job ${job_id} did not finish within ${timeoutMs} ms`);
  }

  /** Convenience: submit + wait in one call. */
  async submitAndWait(documentJson: unknown, options: WaitOptions = {}): Promise<JobStatus> {
    const { job_id } = await this.processDocument(documentJson);
    return this.waitForCompletion(job_id, options);
  }

  private request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${this.config.workerUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
