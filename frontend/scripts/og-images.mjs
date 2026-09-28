// Renders the 1200×630 social share images in public/og/ (referenced by
// og:image / twitter:image in src/seo/site.js). Run by hand after changing a
// page's headline — the PNGs are committed, so the server build never needs
// a browser:
//
//   node scripts/og-images.mjs            (finds Chrome or Edge)
//   CHROME_PATH=/path/to/chrome node scripts/og-images.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'og');

const IMAGES = [
  {
    name: 'home',
    eyebrow: 'B2B contact data',
    lines: ['Find work', 'emails.'],
    sub: 'Search people and companies, reveal contacts, build lists.',
  },
  {
    name: 'pricing',
    eyebrow: 'Pricing',
    lines: ['Simple, team-based', 'pricing.'],
    sub: 'From $29/month for 5 paid seats plus 1 free.',
  },
  {
    name: 'product',
    eyebrow: 'Product',
    lines: ['Four things that', 'move pipeline.'],
    sub: 'Search · Reveal · Lists · Credit ledger',
  },
  {
    name: 'solutions',
    eyebrow: 'Solutions',
    lines: ["Built for whoever's", 'chasing the number.'],
    sub: 'Sales leaders, AEs, SDRs, RevOps, marketers and founders.',
  },
  {
    name: 'about',
    eyebrow: 'About DataPit',
    lines: ['We got tired of paying', 'for stale lists.'],
    sub: 'So we built the credit ledger first.',
  },
  {
    name: 'contact',
    eyebrow: 'Contact',
    lines: ['Talk to', 'us.'],
    sub: 'Plans, bulk credits, or whether DataPit fits your workflow.',
  },
  {
    name: 'compare',
    eyebrow: 'Comparisons',
    lines: ['Compare B2B', 'data tools.'],
    sub: 'Prices, features and where each tool wins, side by side.',
  },
  {
    name: 'features',
    eyebrow: 'Features',
    lines: ['Search, reveal,', 'prospect.'],
    sub: 'One workspace and one credit ledger for B2B prospecting.',
  },
  {
    name: 'extension',
    eyebrow: 'Chrome extension',
    lines: ['Find emails on', 'LinkedIn.'],
    sub: 'Look up any profile against DataPit as you browse.',
  },
  {
    name: 'tools',
    eyebrow: 'Free tools',
    lines: ['Free email', 'tools.'],
    sub: 'Check an email address before you send. No sign-up.',
  },
  {
    name: 'guide',
    eyebrow: 'Guides',
    lines: ['Prospecting', 'guides.'],
    sub: 'Find work emails, build lists and write outreach that gets replies.',
  },
  {
    name: 'default',
    eyebrow: 'B2B contact data',
    lines: ['Pay for the data', 'you use.'],
    sub: 'Seat blocks from $29 a month. Start free with 800 credits.',
  },
];

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
const fontFace = (style) =>
  `@font-face{font-family:'M';font-style:${style};font-weight:100 900;src:url(data:font/woff2;base64,${fs
    .readFileSync(fontFile(style))
    .toString('base64')}) format('woff2');}`;
const mark = fs.readFileSync(path.join(root, 'public/logos/datapit-mark.svg'), 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function html({ eyebrow, lines, sub }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFace('normal')}${fontFace('italic')}
*{margin:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:'M',Arial,sans-serif;color:#fff;background:#110019;position:relative}
.glow{position:absolute;inset:0;background:
  radial-gradient(620px 420px at 88% 18%,rgba(170,0,255,.55),transparent 70%),
  radial-gradient(520px 380px at 72% 108%,rgba(207,112,255,.35),transparent 70%),
  radial-gradient(900px 500px at 0% 0%,rgba(68,0,102,.9),transparent 70%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:60px 60px;mask-image:linear-gradient(90deg,transparent,#000 55%,#000)}
.wrap{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px;font-weight:800;font-size:30px;letter-spacing:-.01em}
.brand svg{width:56px;height:56px}
.eyebrow{margin-top:auto;font-size:18px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#cf70ff}
h1{margin-top:18px;font-size:76px;line-height:.98;font-weight:800;text-transform:uppercase;letter-spacing:-.02em}
h1 span{display:block}
h1 span:last-child{background:linear-gradient(90deg,#aa00ff,#be3dff 40%,#cf70ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{margin-top:26px;font-size:26px;font-style:italic;font-weight:500;color:#d9d1dd}
.url{position:absolute;right:72px;top:74px;font-size:20px;font-weight:600;color:#baafc0;letter-spacing:.04em}
</style></head><body><div class="glow"></div><div class="grid"></div>
<div class="wrap"><div class="brand">${mark}<span>DataPit</span></div>
<p class="eyebrow">${esc(eyebrow)}</p>
<h1>${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</h1>
<p class="sub">${esc(sub)}</p></div>
<div class="url">datapit.io</div></body></html>`;
}

const browser = findBrowser();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-og-'));
fs.mkdirSync(outDir, { recursive: true });

for (const image of IMAGES) {
  const htmlPath = path.join(tmp, `${image.name}.html`);
  fs.writeFileSync(htmlPath, html(image));
  const out = path.join(outDir, `${image.name}.png`);
  execFileSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      '--virtual-time-budget=3000',
      `--screenshot=${out}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'ignore' },
  );
  console.log(`og: ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} kB)`);
}

fs.rmSync(tmp, { recursive: true, force: true });
