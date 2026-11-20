#!/usr/bin/env node
/**
 * Zero-dependency Publication, Work & Module Pre-Processor
 * Usage:
 *   npm run ingest -- <input.md|input.tex|input.html> [--slug my-work] [--mode page|tabs|module] [--title "My Work"] [--author "Salvador Sena"]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUB_DIR = path.join(ROOT, 'public', 'publications');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'works-manifest.json');

function parseArgs(argv) {
  const args = { input: '', slug: '', mode: 'page', title: '', author: 'Salvador Sena', kicker: 'Research & Engineering' };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--slug' && argv[i + 1]) args.slug = argv[++i];
    else if (a === '--mode' && argv[i + 1]) args.mode = argv[++i];
    else if (a === '--title' && argv[i + 1]) args.title = argv[++i];
    else if (a === '--author' && argv[i + 1]) args.author = argv[++i];
    else if (a === '--kicker' && argv[i + 1]) args.kicker = argv[++i];
    else if (!a.startsWith('-')) rest.push(a);
  }
  args.input = rest[0] || '';
  return args;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'untitled-work';
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseFrontmatter(raw) {
  const meta = {};
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) return { meta, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta, body: raw };
  const fm = raw.slice(4, end).split(/\r?\n/);
  for (const line of fm) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      const k = line.slice(0, colon).trim();
      const v = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
      meta[k] = v;
    }
  }
  return { meta, body: raw.slice(end + 4).trim() };
}

function latexToSimpleMathML(tex) {
  let inner = tex.trim();
  const fracRe = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g;
  inner = inner.replace(fracRe, '<mfrac><mrow>$1</mrow><mrow>$2</mrow></mfrac>');
  inner = inner
    .replace(/\\Delta\s*/g, '&#x0394;')
    .replace(/\\alpha\s*/g, '&#x03B1;')
    .replace(/\\beta\s*/g, '&#x03B2;')
    .replace(/\\Sigma\s*/g, '&#x2211;')
    .replace(/\\cdot\s*/g, '<mo>&#x22C5;</mo>')
    .replace(/\\approx\s*/g, '<mo>&#x2248;</mo>')
    .replace(/\\text\{([^{}]+)\}/g, '<mtext>$1</mtext>')
    .replace(/([A-Za-z0-9&#;]+)_\{([^{}]+)\}/g, '<msub><mi>$1</mi><mi>$2</mi></msub>')
    .replace(/([A-Za-z0-9&#;]+)_([A-Za-z0-9])/g, '<msub><mi>$1</mi><mi>$2</mi></msub>')
    .replace(/([A-Za-z0-9&#;]+)\^\{([^{}]+)\}/g, '<msup><mi>$1</mi><mn>$2</mn></msup>')
    .replace(/([A-Za-z0-9&#;]+)\^([A-Za-z0-9])/g, '<msup><mi>$1</mi><mn>$2</mn></msup>');
  return `<math display="block" aria-label="${escapeHtml(tex.trim())}"><mrow>${inner}</mrow></math>`;
}

function markdownToHtml(md) {
  let text = md.replace(/\r\n/g, '\n');

  // Extract fenced code / bibtex blocks first
  const codeBlocks = [];
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code class="language-${escapeHtml(lang || 'text')}">${escapeHtml(code.trim())}</code></pre>`);
    return `@@CODEBLOCK_${idx}@@`;
  });

  // Display math $$...$$ -> MathML + collapsible LaTeX source
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const idx = codeBlocks.length;
    const mml = latexToSimpleMathML(tex);
    codeBlocks.push(
      `<div class="eq-box">${mml}<details style="margin-top:0.75rem"><summary style="cursor:pointer;font-size:0.85rem;opacity:0.85">LaTeX source</summary><pre style="margin:0.5rem 0 0;overflow-x:auto"><code>${escapeHtml(tex.trim())}</code></pre></details></div>`,
    );
    return `@@CODEBLOCK_${idx}@@`;
  });

  const lines = text.split('\n');
  const out = [];
  let inList = false;

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  const inlineFmt = (s) =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith('@@CODEBLOCK_')) {
      flushList();
      out.push(line);
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      out.push(`<h3>${inlineFmt(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      flushList();
      out.push(`<h2>${inlineFmt(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      flushList();
      out.push(`<h1>${inlineFmt(line.slice(2))}</h1>`);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineFmt(line.slice(2))}</li>`);
    } else {
      flushList();
      out.push(`<p>${inlineFmt(line)}</p>`);
    }
  }
  flushList();

  return out.join('\n').replace(/@@CODEBLOCK_(\d+)@@/g, (_, idx) => codeBlocks[Number(idx)] || '');
}

function texToMarkdown(tex) {
  return tex
    .replace(/\\section\*?\{([^}]+)\}/g, '\n## $1\n')
    .replace(/\\subsection\*?\{([^}]+)\}/g, '\n### $1\n')
    .replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, '\n$$\n$1\n$$\n')
    .replace(/\\begin\{itemize\}|\\end\{itemize\}/g, '')
    .replace(/\\item\s+/g, '- ')
    .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
    .replace(/\\emph\{([^}]+)\}/g, '*$1*');
}

function wrapHtmlShell({ title, kicker, author, bodyHtml, mode, tabs }) {
  const tabNav =
    mode === 'tabs' && tabs.length
      ? `<div class="button-row" role="tablist" style="margin-bottom:1.25rem;">${tabs
          .map(
            (t, i) =>
              `<button type="button" class="button${i === 0 ? ' button--primary' : ''}" role="tab" data-tab-target="${t.id}" aria-selected="${i === 0 ? 'true' : 'false'}">${escapeHtml(t.label)}</button>`,
          )
          .join('')}</div>`
      : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | Sena Colectivo</title>
<link rel="stylesheet" href="/assets/css/subpage-theme.css">
<script src="/assets/js/site.js" defer></script>
${mode === 'tabs' ? '<script src="/assets/js/work-tabs.js" defer></script>' : ''}
</head>
<body>
<header class="mast">
  <a class="brand" href="/">Sena's AI Collective</a>
  <div class="kicker">${escapeHtml(kicker)}</div>
</header>
<section class="hero">
  <div class="wrap">
    <div class="kicker">${escapeHtml(kicker)}</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${escapeHtml(author)} · Sena Colectivo</div>
    <nav class="nav">
      <a class="btn" href="/publications/">All Publications</a>
      <a class="btn" href="/">Home</a>
    </nav>
  </div>
</section>
<main class="section">
  <div class="wrap">
    ${tabNav}
    ${bodyHtml}
  </div>
</main>
<footer><div class="wrap">Sena Colectivo · Pre-processed static artifact</div></footer>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error('Usage: npm run ingest -- <file.md|file.tex|file.html> [--slug slug] [--mode page|tabs|module]');
    process.exit(1);
  }
  const absInput = path.resolve(ROOT, args.input);
  if (!fs.existsSync(absInput)) {
    console.error('Input not found:', absInput);
    process.exit(1);
  }

  const raw = fs.readFileSync(absInput, 'utf8');
  const ext = path.extname(absInput).toLowerCase();
  const { meta, body } = parseFrontmatter(raw);
  const title = args.title || meta.title || path.basename(absInput, ext);
  const slug = args.slug || meta.slug || slugify(title);
  const author = args.author || meta.author || 'Salvador Sena';
  const kicker = args.kicker || meta.kicker || 'Research & Engineering';
  const mode = args.mode || meta.mode || 'page';

  let bodyHtml = '';
  if (ext === '.html') {
    bodyHtml = body;
  } else if (ext === '.tex') {
    bodyHtml = markdownToHtml(texToMarkdown(body));
  } else {
    bodyHtml = markdownToHtml(body);
  }

  const outDir = path.join(PUB_DIR, slug);
  fs.mkdirSync(outDir, { recursive: true });

  const tabs = [
    { id: 'tab-brief', label: 'Brief & Narrative' },
    { id: 'tab-source', label: 'Metadata & Manifest' },
  ];

  const finalBody =
    mode === 'tabs'
      ? `<div id="tab-brief" data-tab-panel>${bodyHtml}</div><div id="tab-source" data-tab-panel hidden><pre><code>${escapeHtml(JSON.stringify({ slug, title, author, kicker, mode, source: path.relative(ROOT, absInput) }, null, 2))}</code></pre></div>`
      : bodyHtml;

  if (mode !== 'module') {
    const html = wrapHtmlShell({ title, kicker, author, bodyHtml: finalBody, mode, tabs });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  }

  const pubData = {
    slug,
    title,
    author,
    kicker,
    mode,
    publisher: 'Sena Colectivo',
    ingestedAt: new Date().toISOString(),
    href: `/publications/${slug}/`,
  };
  fs.writeFileSync(path.join(outDir, 'publication-data.json'), JSON.stringify(pubData, null, 2) + '\n', 'utf8');

  let manifest = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
      manifest = [];
    }
  }
  const idx = manifest.findIndex((x) => x.slug === slug);
  if (idx >= 0) manifest[idx] = pubData;
  else manifest.push(pubData);
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`Ingested [${mode}] -> public/publications/${slug}/ & src/data/works-manifest.json`);
}

main();
