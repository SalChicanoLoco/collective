import { auditSite } from './audit';
import {
  type AuthEnv,
  getSessionUser,
  handleAuthRequest,
  handleProfileRequest,
} from './auth';
import {
  computeGreenhouseSubstrate,
  handleSubstrateInfer,
  hasInjectionSignal,
  substrateStatus,
} from './substrate';

export interface Env extends AuthEnv {
  ASSETS: Fetcher;
  AI?: Ai;
  OPS_KV?: KVNamespace;
  SAL_PASSPHRASE?: string;
  CUSTOM_LM_URL?: string;
  CUSTOM_LM_TOKEN?: string;
  SUBSTRATE_TOKEN?: string;
  SITE_URL?: string;
  CONTACT_EMAIL?: string;
  CONTACT_PHONE?: string;
}

interface RuntimeOpsConfig {
  askEnabled: boolean;
  askRateLimitPerMin: number;
  edgeFactsAppend: string;
  updatedAt: string;
  updatedBy: string;
}

interface AdminAuditEntry {
  at: string;
  actor: string;
  ipHash: string;
  action: string;
  summary: string;
}

const DEFAULT_OPS_CONFIG: RuntimeOpsConfig = {
  askEnabled: true,
  askRateLimitPerMin: 20,
  edgeFactsAppend: '',
  updatedAt: 'default',
  updatedBy: 'system',
};

const ASK_WINDOW_MS = 60_000;
const askBuckets = new Map<string, { count: number; resetAt: number }>();

const ADMIN_FAIL_LIMIT = 5;
const ADMIN_FAIL_WINDOW_MS = 5 * 60_000;
const adminFailBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function timingSafeEqualStr(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const ua = new Uint8Array(da);
  const ub = new Uint8Array(db);
  let diff = a.length ^ b.length;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

function checkAskRateLimit(
  ip: string,
  limitPerMin: number,
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  if (askBuckets.size > 500) {
    for (const [k, v] of askBuckets) {
      if (v.resetAt <= now) askBuckets.delete(k);
    }
  }
  const existing = askBuckets.get(ip);
  if (!existing || existing.resetAt <= now) {
    askBuckets.set(ip, { count: 1, resetAt: now + ASK_WINDOW_MS });
    return { allowed: true, remaining: Math.max(0, limitPerMin - 1), retryAfterSec: 0 };
  }
  if (existing.count >= limitPerMin) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { allowed: true, remaining: Math.max(0, limitPerMin - existing.count), retryAfterSec: 0 };
}

function checkAdminLockout(ip: string): { locked: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = adminFailBuckets.get(ip);
  if (!entry || entry.resetAt <= now) return { locked: false, retryAfterSec: 0 };
  if (entry.count >= ADMIN_FAIL_LIMIT) {
    return { locked: true, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  return { locked: false, retryAfterSec: 0 };
}

function recordAdminFailure(ip: string) {
  const now = Date.now();
  const entry = adminFailBuckets.get(ip);
  if (!entry || entry.resetAt <= now) {
    adminFailBuckets.set(ip, { count: 1, resetAt: now + ADMIN_FAIL_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

async function loadOpsConfig(env: Env): Promise<RuntimeOpsConfig> {
  if (!env.OPS_KV) return DEFAULT_OPS_CONFIG;
  try {
    const raw = await env.OPS_KV.get('ops:config');
    if (!raw) return DEFAULT_OPS_CONFIG;
    const parsed = JSON.parse(raw) as Partial<RuntimeOpsConfig>;
    return {
      askEnabled: parsed.askEnabled !== false,
      askRateLimitPerMin:
        typeof parsed.askRateLimitPerMin === 'number' &&
        parsed.askRateLimitPerMin >= 1 &&
        parsed.askRateLimitPerMin <= 120
          ? Math.round(parsed.askRateLimitPerMin)
          : 20,
      edgeFactsAppend: typeof parsed.edgeFactsAppend === 'string' ? parsed.edgeFactsAppend.slice(0, 500) : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : 'kv',
      updatedBy: typeof parsed.updatedBy === 'string' ? parsed.updatedBy : 'admin',
    };
  } catch {
    return DEFAULT_OPS_CONFIG;
  }
}

async function appendAdminAudit(env: Env, entry: AdminAuditEntry): Promise<void> {
  if (!env.OPS_KV) return;
  try {
    const raw = await env.OPS_KV.get('ops:audit_log');
    const list: AdminAuditEntry[] = raw ? (JSON.parse(raw) as AdminAuditEntry[]) : [];
    list.unshift(entry);
    await env.OPS_KV.put('ops:audit_log', JSON.stringify(list.slice(0, 20)));
  } catch {
    // Non-fatal
  }
}

async function readAdminAudit(env: Env): Promise<AdminAuditEntry[]> {
  if (!env.OPS_KV) return [];
  try {
    const raw = await env.OPS_KV.get('ops:audit_log');
    return raw ? (JSON.parse(raw) as AdminAuditEntry[]) : [];
  } catch {
    return [];
  }
}

interface PageCounts {
  total: number;
  since: string;
  pages: Record<string, number>;
}

async function readPageCounts(env: Env): Promise<PageCounts> {
  if (!env.OPS_KV) return { total: 0, since: 'kv-unbound', pages: {} };
  try {
    const raw = await env.OPS_KV.get('ops:page_counts');
    if (!raw) return { total: 0, since: new Date().toISOString().slice(0, 10), pages: {} };
    const parsed = JSON.parse(raw) as Partial<PageCounts>;
    return {
      total: typeof parsed.total === 'number' ? parsed.total : 0,
      since: typeof parsed.since === 'string' ? parsed.since : 'unknown',
      pages: parsed.pages && typeof parsed.pages === 'object' ? parsed.pages : {},
    };
  } catch {
    return { total: 0, since: 'error', pages: {} };
  }
}

async function recordPageHit(env: Env, pathname: string): Promise<void> {
  if (!env.OPS_KV) return;
  try {
    const norm = pathname.endsWith('.html') ? pathname.slice(0, -5) || '/' : pathname;
    const counts = await readPageCounts(env);
    counts.total += 1;
    counts.pages[norm] = (counts.pages[norm] ?? 0) + 1;
    await env.OPS_KV.put('ops:page_counts', JSON.stringify(counts));
  } catch {
    // Non-fatal background telemetry
  }
}

function matchesSalCombination(question: string, env: Env): boolean {
  if (env.SAL_PASSPHRASE) {
    return question.includes(env.SAL_PASSPHRASE);
  }
  return /\b(i'?m\s+sal|sal\s+sena)\b[\s\S]*\b(page\s*count|hits|views|metrics)\b/i.test(question);
}

function noStore(response: Response): Response {
  const res = withSecurityHeaders(response);
  res.headers.set('Cache-Control', 'no-store, private');
  res.headers.set('Pragma', 'no-cache');
  return res;
}

async function requireAdminAuth(
  request: Request,
  env: Env,
  url: URL,
): Promise<{ error: Response | null; actor: string }> {
  const ip = getClientIp(request);
  const lock = checkAdminLockout(ip);
  if (lock.locked) {
    return {
      actor: '',
      error: noStore(
        Response.json(
          { ok: false, error: `Too many failed auth attempts. Retry in ${lock.retryAfterSec}s.` },
          { status: 429, headers: { 'Retry-After': String(lock.retryAfterSec) } },
        ),
      ),
    };
  }

  const bearer = request.headers.get('Authorization') ?? '';
  if (env.SUBSTRATE_TOKEN && bearer.startsWith('Bearer ')) {
    const token = bearer.slice(7);
    if (await timingSafeEqualStr(token, env.SUBSTRATE_TOKEN)) {
      adminFailBuckets.delete(ip);
      return { error: null, actor: 'bearer-token' };
    }
  }

  const sessionUser = await getSessionUser(request, env);
  if (sessionUser && sessionUser.role === 'admin') {
    const isMutating = request.method !== 'GET' && request.method !== 'HEAD';
    const origin = request.headers.get('Origin');
    if (isMutating && origin && origin !== url.origin) {
      return {
        actor: '',
        error: noStore(Response.json({ ok: false, error: 'CSRF origin mismatch.' }, { status: 403 })),
      };
    }
    adminFailBuckets.delete(ip);
    return { error: null, actor: sessionUser.email || sessionUser.id };
  }

  if (!env.SUBSTRATE_TOKEN && !env.AUTH_SESSION_SECRET) {
    return {
      actor: '',
      error: noStore(
        Response.json(
          { ok: false, error: 'Fail-closed: SUBSTRATE_TOKEN or AUTH_SESSION_SECRET not configured.' },
          { status: 503 },
        ),
      ),
    };
  }

  recordAdminFailure(ip);
  return {
    actor: '',
    error: noStore(
      Response.json({ ok: false, error: 'Unauthorized: Admin session or Bearer token required.' }, { status: 401 }),
    ),
  };
}

const COLLECTIVE_SYSTEM_PROMPT = [
  "You are the concise edge concierge for Sena's AI Collective (Sena Colectivo) in Northern New Mexico, founded by Salvador Sena.",
  'Language rule: ALWAYS reply in English if the visitor writes in English. Only reply in Spanish if the visitor writes in Spanish (or if the UI language is "es" and the message is ambiguous). Never switch languages mid-reply.',
  'Identity rule: You are the Collective\'s edge concierge, running on Meta\'s Llama 3.2 3B via Cloudflare Workers AI, wrapped in Sena Colectivo\'s custom system — its prompts, injection gate, and substrate tiers. The base model is Meta\'s; the system around it is built in-house. Tier 3 custom inference exists behind the premium gate but is not what answers here.',
  'Keep answers under 4 short sentences, plain words, no hype or filler.',
  'Only state verified facts:',
  '- Contact: salvadorsena@senacolectivo.com or (505) 451-9341.',
  '- Services: Sena IT & AI consulting (since 2003, priced per job, discounts for seniors/neighbors, trade/barter welcome) and Grant Writing (priced per project). Scope and price are always agreed before work starts.',
  '- Merc Mercado (https://merc.senacolectivo.com): live Santa Fe handmade marketplace, 0% platform take, offered as a turnkey asset ($2,500 asking, $1,000 floor).',
  '- Public tools & archive: Greenhouse CAD Studio (/commons-greenhouse-calculator-secure/), Publications (/publications/), La Biblioteca (/biblioteca/), Projects (/projects/), Tools (/tools/).',
  'If asked something outside these facts, direct them to salvadorsena@senacolectivo.com or (505) 451-9341.',
].join('\n');

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'sha256-XprFgEPLQWku2W+WBeoyfM1N7Sdxbmf+66eJcqJ2nKs='",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
    'upgrade-insecure-requests',
  ].join('; '),
};

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/favicon.ico') {
      const svgUrl = new URL('/favicon.svg', url.origin);
      const res = await env.ASSETS.fetch(new Request(svgUrl.toString(), request));
      return withSecurityHeaders(res);
    }

    if (url.pathname === '/api/health') {
      return withSecurityHeaders(
        Response.json({
          ok: true,
          service: 'senacolectivo-site',
          site: env.SITE_URL ?? 'https://senacolectivo.com',
          timestamp: new Date().toISOString(),
        }),
      );
    }

    if (url.pathname === '/api/quetzal/geodynamo' || url.pathname === '/api/quetzal/plates') {
      const ip = getClientIp(request);
      const rl = checkAskRateLimit(`qz:${ip}`, 15);
      if (!rl.allowed) {
        return withSecurityHeaders(
          Response.json(
            { ok: false, error: `Experimental Quetzal cap reached. Retry in ${rl.retryAfterSec}s.` },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
          ),
        );
      }

      const isPlates = url.pathname === '/api/quetzal/plates';
      const CACHE_KEY = isPlates ? 'quetzal:cloudrun:plates' : 'quetzal:cloudrun:geodynamo';
      const TTL_MS = isPlates ? 60 * 60_000 : 10 * 60_000;
      const upstream = isPlates
        ? 'https://quetzal-geophysics-x7l7o3xjza-uc.a.run.app/api/seismic/plates'
        : 'https://quetzal-geophysics-x7l7o3xjza-uc.a.run.app/api/geodynamo/telemetry';

      if (env.OPS_KV) {
        try {
          const cachedRaw = await env.OPS_KV.get(CACHE_KEY);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as { fetchedAtMs: number; payload: unknown };
            if (Date.now() - cached.fetchedAtMs < TTL_MS) {
              return withSecurityHeaders(Response.json({ ok: true, cached: true, data: cached.payload }));
            }
          }
        } catch {}
      }

      try {
        const upRes = await fetch(upstream, { headers: { 'User-Agent': 'SenaColectivo-Quetzal/1.0' } });
        if (!upRes.ok) throw new Error(`Cloud Run HTTP ${upRes.status}`);
        const payload = await upRes.json();
        if (env.OPS_KV) {
          ctx.waitUntil(
            env.OPS_KV.put(CACHE_KEY, JSON.stringify({ fetchedAtMs: Date.now(), payload }), {
              expirationTtl: isPlates ? 3600 : 600,
            }),
          );
        }
        return withSecurityHeaders(Response.json({ ok: true, cached: false, data: payload }));
      } catch (err) {
        return withSecurityHeaders(
          Response.json(
            { ok: false, error: err instanceof Error ? err.message : 'Quetzal Cloud Run unavailable.' },
            { status: 502 },
          ),
        );
      }
    }

    if (url.pathname === '/api/quetzal/seismic') {
      const ip = getClientIp(request);
      const rl = checkAskRateLimit(`qz:${ip}`, 15);
      if (!rl.allowed) {
        return withSecurityHeaders(
          Response.json(
            { ok: false, error: `Experimental Quetzal cap reached. Retry in ${rl.retryAfterSec}s.` },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
          ),
        );
      }

      const CACHE_KEY = 'quetzal:usgs:m25_day';
      const TTL_MS = 5 * 60_000;
      if (env.OPS_KV) {
        try {
          const cachedRaw = await env.OPS_KV.get(CACHE_KEY);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as { fetchedAtMs: number; payload: unknown };
            if (Date.now() - cached.fetchedAtMs < TTL_MS) {
              return withSecurityHeaders(Response.json({ ok: true, cached: true, ...(cached.payload as object) }));
            }
          }
        } catch {}
      }

      try {
        const usgsRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', {
          headers: { 'User-Agent': 'SenaColectivo-Quetzal/1.0' },
        });
        if (!usgsRes.ok) throw new Error(`USGS HTTP ${usgsRes.status}`);
        const geo = (await usgsRes.json()) as {
          metadata?: { generated?: number; count?: number };
          features?: Array<{
            id?: string;
            properties?: { mag?: number; place?: string; time?: number; url?: string };
            geometry?: { coordinates?: number[] };
          }>;
        };
        const events = (geo.features ?? []).slice(0, 25).map((f) => {
          const mag = Number(f.properties?.mag ?? 0);
          const energyJ = Math.pow(10, 4.8 + 1.5 * mag);
          const coords = f.geometry?.coordinates ?? [];
          return {
            id: f.id ?? '',
            mag,
            place: f.properties?.place ?? 'Unknown',
            timeUtc: f.properties?.time ? new Date(f.properties.time).toISOString() : '',
            lon: Number((coords[0] ?? 0).toFixed(4)),
            lat: Number((coords[1] ?? 0).toFixed(4)),
            depthKm: Number((coords[2] ?? 0).toFixed(2)),
            energyJoules: energyJ,
            energyGj: Number((energyJ / 1e9).toFixed(3)),
            url: f.properties?.url ?? '',
          };
        });
        const payload = {
          datasource: 'USGS NEIC M2.5+ Day Feed',
          classification: 'OBSERVED + DERIVED (Gutenberg-Choy)',
          retrievedAt: new Date().toISOString(),
          totalInFeed: geo.metadata?.count ?? events.length,
          events,
        };
        if (env.OPS_KV) {
          ctx.waitUntil(
            env.OPS_KV.put(CACHE_KEY, JSON.stringify({ fetchedAtMs: Date.now(), payload }), {
              expirationTtl: 600,
            }),
          );
        }
        return withSecurityHeaders(Response.json({ ok: true, cached: false, ...payload }));
      } catch (err) {
        return withSecurityHeaders(
          Response.json(
            { ok: false, error: err instanceof Error ? err.message : 'USGS feed unavailable.' },
            { status: 502 },
          ),
        );
      }
    }

    if (url.pathname.startsWith('/api/auth/')) {
      const authRes = await handleAuthRequest(request, url, env);
      if (authRes) return noStore(authRes);
    }

    if (url.pathname === '/api/profile') {
      return noStore(await handleProfileRequest(request, env));
    }

    if (url.pathname === '/api/admin/overview') {
      const auth = await requireAdminAuth(request, env, url);
      if (auth.error) return auth.error;
      const [config, auditLog] = await Promise.all([loadOpsConfig(env), readAdminAudit(env)]);
      return noStore(
        Response.json({
          ok: true,
          siteUrl: env.SITE_URL ?? 'https://senacolectivo.com',
          timestamp: new Date().toISOString(),
          actor: auth.actor,
          kvBound: Boolean(env.OPS_KV),
          substrate: substrateStatus(env),
          config,
          auditLog,
          rateLimit: {
            endpoint: '/api/ask',
            limitPerMinute: config.askRateLimitPerMin,
            activeTrackedIps: askBuckets.size,
          },
        }),
      );
    }

    if (url.pathname === '/api/admin/config') {
      const auth = await requireAdminAuth(request, env, url);
      if (auth.error) return auth.error;
      if (request.method === 'GET') {
        return noStore(Response.json({ ok: true, kvBound: Boolean(env.OPS_KV), config: await loadOpsConfig(env) }));
      }
      if (request.method === 'PUT') {
        if (!env.OPS_KV) {
          return noStore(Response.json({ ok: false, error: 'OPS_KV binding not configured.' }, { status: 503 }));
        }
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return noStore(Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 }));
        }
        const rate = Number(body.askRateLimitPerMin);
        if (!Number.isFinite(rate) || rate < 1 || rate > 120) {
          return noStore(
            Response.json({ ok: false, error: 'askRateLimitPerMin must be between 1 and 120.' }, { status: 400 }),
          );
        }
        const facts = typeof body.edgeFactsAppend === 'string' ? body.edgeFactsAppend.trim().slice(0, 500) : '';
        if (facts && hasInjectionSignal(facts)) {
          return noStore(
            Response.json({ ok: false, error: 'edgeFactsAppend blocked by Shaman input gate.' }, { status: 403 }),
          );
        }
        const next: RuntimeOpsConfig = {
          askEnabled: body.askEnabled !== false,
          askRateLimitPerMin: Math.round(rate),
          edgeFactsAppend: facts,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.actor,
        };
        await env.OPS_KV.put('ops:config', JSON.stringify(next));
        await appendAdminAudit(env, {
          at: next.updatedAt,
          actor: auth.actor,
          ipHash: (await sha256Hex(getClientIp(request))).slice(0, 12),
          action: 'PUT /api/admin/config',
          summary: `askEnabled=${next.askEnabled}, rate=${next.askRateLimitPerMin}/min`,
        });
        return noStore(Response.json({ ok: true, config: next }));
      }
      return noStore(Response.json({ ok: false, error: 'Use GET or PUT.' }, { status: 405 }));
    }

    if (url.pathname === '/api/audit') {
      const auth = await requireAdminAuth(request, env, url);
      if (auth.error) return auth.error;
      const target = url.searchParams.get('url') ?? '';
      const result = await auditSite(target);
      return noStore(Response.json(result, { status: result.ok ? 200 : result.status }));
    }

    if (url.pathname === '/api/ask') {
      if (request.method !== 'POST') {
        return withSecurityHeaders(
          Response.json({ ok: false, error: 'Use POST with JSON { question }.' }, { status: 405 }),
        );
      }

      const opsConfig = await loadOpsConfig(env);
      if (!opsConfig.askEnabled) {
        return withSecurityHeaders(
          Response.json({
            ok: true,
            mode: 'fallback',
            answer:
              'Edge AI chat is paused for maintenance. Reach Salvador Sena directly at salvadorsena@senacolectivo.com or (505) 451-9341.',
          }),
        );
      }

      const clientIp = getClientIp(request);
      const rl = checkAskRateLimit(clientIp, opsConfig.askRateLimitPerMin);
      if (!rl.allowed) {
        return withSecurityHeaders(
          Response.json(
            { ok: false, error: `Rate limit exceeded. Try again in ${rl.retryAfterSec}s.` },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
          ),
        );
      }

      let question = '';
      let lang: 'en' | 'es' = 'en';
      let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      try {
        const body = (await request.json()) as {
          question?: unknown;
          lang?: unknown;
          history?: unknown;
        };
        question = typeof body?.question === 'string' ? body.question.trim() : '';
        lang = body?.lang === 'es' ? 'es' : 'en';
        if (Array.isArray(body?.history)) {
          history = body.history
            .filter(
              (m): m is { role: 'user' | 'assistant'; content: string } =>
                !!m &&
                typeof m === 'object' &&
                (m.role === 'user' || m.role === 'assistant') &&
                typeof m.content === 'string' &&
                m.content.trim().length > 0 &&
                !hasInjectionSignal(m.content),
            )
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 400) }));
        }
      } catch {
        return withSecurityHeaders(
          Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 }),
        );
      }

      if (!question || question.length > 300) {
        return withSecurityHeaders(
          Response.json(
            { ok: false, error: 'Enter a question between 1 and 300 characters.' },
            { status: 400 },
          ),
        );
      }

      if (hasInjectionSignal(question)) {
        return withSecurityHeaders(
          Response.json(
            { ok: false, error: 'Question blocked by Shaman input gate.' },
            { status: 403 },
          ),
        );
      }

      if (matchesSalCombination(question, env)) {
        const counts = await readPageCounts(env);
        const top = Object.entries(counts.pages)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([p, n]) => `${p}: ${n}`)
          .join(' · ');
        return noStore(
          Response.json({
            ok: true,
            mode: 'edge-telemetry',
            answer: `π Telemetry (since ${counts.since}): ${counts.total} total HTML views.${top ? ' Top: ' + top : ''}`,
          }),
        );
      }

      if (!env.AI) {
        return withSecurityHeaders(
          Response.json({
            ok: true,
            mode: 'fallback',
            answer:
              'Edge AI is not bound in this environment. Reach Salvador Sena directly at salvadorsena@senacolectivo.com or (505) 451-9341.',
          }),
        );
      }

      try {
        const systemPrompt = opsConfig.edgeFactsAppend
          ? `${COLLECTIVE_SYSTEM_PROMPT}\nAdditional verified notes: ${opsConfig.edgeFactsAppend}\nCurrent UI language: ${lang}.`
          : `${COLLECTIVE_SYSTEM_PROMPT}\nCurrent UI language: ${lang}.`;
        const aiResult = (await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: question },
          ],
          max_tokens: 180,
          temperature: 0.2,
        })) as { response?: string };

        const answer = (aiResult?.response ?? '').trim();
        if (!answer) {
          throw new Error('Empty AI response');
        }
        return withSecurityHeaders(
          Response.json({ ok: true, mode: 'workers-ai', answer }),
        );
      } catch {
        return withSecurityHeaders(
          Response.json({
            ok: true,
            mode: 'fallback',
            answer:
              'The edge model could not answer right now. Write to salvadorsena@senacolectivo.com or call (505) 451-9341.',
          }),
        );
      }
    }

    if (url.pathname === '/api/substrate/status' || url.pathname === '/api/delta/status') {
      return withSecurityHeaders(Response.json(substrateStatus(env)));
    }

    if (url.pathname === '/api/substrate/greenhouse' || url.pathname === '/api/delta/greenhouse') {
      if (request.method !== 'POST') {
        return withSecurityHeaders(
          Response.json({ ok: false, error: 'Use POST with JSON greenhouse parameters.' }, { status: 405 }),
        );
      }
      let raw: Record<string, unknown>;
      try {
        raw = (await request.json()) as Record<string, unknown>;
      } catch {
        return withSecurityHeaders(Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 }));
      }
      const res = computeGreenhouseSubstrate(raw);
      return withSecurityHeaders(Response.json(res, { status: res.status }));
    }

    if (url.pathname === '/api/substrate/infer' || url.pathname === '/api/delta/infer') {
      if (request.method !== 'POST') {
        return withSecurityHeaders(
          Response.json({ ok: false, error: 'Use POST with JSON { prompt }.' }, { status: 405 }),
        );
      }
      return withSecurityHeaders(await handleSubstrateInfer(request, env));
    }

    if (url.pathname.startsWith('/api/')) {
      return withSecurityHeaders(
        Response.json(
          { error: 'Not found', path: url.pathname },
          { status: 404 },
        ),
      );
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (
      request.method === 'GET' &&
      assetResponse.status === 200 &&
      (assetResponse.headers.get('Content-Type') ?? '').includes('text/html')
    ) {
      ctx.waitUntil(recordPageHit(env, url.pathname));
    }
    return withSecurityHeaders(assetResponse);
  },
} satisfies ExportedHandler<Env>;
