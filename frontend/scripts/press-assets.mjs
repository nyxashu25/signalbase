// Renders the press kit's PNG downloads into public/press/ (listed on the
// /press page, src/pages/marketing/Press.jsx): the square mark and the
// horizontal wordmark exported from the SVGs in public/logos/, plus two
// 1270×760 gallery images (Product Hunt's recommended size) in the same style
// as the share images from scripts/og-images.mjs. Like those, the PNGs are
// committed, so the server build never needs a browser. Run it by hand after
// changing a logo, a price or a credit cost:
//
//   npm run press-assets                  (finds Chrome or Edge)
//   CHROME_PATH=/path/to/chrome npm run press-assets
//
// Prices and credit costs come from src/data/, so a regenerated gallery image
// always matches the site.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BILLING_INTERVALS, FREE_PLAN_MONTHLY_CREDITS, PLANS } from '../src/data/plans.js';
import { CREDIT_COSTS, formatCount } from '../src/data/facts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'press');
const BRAND_GROUND = '#110019';
const MAX_BYTES = 400 * 1024;

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('No Chrome/Edge found; set CHROME_PATH');
  return found;
}

const fontFile = (style) =>
  path.join(
    root,
    'node_modules/@fontsource-variable/montserrat/files',
    `montserrat-latin-wght-${style}.woff2`,
  );
// Registered as 'Montserrat' too, the family the wordmark SVGs name.
const fontFace = (family, style) =>
  `@font-face{font-family:'${family}';font-style:${style};font-weight:100 900;src:url(data:font/woff2;base64,${fs
    .readFileSync(fontFile(style))
    .toString('base64')}) format('woff2');}`;
const FONTS = ['M', 'Montserrat']
  .flatMap((family) => [fontFace(family, 'normal'), fontFace(family, 'italic')])
  .join('');

const logo = (file) => fs.readFileSync(path.join(root, 'public/logos', file), 'utf8');
const SVGS = {
  mark: logo('datapit-mark.svg'),
  logoLight: logo('datapit-logo-light.svg'),
  logoDark: logo('datapit-logo-dark.svg'),
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** One line, or several (an array) set on separate lines. */
const textLines = (text) => [].concat(text).map(esc).join('<br>');

const browser = findBrowser();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-press-'));

function writeHtml(name, html) {
  const file = path.join(tmp, `${name}.html`);
  fs.writeFileSync(file, html);
  return pathToFileURL(file).href;
}

// --- measuring the artwork --------------------------------------------------
// The SVGs' own artboards carry uneven margins (the wordmark's runs well past
// its text). Render each at 1:1 and read the painted bounds — shapes plus half
// their stroke, text by its glyph box — so every export is cropped to the
// artwork itself. `bar` is the width of the tallest data bar: the brand's
// clear-space unit (DESIGN_LANGUAGE.md, "Logo system").
function measure() {
  const body = Object.entries(SVGS)
    .map(([key, svg]) => `<div data-key="${key}">${svg}</div>`)
    .join('');
  const script = `document.fonts.ready.then(() => {
    const out = {};
    for (const box of document.querySelectorAll('[data-key]')) {
      const svg = box.querySelector('svg');
      const origin = svg.getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, bar = null;
      for (const el of svg.querySelectorAll('circle, rect, path, text')) {
        const r = el.getBoundingClientRect();
        if (el.tagName === 'rect' && (!bar || r.height > bar.height)) bar = r;
        const stroke = el.getAttribute('stroke');
        const pad = stroke && stroke !== 'none'
          ? (parseFloat(el.getAttribute('stroke-width')) || 1) * el.getCTM().a / 2
          : 0;
        x0 = Math.min(x0, r.left - pad); y0 = Math.min(y0, r.top - pad);
        x1 = Math.max(x1, r.right + pad); y1 = Math.max(y1, r.bottom + pad);
      }
      out[box.dataset.key] = { x: x0 - origin.left, y: y0 - origin.top, w: x1 - x0, h: y1 - y0, bar: bar.width };
    }
    document.getElementById('out').textContent = JSON.stringify(out);
  });`;
  const url = writeHtml(
    'measure',
    `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}*{margin:0}svg{display:block}</style></head><body>${body}<pre id="out"></pre><script>${script}</script></body></html>`,
  );
  const dom = execFileSync(
    browser,
    ['--headless=new', '--disable-gpu', '--virtual-time-budget=3000', '--dump-dom', url],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 },
  );
  const json = /<pre id="out">([^<]+)<\/pre>/.exec(dom)?.[1];
  if (!json) throw new Error('Could not measure the logos (no output from the browser)');
  return JSON.parse(json.replace(/&quot;/g, '"'));
}

/** The SVG with its artboard replaced by `viewBox`, drawn at the page's full size. */
function reframe(svg, [x, y, w, h]) {
  return svg.replace(
    /<svg([^>]*?)\swidth="[^"]*"\s+height="[^"]*"\s+viewBox="[^"]*"/,
    `<svg$1 width="100%" height="100%" viewBox="${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}"`,
  );
}

function logoPage(svg, { width, height, background }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0}html,body{width:${width}px;height:${height}px;overflow:hidden;background:${background ?? 'transparent'}}
svg{display:block;width:${width}px;height:${height}px}</style></head><body>${svg}</body></html>`;
}

// --- gallery images ---------------------------------------------------------
const planSeats = (p) =>
  p.block ? `${p.block.paidSeats} paid + ${p.block.freeSeats} free seats` : '1 seat';
const basic = PLANS.find((p) => p.key === 'BASIC');
const discount = (key) =>
  `${Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100)}%`;

const GALLERY = [
  {
    name: 'datapit-gallery-pricing',
    eyebrow: 'Seat-block pricing',
    lines: [`${basic.block.paidSeats + basic.block.freeSeats} seats for`, `$${basic.price} a month.`],
    sub: 'Every seat earns its own monthly credits.',
    panelTitle: 'Plans, per month',
    rows: PLANS.map((p) => ({
      label: p.name,
      detail: [
        planSeats(p),
        p.block
          ? `${formatCount(p.block.paidSeatCredits)} credits per paid seat a month`
          : `${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month`,
      ],
      value: `$${p.price}`,
    })),
    note: `Paid plans are priced per block. Quarterly billing saves ${discount('QUARTER')}, annual ${discount('YEAR')}.`,
  },
  {
    name: 'datapit-gallery-workspace',
    numbered: true,
    eyebrow: 'One workspace',
    lines: ['Search, reveal,', 'build lists.'],
    sub: 'Reveal a contact once and it’s free for your whole team.',
    panelTitle: 'How DataPit works',
    rows: [
      { label: 'Search', detail: 'People and companies, with filters.', value: '01' },
      {
        label: 'Reveal',
        detail: `A work email for ${CREDIT_COSTS.REVEAL} credits, free for the workspace after that.`,
        value: '02',
      },
      { label: 'Lists', detail: 'Save prospects and export them to CSV.', value: '03' },
      {
        label: 'Chrome extension',
        detail: 'Look up the LinkedIn profile you’re viewing. Free.',
        value: '04',
      },
    ],
    note: `Start free with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
  },
];

function galleryPage({ eyebrow, lines, sub, panelTitle, rows, note, numbered }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTS}
*{margin:0;box-sizing:border-box}
html,body{width:1270px;height:760px;overflow:hidden}
body{font-family:'M',Arial,sans-serif;color:#fff;background:${BRAND_GROUND};position:relative}
.glow{position:absolute;inset:0;background:
  radial-gradient(640px 460px at 90% 16%,rgba(170,0,255,.5),transparent 70%),
  radial-gradient(560px 400px at 70% 110%,rgba(207,112,255,.32),transparent 70%),
  radial-gradient(940px 560px at 0% 0%,rgba(68,0,102,.9),transparent 70%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:60px 60px;mask-image:linear-gradient(90deg,transparent,#000 55%,#000)}
.wrap{position:absolute;inset:0;padding:60px 72px 64px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between}
.main{flex:1;min-height:0;margin-top:28px;display:grid;grid-template-columns:1fr 520px;gap:56px}
.left{display:flex;flex-direction:column;justify-content:flex-end}
.brand{display:flex;align-items:center;gap:16px;font-weight:800;font-size:30px;letter-spacing:-.01em}
.brand svg{width:56px;height:56px}
.eyebrow{font-size:18px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#cf70ff}
h1{margin-top:18px;font-size:68px;line-height:1;font-weight:800;text-transform:uppercase;letter-spacing:-.02em}
h1 span{display:block}
h1 span:last-child{background:linear-gradient(90deg,#aa00ff,#be3dff 40%,#cf70ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{margin-top:26px;font-size:25px;font-style:italic;font-weight:500;color:#d9d1dd;max-width:560px}
.panel{align-self:end;border-radius:28px;border:1px solid rgba(255,255,255,.14);background:rgba(24,0,34,.78);box-shadow:0 30px 80px rgba(17,0,25,.55);padding:30px 36px 28px}
.panel h2{font-size:15px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#baafc0}
.row{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.1)}
.row.numbered{grid-template-columns:auto 1fr}
.row:last-of-type{border-bottom:0}
.label{font-size:22px;font-weight:800}
.detail{margin-top:5px;font-size:16px;font-weight:500;color:#baafc0;line-height:1.35}
.value{font-size:34px;font-weight:800;letter-spacing:-.02em;background:linear-gradient(90deg,#be3dff,#cf70ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.numbered .value{font-size:30px;min-width:52px}
.note{margin-top:8px;padding-top:16px;border-top:1px solid rgba(255,255,255,.14);font-size:16px;font-weight:600;color:#d9d1dd}
.url{font-size:20px;font-weight:600;color:#baafc0;letter-spacing:.04em}
</style></head><body><div class="glow"></div><div class="grid"></div>
<div class="wrap"><div class="top"><div class="brand">${SVGS.mark}<span>DataPit</span></div><div class="url">datapit.io</div></div>
<div class="main"><div class="left"><p class="eyebrow">${esc(eyebrow)}</p>
<h1>${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</h1>
<p class="sub">${esc(sub)}</p></div>
<div class="panel"><h2>${esc(panelTitle)}</h2>${rows
    .map((r) =>
      numbered
        ? `<div class="row numbered"><div class="value">${esc(r.value)}</div><div><p class="label">${esc(r.label)}</p><p class="detail">${textLines(r.detail)}</p></div></div>`
        : `<div class="row"><div><p class="label">${esc(r.label)}</p><p class="detail">${textLines(r.detail)}</p></div><div class="value">${esc(r.value)}</div></div>`,
    )
    .join('')}<p class="note">${esc(note)}</p></div></div></div></body></html>`;
}

// --- render -----------------------------------------------------------------
function screenshot(name, html, width, height) {
  const out = path.join(outDir, `${name}.png`);
  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      // Transparent wherever the page paints nothing (the logo exports).
      '--default-background-color=00000000',
      '--virtual-time-budget=3000',
      `--screenshot=${out}`,
      writeHtml(name, html),
    ],
    { stdio: 'ignore' },
  );
  const size = fs.statSync(out).size;
  console.log(`press: ${path.relative(root, out)} ${width}×${height} (${(size / 1024).toFixed(0)} kB)`);
  if (size > MAX_BYTES) throw new Error(`${name}.png is over ${MAX_BYTES / 1024} kB`);
}

fs.mkdirSync(outDir, { recursive: true });
const bounds = measure();

// Square mark: the artwork centered, its longer side 72% of the canvas, so it
// also survives the circular crop LinkedIn, X and Product Hunt apply.
const m = bounds.mark;
const side = Math.max(m.w, m.h) / 0.72;
const squareMark = reframe(SVGS.mark, [m.x + m.w / 2 - side / 2, m.y + m.h / 2 - side / 2, side, side]);
for (const size of [400, 1024]) {
  screenshot(`datapit-mark-${size}`, logoPage(squareMark, { width: size, height: size }), size, size);
  screenshot(
    `datapit-mark-on-dark-${size}`,
    logoPage(squareMark, { width: size, height: size, background: BRAND_GROUND }),
    size,
    size,
  );
}

// Horizontal wordmark, 1200px wide, cropped to the artwork plus its clear
// space.
const WORDMARK_WIDTH = 1200;
for (const [key, name] of [
  ['logoLight', 'datapit-logo-light'],
  ['logoDark', 'datapit-logo-dark'],
]) {
  const b = bounds[key];
  const pad = b.bar;
  const box = [b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad];
  const height = Math.round((WORDMARK_WIDTH * box[3]) / box[2]);
  screenshot(name, logoPage(reframe(SVGS[key], box), { width: WORDMARK_WIDTH, height }), WORDMARK_WIDTH, height);
}

for (const image of GALLERY) screenshot(image.name, galleryPage(image), 1270, 760);

fs.rmSync(tmp, { recursive: true, force: true });
