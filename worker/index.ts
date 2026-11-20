import { auditSite } from './audit';
import {
  computeGreenhouseSubstrate,
  handleSubstrateInfer,
  hasInjectionSignal,
  substrateStatus,
} from './substrate';

export interface Env {
  ASSETS: Fetcher;
  AI?: Ai;
  CUSTOM_LM_URL?: string;
  CUSTOM_LM_TOKEN?: string;
  SUBSTRATE_TOKEN?: string;
  SITE_URL?: string;
  CONTACT_EMAIL?: string;
  CONTACT_PHONE?: string;
}

const COLLECTIVE_SYSTEM_PROMPT = [
  "You are the concise, bilingual (English/Spanish) edge concierge for Sena's AI Collective (Sena Colectivo) in Northern New Mexico, founded by Salvador Sena.",
  'Reply in the same language as the visitor (English or Spanish). Keep answers under 4 short sentences, plain words, no hype or filler.',
  'Only state verified facts:',
  '- Contact: salvadorsena@senacolectivo.com or (505) 451-9341.',
  '- Services: Sena IT & AI consulting (since 2003, priced per job, discounts for seniors/neighbors, trade/barter welcome) and Grant Writing (priced per project). Scope and price are always agreed before work starts.',
  '- Merc Mercado (https://merc.senacolectivo.com): live Santa Fe handmade marketplace, 0% platform take, offered as a turnkey asset ($2,500 asking, $1,000 floor).',
  '- Public tools & archive: Site Audit (/site-audit/), Publications (/publications/), La Biblioteca (/biblioteca/), Projects (/projects/), Tools (/tools/).',
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
    "script-src 'self'",
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

    if (url.pathname === '/cgs-community-suite/article.html') {
      return Response.redirect(
        new URL('/publications/the-peoples-greenhouse/index.html', url.origin).toString(),
        302,
      );
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

    if (url.pathname === '/api/audit') {
      if (!env.SUBSTRATE_TOKEN) {
        return withSecurityHeaders(
          Response.json({ ok: false, error: 'Fail-closed: SUBSTRATE_TOKEN not configured.' }, { status: 503 }),
        );
      }
      if (request.headers.get('Authorization') !== `Bearer ${env.SUBSTRATE_TOKEN}`) {
        return withSecurityHeaders(
          Response.json({ ok: false, error: 'Unauthorized: Bearer token required.' }, { status: 401 }),
        );
      }
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

      let question = '';
      try {
        const body = (await request.json()) as { question?: unknown };
        question = typeof body?.question === 'string' ? body.question.trim() : '';
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
            { role: 'system', content: COLLECTIVE_SYSTEM_PROMPT },
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
