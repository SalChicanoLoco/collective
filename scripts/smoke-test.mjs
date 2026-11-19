const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:8787';

const REQUIRED_SECURITY_HEADERS = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
  'content-security-policy',
];

async function checkWorker() {
  const home = await fetch(`${BASE_URL}/`);
  const homeType = home.headers.get('content-type') ?? '';
  if (!home.ok || !homeType.includes('text/html')) {
    throw new Error(`Expected 200 text/html for /, got ${home.status} (${homeType})`);
  }

  const missingHeaders = REQUIRED_SECURITY_HEADERS.filter((h) => !home.headers.has(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing security headers on /: ${missingHeaders.join(', ')}`);
  }

  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthType = healthRes.headers.get('content-type') ?? '';
  if (!healthRes.ok || !healthType.includes('application/json')) {
    throw new Error(`Expected 200 application/json for /api/health, got ${healthRes.status} (${healthType})`);
  }
  const health = await healthRes.json();
  if (health.ok !== true) {
    throw new Error(`Expected health.ok === true, got ${JSON.stringify(health)}`);
  }

  const notFoundRes = await fetch(`${BASE_URL}/api/nonexistent`);
  if (notFoundRes.status !== 404) {
    throw new Error(`Expected 404 for /api/nonexistent, got ${notFoundRes.status}`);
  }
  const notFound = await notFoundRes.json();
  if (typeof notFound.error !== 'string') {
    throw new Error(`Expected error string for /api/nonexistent, got ${JSON.stringify(notFound)}`);
  }

  console.log(`All Worker smoke checks passed against ${BASE_URL}`);
}

checkWorker().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
