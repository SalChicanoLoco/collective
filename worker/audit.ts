export interface SiteAuditResult {
  ok: boolean;
  url: string;
  status: number;
  securityHeaders: Record<string, string | null>;
  missingHeaders: string[];
  signals: {
    hasTitle: boolean;
    title: string | null;
    externalScripts: number;
    externalStylesheets: number;
  };
  error?: string;
}

const SECURITY_HEADER_NAMES = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
] as const;

function isForbiddenHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  // Block IPv4 loopback, link-local, and RFC1918 private ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, aStr, bStr] = ipv4Match;
    const a = Number(aStr);
    const b = Number(bStr);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  // Block IPv6 unique local (fc00::/7) and link-local (fe80::/10)
  if (/^(fc|fd|fe80:)/i.test(host)) {
    return true;
  }

  return false;
}

export async function auditSite(rawUrl: string): Promise<SiteAuditResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return {
      ok: false,
      url: rawUrl,
      status: 400,
      securityHeaders: {},
      missingHeaders: [...SECURITY_HEADER_NAMES],
      signals: { hasTitle: false, title: null, externalScripts: 0, externalStylesheets: 0 },
      error: 'Enter a valid URL starting with https://',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      url: parsed.toString(),
      status: 400,
      securityHeaders: {},
      missingHeaders: [...SECURITY_HEADER_NAMES],
      signals: { hasTitle: false, title: null, externalScripts: 0, externalStylesheets: 0 },
      error: 'Only https:// URLs are supported.',
    };
  }

  if (isForbiddenHost(parsed.hostname)) {
    return {
      ok: false,
      url: parsed.toString(),
      status: 403,
      securityHeaders: {},
      missingHeaders: [...SECURITY_HEADER_NAMES],
      signals: { hasTitle: false, title: null, externalScripts: 0, externalStylesheets: 0 },
      error: 'Private or local network hosts cannot be audited.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'SenaColectivo-SiteAudit/1.0 (+https://senacolectivo.com)' },
    });
  } catch {
    clearTimeout(timeout);
    return {
      ok: false,
      url: parsed.toString(),
      status: 502,
      securityHeaders: {},
      missingHeaders: [...SECURITY_HEADER_NAMES],
      signals: { hasTitle: false, title: null, externalScripts: 0, externalStylesheets: 0 },
      error: 'Could not reach that site within 5 seconds.',
    };
  }
  clearTimeout(timeout);

  const securityHeaders: Record<string, string | null> = {};
  const missingHeaders: string[] = [];
  for (const name of SECURITY_HEADER_NAMES) {
    const val = response.headers.get(name);
    securityHeaders[name] = val;
    if (!val) missingHeaders.push(name);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let title: string | null = null;
  let externalScripts = 0;
  let externalStylesheets = 0;

  if (contentType.includes('text/html')) {
    const html = (await response.text()).slice(0, 200_000);
    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : null;
    externalScripts = (html.match(/<script[^>]*\bsrc=["'][^"']+["']/gi) ?? []).length;
    externalStylesheets = (
      html.match(/<link[^>]*\brel=["']stylesheet["'][^>]*\bhref=["'][^"']+["']/gi) ?? []
    ).length;
  }

  return {
    ok: true,
    url: response.url || parsed.toString(),
    status: response.status,
    securityHeaders,
    missingHeaders,
    signals: {
      hasTitle: Boolean(title),
      title,
      externalScripts,
      externalStylesheets,
    },
  };
}
