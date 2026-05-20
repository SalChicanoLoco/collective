import { Hono } from 'hono';
import { DocumentSchema } from './schema';
import { verifyJWT, signJWT, newId, now } from './utils';
import { queueHandler } from './queue-consumer';
import type { Env, Job, McpTool } from './types';

const app = new Hono<{ Bindings: Env }>();

// ─── Auth middleware ─────────────────────────────────────────────────────────

async function requireAuth(c: { req: { header: (k: string) => string | undefined }; env: Env; json: Function }, next: () => Promise<void>) {
  const auth = c.req.header('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const claims = await verifyJWT(token, c.env.JWT_SECRET);
  if (!claims) return c.json({ error: 'Invalid or expired token' }, 401);
  return next();
}

// ─── MCP tool registry ───────────────────────────────────────────────────────

const MCP_TOOLS: McpTool[] = [
  {
    name: 'read_section',
    description: 'Read a specific section from a document by section ID',
    inputSchema: {
      type: 'object',
      properties: {
        doc_id: { type: 'string', description: 'Document identifier' },
        section_id: { type: 'string', description: 'Section identifier' },
      },
      required: ['doc_id', 'section_id'],
    },
  },
  {
    name: 'validate_parity',
    description: 'Check EN/ES character-count parity across all sections',
    inputSchema: {
      type: 'object',
      properties: {
        doc_id: { type: 'string' },
        tolerance: { type: 'number', description: 'Max acceptable ratio difference (default 0.2)' },
      },
      required: ['doc_id'],
    },
  },
  {
    name: 'render',
    description: 'Queue a PDF render job for a document',
    inputSchema: {
      type: 'object',
      properties: {
        doc_id: { type: 'string' },
        priority: { type: 'string', enum: ['normal', 'high'] },
      },
      required: ['doc_id'],
    },
  },
];

// ─── Routes ─────────────────────────────────────────────────────────────────

/** POST /auth  →  exchange credentials for a short-lived JWT */
app.post('/auth', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>().catch(() => ({}));
  // Replace with a real credential check (e.g. D1 lookup + bcrypt) before production.
  if (!body.username || !body.password) {
    return c.json({ error: 'username and password required' }, 400);
  }
  const token = await signJWT({ sub: body.username }, c.env.JWT_SECRET, 3600);
  return c.json({ token });
});

/** GET /tools  →  MCP tool discovery (no auth required so Claude can introspect) */
app.get('/tools', (c) => c.json({ tools: MCP_TOOLS }));

/** POST /process  →  validate schema, persist doc, enqueue render */
app.post('/process', requireAuth, async (c) => {
  const body = await c.req.json<{ document_json?: unknown }>().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON body' }, 400);

  const parse = DocumentSchema.safeParse(body.document_json);
  if (!parse.success) {
    return c.json({ error: 'Schema validation failed', details: parse.error.flatten() }, 422);
  }

  const doc = parse.data;
  const job_id = newId();
  const ts = now();

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO documents (doc_id, title_en, title_es, grant_type, document_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
    .bind(doc.doc_id, doc.title_en, doc.title_es, doc.template_config.grant_type ?? 'NSF_SBIR', JSON.stringify(doc), ts, ts)
    .run();

  await c.env.DB.prepare(
    'INSERT INTO jobs (job_id, doc_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(job_id, doc.doc_id, 'queued', ts, ts)
    .run();

  await c.env.DOC_QUEUE.send({ job_id, doc_id: doc.doc_id });

  return c.json({ job_id, doc_id: doc.doc_id, status: 'queued' }, 202);
});

/** POST /mcp-tool  →  execute an MCP tool (used by Claude tool-use calls) */
app.post('/mcp-tool', requireAuth, async (c) => {
  const body = await c.req.json<{ tool_name?: string; params?: Record<string, unknown> }>().catch(() => null);
  if (!body?.tool_name) return c.json({ error: 'tool_name required' }, 400);

  const tool = MCP_TOOLS.find((t) => t.name === body.tool_name);
  if (!tool) return c.json({ error: `Unknown tool: ${body.tool_name}` }, 404);

  const params = body.params ?? {};

  switch (body.tool_name) {
    case 'read_section': {
      const { doc_id, section_id } = params as { doc_id: string; section_id: string };
      const row = await c.env.DB.prepare('SELECT document_json FROM documents WHERE doc_id = ?')
        .bind(doc_id)
        .first<{ document_json: string }>();
      if (!row) return c.json({ error: 'Document not found' }, 404);
      const doc = JSON.parse(row.document_json);
      const section = (doc.sections as Array<{ id: string }>).find((s) => s.id === section_id);
      if (!section) return c.json({ error: 'Section not found' }, 404);
      return c.json({ result: section });
    }

    case 'validate_parity': {
      const { doc_id, tolerance = 0.2 } = params as { doc_id: string; tolerance?: number };
      const row = await c.env.DB.prepare('SELECT document_json FROM documents WHERE doc_id = ?')
        .bind(doc_id)
        .first<{ document_json: string }>();
      if (!row) return c.json({ error: 'Document not found' }, 404);
      const doc = JSON.parse(row.document_json);
      const issues = (doc.sections as Array<{ id: string; char_count_parity: boolean; body_en: string; body_es: string }>)
        .filter((s) => s.char_count_parity)
        .filter((s) => {
          const max = Math.max(s.body_en.length, s.body_es.length);
          return Math.abs(s.body_en.length - s.body_es.length) / max > tolerance;
        })
        .map((s) => ({ section_id: s.id, en_chars: s.body_en.length, es_chars: s.body_es.length }));
      return c.json({ result: { passed: issues.length === 0, issues } });
    }

    case 'render': {
      const { doc_id, priority = 'normal' } = params as { doc_id: string; priority?: string };
      const row = await c.env.DB.prepare('SELECT doc_id FROM documents WHERE doc_id = ?')
        .bind(doc_id)
        .first();
      if (!row) return c.json({ error: 'Document not found' }, 404);
      const job_id = newId();
      const ts = now();
      await c.env.DB.prepare(
        'INSERT INTO jobs (job_id, doc_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(job_id, doc_id, 'queued', ts, ts)
        .run();
      await c.env.DOC_QUEUE.send({ job_id, doc_id, priority });
      return c.json({ result: { job_id, queued: true } });
    }
  }

  return c.json({ error: 'Unhandled tool' }, 500);
});

/** GET /status/:job_id  →  poll job progress */
app.get('/status/:job_id', requireAuth, async (c) => {
  const job_id = c.req.param('job_id');
  const row = await c.env.DB.prepare('SELECT * FROM jobs WHERE job_id = ?')
    .bind(job_id)
    .first<Job>();
  if (!row) return c.json({ error: 'Job not found' }, 404);

  const response: Record<string, unknown> = {
    job_id: row.job_id,
    doc_id: row.doc_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.status === 'complete') {
    response.pdf_url = row.pdf_url;
    response.validation_result = row.validation_result ? JSON.parse(row.validation_result) : null;
  } else if (row.status === 'failed') {
    response.error = row.error;
  }

  return c.json(response);
});

// ─── Exports (fetch + queue) ─────────────────────────────────────────────────

export default {
  fetch: app.fetch,
  queue: queueHandler,
};
