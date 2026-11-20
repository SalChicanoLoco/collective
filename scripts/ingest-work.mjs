#!/usr/bin/env node
/**
 * Zero-dependency Publication, Work & Module Pre-Processor
 * Usage:
 *   npm run ingest -- <input.md|input.tex|input.html> [--slug my-work] [--mode page|tabs|module] [--title "My Work"] [--author "Salvador Sena"] [--pdf "file.pdf"]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUB_DIR = path.join(ROOT, 'public', 'publications');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'works-manifest.json');

function parseArgs(argv) {
  const args = {
    input: '',
    slug: '',
    mode: 'page',
    title: '',
    author: 'Salvador Sena',
    kicker: 'Research & Engineering',
    pdf: '',
    pdf2: '',
  };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--slug' && argv[i + 1]) args.slug = argv[++i];
    else if (a === '--mode' && argv[i + 1]) args.mode = argv[++i];
    else if (a === '--title' && argv[i + 1]) args.title = argv[++i];
    else if (a === '--author' && argv[i + 1]) args.author = argv[++i];
    else if (a === '--kicker' && argv[i + 1]) args.kicker = argv[++i];
    else if (a === '--pdf' && argv[i + 1]) args.pdf = argv[++i];
    else if (a === '--pdf2' && argv[i + 1]) args.pdf2 = argv[++i];
    else if (!a.startsWith('-')) rest.push(a);
  }
  args.input = rest[0] || '';
  return args;
}

function slugify(str) {
  return (
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'untitled-work'
  );
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

function latexToSimpleMathML(tex, display = 'block') {
  let inner = tex.trim();
  const fracRe = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g;
  inner = inner.replace(fracRe, '<mfrac><mrow>$1</mrow><mrow>$2</mrow></mfrac>');
  inner = inner
    .replace(/\\Delta\s*/g, '&#x0394;')
    .replace(/\\alpha\s*/g, '&#x03B1;')
    .replace(/\\beta\s*/g, '&#x03B2;')
    .replace(/\\omega\s*/g, '&#x03C9;')
    .replace(/\\rho\s*/g, '&#x03C1;')
    .replace(/\\pi\s*/g, '&#x03C0;')
    .replace(/\\Sigma\s*/g, '&#x2211;')
    .replace(/\\sum\s*/g, '&#x2211;')
    .replace(/\\vec\{([^{}]+)\}/g, '$1&#x20D7;')
    .replace(/\\cdot\s*/g, '<mo>&#x22C5;</mo>')
    .replace(/\\times\s*/g, '<mo>&#x00D7;</mo>')
    .replace(/\\approx\s*/g, '<mo>&#x2248;</mo>')
    .replace(/\\le\s*/g, '<mo>&#x2264;</mo>')
    .replace(/\\ge\s*/g, '<mo>&#x2265;</mo>')
    .replace(/\\rightarrow\s*|\\longrightarrow\s*|\\to\s*/g, '<mo>&#x2192;</mo>')
    .replace(/\\text\{([^{}]+)\}/g, '<mtext>$1</mtext>')
    .replace(/\\mathrm\{([^{}]+)\}/g, '<mtext>$1</mtext>')
    .replace(/([A-Za-z0-9&#;]+)_\{([^{}]+)\}/g, '<msub><mi>$1</mi><mi>$2</mi></msub>')
    .replace(/([A-Za-z0-9&#;]+)_([A-Za-z0-9])/g, '<msub><mi>$1</mi><mi>$2</mi></msub>')
    .replace(/([A-Za-z0-9&#;]+)\^\{([^{}]+)\}/g, '<msup><mi>$1</mi><mn>$2</mn></msup>')
    .replace(/([A-Za-z0-9&#;]+)\^([A-Za-z0-9])/g, '<msup><mi>$1</mi><mn>$2</mn></msup>');
  const dispAttr = display === 'block' ? ' display="block"' : '';
  return `<math${dispAttr} aria-label="${escapeHtml(tex.trim())}"><mrow>${inner}</mrow></math>`;
}

function markdownToHtml(md) {
  let text = md.replace(/\r\n/g, '\n');

  // Preserve raw HTML blocks emitted by texToMarkdown (tables, callouts)
  const rawBlocks = [];
  text = text.replace(/<!--RAW_BLOCK_START-->([\s\S]*?)<!--RAW_BLOCK_END-->/g, (_, html) => {
    const idx = rawBlocks.length;
    rawBlocks.push(html.trim());
    return `@@RAWBLOCK_${idx}@@`;
  });

  // Extract fenced code / bibtex blocks
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = rawBlocks.length;
    rawBlocks.push(`<pre><code class="language-${escapeHtml(lang || 'text')}">${escapeHtml(code.trim())}</code></pre>`);
    return `@@RAWBLOCK_${idx}@@`;
  });

  // Display math $$...$$ -> MathML + collapsible LaTeX source
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const idx = rawBlocks.length;
    const mml = latexToSimpleMathML(tex, 'block');
    rawBlocks.push(
      `<div class="eq-box">${mml}<details style="margin-top:0.75rem"><summary style="cursor:pointer;font-size:0.85rem;opacity:0.85">LaTeX source</summary><pre style="margin:0.5rem 0 0;overflow-x:auto"><code>${escapeHtml(tex.trim())}</code></pre></details></div>`,
    );
    return `@@RAWBLOCK_${idx}@@`;
  });

  // Inline math $...$ -> inline MathML
  text = text.replace(/\$([^$\n]{1,120})\$/g, (_, tex) => {
    const idx = rawBlocks.length;
    rawBlocks.push(latexToSimpleMathML(tex, 'inline'));
    return `@@RAWBLOCK_${idx}@@`;
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
    if (/^@@RAWBLOCK_\d+@@$/.test(line)) {
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

  let finalHtml = out.join('\n');
  for (let pass = 0; pass < 2; pass++) {
    finalHtml = finalHtml.replace(/@@RAWBLOCK_(\d+)@@/g, (_, idx) => rawBlocks[Number(idx)] || '');
  }
  return finalHtml;
}

function texTableToHtml(inner) {
  const cleaned = inner
    .replace(/\\toprule|\\midrule|\\bottomrule|\\hline/g, '')
    .replace(/\\caption\{([^}]+)\}/g, '')
    .replace(/\\label\{[^}]+\}/g, '')
    .trim();
  const rows = cleaned
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter((r) => r && r.includes('&'));
  if (!rows.length) return '';
  const trs = rows.map((r, ri) => {
    const cells = r.split('&').map((c) => escapeHtml(c.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1').trim()));
    const tag = ri === 0 ? 'th' : 'td';
    return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
  });
  return `<!--RAW_BLOCK_START--><table>${trs.join('')}</table><!--RAW_BLOCK_END-->`;
}

function texToMarkdown(rawTex) {
  // Strip preamble before \begin{document} and everything after \end{document}
  let tex = rawTex;
  const docStart = tex.indexOf('\\begin{document}');
  if (docStart !== -1) tex = tex.slice(docStart + '\\begin{document}'.length);
  const docEnd = tex.indexOf('\\end{document}');
  if (docEnd !== -1) tex = tex.slice(0, docEnd);

  // Strip LaTeX comments (unescaped %)
  tex = tex.replace(/(^|[^\\])%.*$/gm, '$1');

  // Remove layout/macro boilerplate
  tex = tex
    .replace(/\\(maketitle|tableofcontents|newpage|clearpage|noindent|centering|small|footnotesize|normalsize|large|Large)\b/g, '')
    .replace(/\\(thispagestyle|pagestyle|vspace|hspace|label|ref)\{[^}]*\}/g, '')
    .replace(/\\begin\{center\}|\\end\{center\}|\\begin\{multicols\}\{[^}]*\}|\\end\{multicols\}/g, '')
    .replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, '\n*\\[Figure — see compiled PDF for vector diagram\\]*\n')
    .replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '\n*\\[Vector Diagram — see compiled PDF\\]*\n')
    .replace(/\\begin\{tcolorbox\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{tcolorbox\}/g, (_, c) => `\n<!--RAW_BLOCK_START--><div class="callout">${escapeHtml(c.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1').trim())}</div><!--RAW_BLOCK_END-->\n`)
    .replace(/\\begin\{table\*?\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{table\*?\}/g, (_, inner) => {
      const m = inner.match(/\\begin\{(?:tabular|tabularx)\}(?:\{[^}]*\})+([\s\S]*?)\\end\{(?:tabular|tabularx)\}/);
      return m ? `\n${texTableToHtml(m[1])}\n` : '';
    })
    .replace(/\\begin\{(?:tabular|tabularx)\}(?:\{[^}]*\})+([\s\S]*?)\\end\{(?:tabular|tabularx)\}/g, (_, inner) => `\n${texTableToHtml(inner)}\n`)
    .replace(/\\begin\{(?:lstlisting|verbatim)\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{(?:lstlisting|verbatim)\}/g, (_, code) => `\n\`\`\`text\n${code.trim()}\n\`\`\`\n`)
    .replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, (_, abs) => `\n## Abstract\n\n${abs.trim()}\n`)
    .replace(/\\begin\{(?:equation|align)\*?\}([\s\S]*?)\\end\{(?:equation|align)\*?\}/g, (_, eq) => `\n$$\n${eq.trim()}\n$$\n`)
    .replace(/\\section\*?\{([^}]+)\}/g, '\n## $1\n')
    .replace(/\\subsection\*?\{([^}]+)\}/g, '\n### $1\n')
    .replace(/\\subsubsection\*?\{([^}]+)\}/g, '\n### $1\n')
    .replace(/\\begin\{(?:itemize|enumerate)\}(?:\[[^\]]*\])?|\\end\{(?:itemize|enumerate)\}/g, '')
    .replace(/\\item(?:\[[^\]]*\])?\s+/g, '- ')
    .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)')
    .replace(/\\url\{([^}]+)\}/g, '[$1]($1)')
    .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
    .replace(/\\(?:emph|textit)\{([^}]+)\}/g, '*$1*')
    .replace(/\\texttt\{([^}]+)\}/g, '`$1`')
    .replace(/\\par\b/g, '\n\n')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%');

  return tex;
}

function wrapHtmlShell({ title, kicker, author, bodyHtml, mode, tabs, pdfHref, pdf2Href }) {
  const tabNav =
    mode === 'tabs' && tabs.length
      ? `<div class="button-row" role="tablist" style="margin-bottom:1.25rem;display:flex;gap:8px;flex-wrap:wrap;">${tabs
          .map(
            (t, i) =>
              `<button type="button" class="btn${i === 0 ? ' sage' : ''}" role="tab" data-tab-target="${t.id}" aria-selected="${i === 0 ? 'true' : 'false'}">${escapeHtml(t.label)}</button>`,
          )
          .join('')}</div>`
      : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | Sena Colectivo</title>
<style>
:root{--earth:#070a0f;--warm:#0d131c;--panel:#141d2b;--sand:#e8eef5;--muted:#9eb0c4;--faint:#6c8096;--terr:#4cc9f0;--gold:#4cc9f0;--sage:#f4a261;--border:rgba(76,201,240,.2);--serif:Fraunces,Georgia,'Times New Roman',serif;--sans:system-ui,-apple-system,sans-serif;--mono:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--earth);color:var(--sand);font-family:var(--sans);line-height:1.72}
a{color:var(--gold)}.mast{border-bottom:2px solid var(--terr);padding:16px 24px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;background:var(--warm)}
.brand{font-family:var(--serif);font-weight:900;color:var(--gold);font-size:20px;text-decoration:none}
.wrap{max-width:980px;margin:auto;padding:34px 22px}
.kicker,.meta{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.hero{background:var(--warm);border-bottom:1px solid var(--border)}
h1{font-family:var(--serif);font-size:clamp(28px,4.5vw,44px);line-height:1.12;margin:10px 0 12px}
h2{font-family:var(--serif);color:var(--gold);font-size:24px;margin-top:32px;border-bottom:1px solid var(--border);padding-bottom:6px}
h3{font-family:var(--serif);font-size:19px;margin-top:22px}
.nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.btn{border:1px solid var(--border);background:var(--panel);color:var(--sand);padding:7px 12px;text-decoration:none;font-family:var(--mono);font-size:11px;text-transform:uppercase;cursor:pointer;border-radius:4px}
.btn.sage{background:var(--gold);color:#06090e;border-color:var(--gold);font-weight:700}
.callout,.eq-box{background:var(--warm);border:1px solid var(--border);border-left:4px solid var(--gold);padding:16px 20px;margin:20px 0;border-radius:6px;overflow-x:auto}
table{width:100%;border-collapse:collapse;margin:18px 0;background:var(--warm);font-size:14px}
th,td{padding:10px 12px;border:1px solid var(--border);text-align:left;vertical-align:top}
th{color:var(--gold);font-family:var(--mono);font-size:11px;text-transform:uppercase}
pre{background:var(--panel);border:1px solid var(--border);padding:14px;border-radius:6px;overflow-x:auto;font-family:var(--mono);font-size:12.5px}
code{font-family:var(--mono);font-size:0.9em}
footer{border-top:1px solid var(--border);padding:24px;color:var(--faint);font-family:var(--mono);font-size:11px}
</style>
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
      <a class="btn" href="/publications/staging/">Staging Hub</a>
      <a class="btn" href="/publications/">All Publications</a>
      ${pdfHref ? `<a class="btn sage" href="${escapeHtml(pdfHref)}" target="_blank" rel="noopener">Compiled PDF</a>` : ''}
      ${pdf2Href ? `<a class="btn" href="${escapeHtml(pdf2Href)}" target="_blank" rel="noopener">Hardware PDF</a>` : ''}
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
  const pdfHref = args.pdf || '';
  const pdf2Href = args.pdf2 || '';

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
    const html = wrapHtmlShell({ title, kicker, author, bodyHtml: finalBody, mode, tabs, pdfHref, pdf2Href });
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
