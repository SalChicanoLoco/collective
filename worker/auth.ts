import { hasInjectionSignal } from './substrate';

export type AuthProvider = 'google' | 'microsoft' | 'meta';

export interface AuthEnv {
  AUTH_SESSION_SECRET?: string;
  ADMIN_EMAILS?: string;
  CONTACT_EMAIL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  META_CLIENT_ID?: string;
  META_CLIENT_SECRET?: string;
  PROFILES_KV?: KVNamespace;
}

export interface SessionUser {
  id: string;
  provider: AuthProvider;
  email: string;
  name: string;
  role: 'admin' | 'member';
  exp: number;
}

export interface UserProfile {
  id: string;
  provider: AuthProvider;
  email: string;
  displayName: string;
  handle: string;
  region: string;
  preferredTheme: 'hud' | 'earth' | 'cad';
  preferredLang: 'en' | 'es';
  preferredUnits: 'imperial' | 'si';
  bio: string;
  updatedAt: string;
}

const SESSION_COOKIE = 'sena_session';
const OAUTH_STATE_COOKIE = 'sena_oauth_state';
const PROFILE_COOKIE = 'sena_profile';
const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array<ArrayBuffer> | null {
  try {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

async function signToken(payload: unknown, secret: string): Promise<string> {
  const data = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  return `${data}.${b64urlEncode(sig)}`;
}

async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const data = token.slice(0, dot);
  const sigBytes = b64urlDecode(token.slice(dot + 1));
  if (!sigBytes) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
  if (!ok) return null;
  const raw = b64urlDecode(data);
  if (!raw) return null;
  try {
    return JSON.parse(dec.decode(raw)) as T;
  } catch {
    return null;
  }
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(verifier)));
  return b64urlEncode(digest);
}

function randomBase64Url(byteLen = 24): string {
  const buf = new Uint8Array(byteLen);
  crypto.getRandomValues(buf);
  return b64urlEncode(buf);
}

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get('Cookie') ?? '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }
  return out;
}

function makeCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function isProvider(val: string): val is AuthProvider {
  return val === 'google' || val === 'microsoft' || val === 'meta';
}

function getProviderCreds(provider: AuthProvider, env: AuthEnv): { id: string; secret: string } | null {
  if (provider === 'google' && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    return { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET };
  }
  if (provider === 'microsoft' && env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) {
    return { id: env.MICROSOFT_CLIENT_ID, secret: env.MICROSOFT_CLIENT_SECRET };
  }
  if (provider === 'meta' && env.META_CLIENT_ID && env.META_CLIENT_SECRET) {
    return { id: env.META_CLIENT_ID, secret: env.META_CLIENT_SECRET };
  }
  return null;
}

export function getAuthProviderStatus(env: AuthEnv) {
  return {
    sessionReady: Boolean(env.AUTH_SESSION_SECRET),
    providers: {
      google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      microsoft: Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
      meta: Boolean(env.META_CLIENT_ID && env.META_CLIENT_SECRET),
    },
    profileStorage: env.PROFILES_KV ? 'cloudflare-kv' : 'signed-cookie',
  };
}

export async function getSessionUser(request: Request, env: AuthEnv): Promise<SessionUser | null> {
  if (!env.AUTH_SESSION_SECRET) return null;
  const cookies = parseCookies(request);
  const raw = cookies[SESSION_COOKIE];
  if (!raw) return null;
  const user = await verifyToken<SessionUser>(raw, env.AUTH_SESSION_SECRET);
  if (!user || !user.exp || user.exp < Math.floor(Date.now() / 1000)) return null;
  return user;
}

function resolveRole(email: string, env: AuthEnv): 'admin' | 'member' {
  const clean = email.trim().toLowerCase();
  if (!clean) return 'member';
  const allow = (env.ADMIN_EMAILS ?? env.CONTACT_EMAIL ?? 'salvadorsena@senacolectivo.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(clean) ? 'admin' : 'member';
}

export async function handleAuthRequest(
  request: Request,
  url: URL,
  env: AuthEnv,
): Promise<Response | null> {
  if (url.pathname === '/api/auth/providers') {
    return Response.json({ ok: true, ...getAuthProviderStatus(env) });
  }

  if (url.pathname === '/api/auth/session') {
    const user = await getSessionUser(request, env);
    return Response.json({
      ok: true,
      authenticated: Boolean(user),
      user: user
        ? { id: user.id, provider: user.provider, email: user.email, name: user.name, role: user.role }
        : null,
    });
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const headers = new Headers();
    headers.append('Set-Cookie', makeCookie(SESSION_COOKIE, '', 0));
    headers.append('Set-Cookie', makeCookie(OAUTH_STATE_COOKIE, '', 0));
    return Response.json({ ok: true }, { headers });
  }

  const loginMatch = url.pathname.match(/^\/api\/auth\/login\/([a-z]+)$/);
  if (loginMatch) {
    const provider = loginMatch[1];
    if (!isProvider(provider)) {
      return Response.json({ ok: false, error: 'Unsupported provider.' }, { status: 400 });
    }
    if (!env.AUTH_SESSION_SECRET) {
      return Response.json(
        { ok: false, error: 'Fail-closed: AUTH_SESSION_SECRET not configured.' },
        { status: 503 },
      );
    }
    const creds = getProviderCreds(provider, env);
    if (!creds) {
      return Response.json(
        {
          ok: false,
          error: `Fail-closed: ${provider.toUpperCase()} OAuth client credentials not configured.`,
        },
        { status: 503 },
      );
    }

    const state = randomBase64Url(18);
    const verifier = randomBase64Url(32);
    const challenge = await pkceChallenge(verifier);
    const redirectUri = `${url.origin}/api/auth/callback/${provider}`;
    const stateToken = await signToken(
      { state, verifier, provider, exp: Math.floor(Date.now() / 1000) + 600 },
      env.AUTH_SESSION_SECRET,
    );

    let authUrl: URL;
    if (provider === 'google') {
      authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', creds.id);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', challenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
    } else if (provider === 'microsoft') {
      authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', creds.id);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile User.Read');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', challenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
    } else {
      authUrl = new URL('https://www.facebook.com/v20.0/dialog/oauth');
      authUrl.searchParams.set('client_id', creds.id);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'email,public_profile');
      authUrl.searchParams.set('state', state);
    }

    const headers = new Headers();
    headers.set('Location', authUrl.toString());
    headers.append('Set-Cookie', makeCookie(OAUTH_STATE_COOKIE, stateToken, 600));
    return new Response(null, { status: 302, headers });
  }

  const cbMatch = url.pathname.match(/^\/api\/auth\/callback\/([a-z]+)$/);
  if (cbMatch) {
    const provider = cbMatch[1];
    if (!isProvider(provider) || !env.AUTH_SESSION_SECRET) {
      return Response.json({ ok: false, error: 'Invalid callback or auth unconfigured.' }, { status: 400 });
    }
    const creds = getProviderCreds(provider, env);
    if (!creds) {
      return Response.json({ ok: false, error: 'Provider credentials missing.' }, { status: 503 });
    }

    const code = url.searchParams.get('code') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const cookies = parseCookies(request);
    const saved = cookies[OAUTH_STATE_COOKIE]
      ? await verifyToken<{ state: string; verifier: string; provider: AuthProvider; exp: number }>(
          cookies[OAUTH_STATE_COOKIE],
          env.AUTH_SESSION_SECRET,
        )
      : null;

    if (
      !code ||
      !state ||
      !saved ||
      saved.provider !== provider ||
      saved.state !== state ||
      saved.exp < Math.floor(Date.now() / 1000)
    ) {
      return Response.json({ ok: false, error: 'Invalid or expired OAuth state.' }, { status: 403 });
    }

    const redirectUri = `${url.origin}/api/auth/callback/${provider}`;
    let sub = '';
    let email = '';
    let name = '';

    if (provider === 'google') {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: creds.id,
          client_secret: creds.secret,
          code,
          code_verifier: saved.verifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      const tok = (await tokenRes.json()) as { access_token?: string };
      if (!tok.access_token) return Response.json({ ok: false, error: 'Token exchange failed.' }, { status: 401 });
      const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      const info = (await infoRes.json()) as { sub?: string; email?: string; name?: string };
      sub = info.sub ?? '';
      email = info.email ?? '';
      name = info.name ?? email;
    } else if (provider === 'microsoft') {
      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: creds.id,
          client_secret: creds.secret,
          code,
          code_verifier: saved.verifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      const tok = (await tokenRes.json()) as { access_token?: string };
      if (!tok.access_token) return Response.json({ ok: false, error: 'Token exchange failed.' }, { status: 401 });
      const infoRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      const info = (await infoRes.json()) as {
        id?: string;
        mail?: string;
        userPrincipalName?: string;
        displayName?: string;
      };
      sub = info.id ?? '';
      email = info.mail ?? info.userPrincipalName ?? '';
      name = info.displayName ?? email;
    } else {
      const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
      tokenUrl.searchParams.set('client_id', creds.id);
      tokenUrl.searchParams.set('client_secret', creds.secret);
      tokenUrl.searchParams.set('redirect_uri', redirectUri);
      tokenUrl.searchParams.set('code', code);
      const tokenRes = await fetch(tokenUrl.toString());
      const tok = (await tokenRes.json()) as { access_token?: string };
      if (!tok.access_token) return Response.json({ ok: false, error: 'Token exchange failed.' }, { status: 401 });
      const infoUrl = new URL('https://graph.facebook.com/me');
      infoUrl.searchParams.set('fields', 'id,name,email');
      infoUrl.searchParams.set('access_token', tok.access_token);
      const infoRes = await fetch(infoUrl.toString());
      const info = (await infoRes.json()) as { id?: string; name?: string; email?: string };
      sub = info.id ?? '';
      email = info.email ?? '';
      name = info.name ?? 'Member';
    }

    if (!sub) {
      return Response.json({ ok: false, error: 'Could not read user identity.' }, { status: 401 });
    }

    const sessionUser: SessionUser = {
      id: `${provider}:${sub}`,
      provider,
      email,
      name,
      role: resolveRole(email, env),
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
    };
    const sessionToken = await signToken(sessionUser, env.AUTH_SESSION_SECRET);

    const headers = new Headers();
    headers.set('Location', `${url.origin}/profile/`);
    headers.append('Set-Cookie', makeCookie(SESSION_COOKIE, sessionToken, SESSION_TTL_SEC));
    headers.append('Set-Cookie', makeCookie(OAUTH_STATE_COOKIE, '', 0));
    return new Response(null, { status: 302, headers });
  }

  return null;
}

export async function handleProfileRequest(
  request: Request,
  env: AuthEnv,
): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user || !env.AUTH_SESSION_SECRET) {
    return Response.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
  }

  const defaultProfile: UserProfile = {
    id: user.id,
    provider: user.provider,
    email: user.email,
    displayName: user.name || 'Collective Member',
    handle: (user.email.split('@')[0] || 'member').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24),
    region: 'Northern New Mexico',
    preferredTheme: 'hud',
    preferredLang: 'en',
    preferredUnits: 'imperial',
    bio: '',
    updatedAt: new Date().toISOString(),
  };

  if (request.method === 'GET') {
    let profile: UserProfile | null = null;
    if (env.PROFILES_KV) {
      const raw = await env.PROFILES_KV.get(`profile:${user.id}`);
      if (raw) {
        try {
          profile = JSON.parse(raw) as UserProfile;
        } catch {
          profile = null;
        }
      }
    } else {
      const cookies = parseCookies(request);
      if (cookies[PROFILE_COOKIE]) {
        const verified = await verifyToken<UserProfile>(cookies[PROFILE_COOKIE], env.AUTH_SESSION_SECRET);
        if (verified && verified.id === user.id) profile = verified;
      }
    }
    return Response.json({ ok: true, profile: profile ?? defaultProfile });
  }

  if (request.method === 'PUT') {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const cleanStr = (v: unknown, max: number, fb: string) => {
      if (typeof v !== 'string') return fb;
      const t = v.trim().slice(0, max);
      return hasInjectionSignal(t) ? fb : t;
    };

    const next: UserProfile = {
      id: user.id,
      provider: user.provider,
      email: user.email,
      displayName: cleanStr(body.displayName, 60, defaultProfile.displayName) || defaultProfile.displayName,
      handle: cleanStr(body.handle, 24, defaultProfile.handle).replace(/[^a-zA-Z0-9_-]/g, ''),
      region: cleanStr(body.region, 60, defaultProfile.region),
      preferredTheme:
        body.preferredTheme === 'earth' || body.preferredTheme === 'cad' ? body.preferredTheme : 'hud',
      preferredLang: body.preferredLang === 'es' ? 'es' : 'en',
      preferredUnits: body.preferredUnits === 'si' ? 'si' : 'imperial',
      bio: cleanStr(body.bio, 240, ''),
      updatedAt: new Date().toISOString(),
    };

    if (env.PROFILES_KV) {
      await env.PROFILES_KV.put(`profile:${user.id}`, JSON.stringify(next));
      return Response.json({ ok: true, profile: next });
    }

    const signed = await signToken(next, env.AUTH_SESSION_SECRET);
    const headers = new Headers();
    headers.append('Set-Cookie', makeCookie(PROFILE_COOKIE, signed, 30 * 24 * 60 * 60));
    return Response.json({ ok: true, profile: next }, { headers });
  }

  return Response.json({ ok: false, error: 'Use GET or PUT.' }, { status: 405 });
}
