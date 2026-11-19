export interface Env {
  ASSETS: Fetcher;
  SITE_URL?: string;
  CONTACT_EMAIL?: string;
  CONTACT_PHONE?: string;
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' mailto:",
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
