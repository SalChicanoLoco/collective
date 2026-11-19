import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME_BIN =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HITL_TOKEN = process.env.QC_HITL_TOKEN ?? '';
const ALLOW_ORIGIN = process.env.QC_ALLOW_ORIGIN ?? '';

// Fail-closed JiT web access gate: deny all unless an active HITL token and target origin are provided.
if (!HITL_TOKEN.startsWith('HITL-') || !ALLOW_ORIGIN) {
  console.error(
    'DENIED: JiT web access is disabled by default. Provide QC_HITL_TOKEN (HITL-...) and QC_ALLOW_ORIGIN to initiate a QC job.',
  );
  process.exit(1);
}

let allowedOriginUrl;
try {
  allowedOriginUrl = new URL(ALLOW_ORIGIN);
} catch {
  console.error(`DENIED: Invalid QC_ALLOW_ORIGIN: ${ALLOW_ORIGIN}`);
  process.exit(1);
}
const TARGET_ORIGIN = allowedOriginUrl.origin;

function startHeadlessChrome(userDataDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      CHROME_BIN,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=0',
        `--user-data-dir=${userDataDir}`,
        'about:blank',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`Timed out waiting for Chrome DevTools WS URL. stderr: ${stderr}`));
    }, 15000);

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve({ proc, browserWsUrl: match[1] });
      }
    });

    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early with code ${code}: ${stderr}`));
    });
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(`${msg.error.code}: ${msg.error.message}`));
        } else {
          resolve(msg.result);
        }
      } else if (msg.method && this.listeners.has(msg.method)) {
        for (const fn of this.listeners.get(msg.method)) {
          fn(msg.params);
        }
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout on ${method}`));
      }, 20000);

      this.pending.set(id, {
        resolve: (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  close() {
    this.ws.close();
  }
}

async function runQc() {
  const userDataDir = mkdtempSync(join(tmpdir(), 'sena-qc-chrome-'));
  let chromeProc;
  let client;

  try {
    const { proc, browserWsUrl } = await startHeadlessChrome(userDataDir);
    chromeProc = proc;

    const port = new URL(browserWsUrl).port;
    const targetsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') ?? targets[0];
    if (!pageTarget?.webSocketDebuggerUrl) {
      throw new Error('No inspectable page target found in headless Chrome');
    }

    client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    const consoleErrors = [];
    const pageExceptions = [];
    const httpErrors = [];
    const blockedOffOrigin = [];

    client.on('Runtime.consoleAPICalled', (p) => {
      if (p.type === 'error') {
        consoleErrors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' '));
      }
    });
    client.on('Runtime.exceptionThrown', (p) => {
      pageExceptions.push(p.exceptionDetails?.text ?? 'Uncaught exception');
    });
    client.on('Network.responseReceived', (p) => {
      if (p.response.status >= 400) {
        httpErrors.push(`${p.response.status} ${p.response.url}`);
      }
    });

    // Enforce JiT single-origin allowlist inside Chrome itself
    await client.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    client.on('Fetch.requestPaused', async (p) => {
      try {
        const reqOrigin = new URL(p.request.url).origin;
        if (reqOrigin === TARGET_ORIGIN || p.request.url.startsWith('data:')) {
          await client.send('Fetch.continueRequest', { requestId: p.requestId });
        } else {
          blockedOffOrigin.push(p.request.url);
          await client.send('Fetch.failRequest', {
            requestId: p.requestId,
            errorReason: 'AccessDenied',
          });
        }
      } catch {
        await client.send('Fetch.failRequest', {
          requestId: p.requestId,
          errorReason: 'Failed',
        });
      }
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');

    const loadPromise = new Promise((resolve) => {
      client.on('Page.loadEventFired', resolve);
    });
    await client.send('Page.navigate', { url: `${TARGET_ORIGIN}/` });
    await loadPromise;
    await client.send('Runtime.evaluate', {
      expression: `(async () => {
        for (const img of document.querySelectorAll('img')) {
          img.scrollIntoView({ behavior: 'instant', block: 'center' });
          await new Promise(r => setTimeout(r, 400));
        }
        window.scrollTo(0, 0);
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    await new Promise((r) => setTimeout(r, 600));

    const evalJson = async (expr) => {
      const res = await client.send('Runtime.evaluate', {
        expression: `JSON.stringify((() => { ${expr} })())`,
        returnByValue: true,
      });
      return JSON.parse(res.result.value);
    };

    const domReport = await evalJson(`
      const imgs = [...document.querySelectorAll('img')].map(img => ({
        src: img.getAttribute('src'),
        complete: img.complete,
        naturalWidth: img.naturalWidth
      }));
      const mailOk = document.querySelector('a[href="mailto:salvadorsena@senacolectivo.com"]') !== null;
      const telOk = document.querySelector('a[href="tel:+15054519341"]') !== null;
      const internalHrefs = [...new Set(
        [...document.querySelectorAll('a[href]')]
          .map(a => a.getAttribute('href'))
          .filter(h => h && h.startsWith('/') && !h.startsWith('//'))
      )];

      document.querySelector('[data-lang-button="es"]')?.click();
      const langEs = document.documentElement.lang;
      document.querySelector('[data-lang-button="en"]')?.click();
      const langEn = document.documentElement.lang;

      return { imgs, mailOk, telOk, langEs, langEn, internalHrefs };
    `);

    const subpageResults = [];
    for (const path of domReport.internalHrefs) {
      const res = await fetch(`${TARGET_ORIGIN}${path}`);
      subpageResults.push({ path, status: res.status });
    }

    const brokenImgs = domReport.imgs.filter((i) => !i.complete || i.naturalWidth === 0);
    const failedSubpages = subpageResults.filter((s) => s.status !== 200);

    const summary = {
      hitlToken: HITL_TOKEN,
      origin: TARGET_ORIGIN,
      imagesChecked: domReport.imgs.length,
      brokenImgs,
      langToggle: { es: domReport.langEs === 'es', en: domReport.langEn === 'en' },
      contact: { mailOk: domReport.mailOk, telOk: domReport.telOk },
      subpagesChecked: subpageResults.length,
      failedSubpages,
      consoleErrors,
      pageExceptions,
      httpErrors,
      blockedOffOrigin,
    };

    console.log(JSON.stringify(summary, null, 2));

    if (
      brokenImgs.length > 0 ||
      !summary.langToggle.es ||
      !summary.langToggle.en ||
      !summary.contact.mailOk ||
      !summary.contact.telOk ||
      failedSubpages.length > 0 ||
      consoleErrors.length > 0 ||
      pageExceptions.length > 0 ||
      httpErrors.length > 0
    ) {
      process.exitCode = 1;
    }
  } finally {
    client?.close();
    chromeProc?.kill('SIGKILL');
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

runQc().catch((err) => {
  console.error('QC failed:', err);
  process.exit(1);
});
