export interface SubstrateEnv {
  AI?: Ai;
  CUSTOM_LM_URL?: string;
  CUSTOM_LM_TOKEN?: string;
  SUBSTRATE_TOKEN?: string;
}

export interface GreenhouseSpecInput {
  lengthFt: number;
  widthFt: number;
  spacingFt: number;
  aisleFt: number;
  bermFt: number;
  trenchFt: number;
  tier: 'salvage' | 'balanced' | 'upgraded';
  showBarrels: boolean;
  showAirTube: boolean;
}

const TIER_RATES: Record<GreenhouseSpecInput['tier'], { label: string; rate: number }> = {
  salvage: { label: 'Scrappy Salvage', rate: 1.85 },
  balanced: { label: 'Balanced Low-Cost', rate: 4.25 },
  upgraded: { label: 'Upgraded Kit', rate: 8.5 },
};

// Shaman Klingon-Defense style input sanitizer (fail-closed on injection/prototype-pollution patterns)
const INJECTION_RE =
  /(ignore\s+previous\s+instructions|system\s*:|<\s*script|__proto__|constructor\.prototype|subprocess\.|rm\s+-rf)/i;

export function hasInjectionSignal(text: string): boolean {
  return INJECTION_RE.test(text);
}

function finiteInRange(val: unknown, min: number, max: number, fallback: number): number | null {
  if (val === undefined) return fallback;
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  if (val < min || val > max) return null;
  return val;
}

export function computeGreenhouseSubstrate(raw: Record<string, unknown>) {
  const lengthFt = finiteInRange(raw.lengthFt, 12, 96, 32);
  const widthFt = finiteInRange(raw.widthFt, 10, 32, 16);
  const spacingFt = finiteInRange(raw.spacingFt, 2, 8, 4);
  const aisleFt = finiteInRange(raw.aisleFt, 1.5, 5, 2.5);
  const bermFt = finiteInRange(raw.bermFt, 0, 6, 2.5);
  const trenchFt = finiteInRange(raw.trenchFt, 0, 4, 1.5);

  if (
    lengthFt === null ||
    widthFt === null ||
    spacingFt === null ||
    aisleFt === null ||
    bermFt === null ||
    trenchFt === null
  ) {
    return { ok: false as const, status: 400, error: 'Numeric dimensions out of bounds or non-finite.' };
  }

  const tierRaw = typeof raw.tier === 'string' ? raw.tier : 'balanced';
  if (tierRaw !== 'salvage' && tierRaw !== 'balanced' && tierRaw !== 'upgraded') {
    return { ok: false as const, status: 400, error: 'tier must be salvage, balanced, or upgraded.' };
  }

  const showBarrels = raw.showBarrels !== false;
  const showAirTube = raw.showAirTube !== false;

  const areaSqFt = lengthFt * widthFt;
  const hoops = Math.floor(lengthFt / spacingFt) + 1;
  const bedWidthFt = Number(Math.max(1.5, (widthFt - aisleFt - 2) / 2).toFixed(2));
  const barrelCount = showBarrels ? Math.max(2, Math.floor((lengthFt - 2) / 2)) : 0;
  const waterGal = barrelCount * 55;
  const btuPerDegF = Math.round(waterGal * 8.34);
  const glazingSqFt = Math.round(lengthFt * (widthFt * 1.18));
  const tierInfo = TIER_RATES[tierRaw];
  const estCostUsd = Math.round(areaSqFt * tierInfo.rate);

  return {
    ok: true as const,
    status: 200,
    tier: 'tier1_deterministic',
    substrate: 'collective-substrate/delta-quadrant',
    input: { lengthFt, widthFt, spacingFt, aisleFt, bermFt, trenchFt, tier: tierRaw, showBarrels, showAirTube },
    derived: {
      areaSqFt,
      hoops,
      anchors: hoops * 2,
      bedWidthFt,
      barrelCount,
      waterGal,
      btuPerDegF,
      glazingSqFt,
      tierLabel: tierInfo.label,
      estCostUsd,
    },
  };
}

export function substrateStatus(env: SubstrateEnv) {
  return {
    ok: true,
    substrate: 'collective-substrate',
    codename: 'Delta Quadrant',
    policy: 'fail-closed',
    tiers: {
      tier1_deterministic: 'online',
      tier2_workers_ai: env.AI ? 'online' : 'unbound',
      tier3_custom_lm: env.CUSTOM_LM_URL ? 'configured' : 'unconfigured',
    },
    routes: [
      'GET /api/substrate/status',
      'POST /api/substrate/greenhouse',
      'POST /api/substrate/infer (JiT Bearer gated)',
    ],
    timestamp: new Date().toISOString(),
  };
}

export async function handleSubstrateInfer(request: Request, env: SubstrateEnv): Promise<Response> {
  if (!env.SUBSTRATE_TOKEN) {
    return Response.json(
      { ok: false, error: 'Fail-closed: SUBSTRATE_TOKEN secret is not configured.' },
      { status: 503 },
    );
  }

  const auth = request.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${env.SUBSTRATE_TOKEN}`) {
    return Response.json({ ok: false, error: 'Unauthorized: JiT Bearer token required.' }, { status: 401 });
  }

  let body: { prompt?: unknown; context?: unknown };
  try {
    body = (await request.json()) as { prompt?: unknown; context?: unknown };
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 1000) {
    return Response.json({ ok: false, error: 'prompt must be 1–1000 characters.' }, { status: 400 });
  }
  if (hasInjectionSignal(prompt)) {
    return Response.json({ ok: false, error: 'Blocked by Shaman input gate.' }, { status: 403 });
  }

  // Tier 3: Custom LM if configured (6s fail-closed timeout)
  if (env.CUSTOM_LM_URL) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const lmRes = await fetch(env.CUSTOM_LM_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(env.CUSTOM_LM_TOKEN ? { Authorization: `Bearer ${env.CUSTOM_LM_TOKEN}` } : {}),
        },
        body: JSON.stringify({ prompt, context: body.context ?? null }),
      });
      clearTimeout(timer);
      if (lmRes.ok) {
        const data = await lmRes.json();
        return Response.json({ ok: true, tier: 'tier3_custom_lm', data });
      }
    } catch {
      clearTimeout(timer);
    }
  }

  // Tier 2 fallback: Edge Workers AI
  if (env.AI) {
    const aiRes = (await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: 'You are the Delta Quadrant collective-substrate assistant, running on Cloudflare Workers AI (Meta Llama 3.2 3B, @cf/meta/llama-3.2-3b-instruct) — not a custom in-house model. Be concise and factual.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 240,
      temperature: 0.2,
    })) as { response?: string };
    return Response.json({
      ok: true,
      tier: 'tier2_workers_ai',
      response: (aiRes?.response ?? '').trim(),
    });
  }

  return Response.json({ ok: false, error: 'No inference backend available.' }, { status: 503 });
}
