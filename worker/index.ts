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
  CUSTOM_LM_URL?: string;
  CUSTOM_LM_TOKEN?: string;
  SUBSTRATE_TOKEN?: string;
  SITE_URL?: string;
  CONTACT_EMAIL?: string;
  CONTACT_PHONE?: string;
}

const ASK_RATE_LIMIT = 20;
const ASK_WINDOW_MS = 60_000;
const askBuckets = new Map<string, { count: number; resetAt: number }>();

function checkAskRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  if (askBuckets.size > 500) {
    for (const [k, v] of askBuckets) {
      if (v.resetAt <= now) askBuckets.delete(k);
    }
  }
  const existing = askBuckets.get(ip);
  if (!existing || existing.resetAt <= now) {
    askBuckets.set(ip, { count: 1, resetAt: now + ASK_WINDOW_MS });
    return { allowed: true, remaining: ASK_RATE_LIMIT - 1, retryAfterSec: 0 };
  }
  if (existing.count >= ASK_RATE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { allowed: true, remaining: ASK_RATE_LIMIT - existing.count, retryAfterSec: 0 };
}

async function requireAdminAuth(request: Request, env: Env): Promise<Response | null> {
  const bearer = request.headers.get('Authorization');
  if (env.SUBSTRATE_TOKEN && bearer === `Bearer ${env.SUBSTRATE_TOKEN}`) {
    return null;
  }
  const sessionUser = await getSessionUser(request, env);
  if (sessionUser && sessionUser.role === 'admin') {
    return null;
  }
  if (!env.SUBSTRATE_TOKEN && !env.AUTH_SESSION_SECRET) {
    return withSecurityHeaders(
      Response.json(
        { ok: false, error: 'Fail-closed: SUBSTRATE_TOKEN or AUTH_SESSION_SECRET not configured.' },
        { status: 503 },
      ),
    );
  }
  return withSecurityHeaders(
    Response.json({ ok: false, error: 'Unauthorized: Admin session or Bearer token required.' }, { status: 401 }),
  );
}

const COLLECTIVE_SYSTEM_PROMPT = [
  "You are the concise edge concierge for Sena's AI Collective (Sena Colectivo) in Northern New Mexico, founded by Salvador Sena.",
  'Language rule: ALWAYS reply in English if the visitor writes in English. Only reply in Spanish if the visitor writes in Spanish (or if the UI language is "es" and the message is ambiguous). Never switch languages mid-reply.',
  'Identity rule: You are the Collective\'s edge concierge running on Cloudflare Workers AI (Meta Llama 3.2 3B, @cf/meta/llama-3.2-3b-instruct) — NOT a custom in-house model. If asked what model you run on, say so plainly. Tier 3 custom inference exists behind the premium gate but is not what answers here.',
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
  async fetch(request: Request, env: Env): Promise<Response> {
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

    if (url.pathname.startsWith('/api/auth/')) {
      const authRes = await handleAuthRequest(request, url, env);
      if (authRes) return withSecurityHeaders(authRes);
    }

    if (url.pathname === '/api/profile') {
      return withSecurityHeaders(await handleProfileRequest(request, env));
    }

    if (url.pathname === '/api/admin/overview') {
      const authErr = await requireAdminAuth(request, env);
      if (authErr) return authErr;
      return withSecurityHeaders(
        Response.json({
          ok: true,
          siteUrl: env.SITE_URL ?? 'https://senacolectivo.com',
          timestamp: new Date().toISOString(),
          substrate: substrateStatus(env),
          rateLimit: {
            endpoint: '/api/ask',
            limitPerMinute: ASK_RATE_LIMIT,
            activeTrackedIps: askBuckets.size,
          },
        }),
      );
    }

    if (url.pathname === '/api/audit') {
      const authErr = await requireAdminAuth(request, env);
      if (authErr) return authErr;
      const target = url.searchParams.get('url') ?? '';
      const result = await auditSite(target);
      return withSecurityHeaders(
        Response.json(result, { status: result.ok ? 200 : result.status }),
      );
    }

    if (url.pathname === '/api/ask') {
      if (request.method !== 'POST') {
        return withSecurityHeaders(
          Response.json({ ok: false, error: 'Use POST with JSON { question }.' }, { status: 405 }),
        );
      }

      const clientIp =
        request.headers.get('CF-Connecting-IP') ??
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
        'unknown';
      const rl = checkAskRateLimit(clientIp);
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
        const aiResult = (await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [
            { role: 'system', content: `${COLLECTIVE_SYSTEM_PROMPT}\nCurrent UI language: ${lang}.` },
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
    return withSecurityHeaders(assetResponse);
  },
} satisfies ExportedHandler<Env>;
