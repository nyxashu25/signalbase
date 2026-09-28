// Post-build step (see "build" in package.json): writes a static HTML file for
// every public marketing page, plus the 404 page, the app shell and the
// sitemap, into dist/. Pages come from the SSR bundle built from
// src/prerender/entry-server.jsx; head tags come from src/seo/site.js.
//
// Output, as nginx serves it (deploy/nginx/datapit.io.conf):
//   dist/index.html              /                 (home)
//   dist/<page>.html             /<page>           (pricing, product, ...)
//   dist/<section>/<slug>.html   /<section>/<slug> (content pages, email formats)
//   dist/404.html                any unknown URL, with a 404 status
//   dist/app.html                /app, /control and the auth screens (noindex)
//   dist/sitemap.xml
//   dist/llms.txt, dist/llms-full.txt   summaries for AI assistants (src/seo/llms.js)
//
// Email-format pages need the API: set PRERENDER_API_URL (the deploy uses
// http://127.0.0.1:4000). Without it they're skipped.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Production React: no dev-only warnings (useLayoutEffect on the server) and
// the same output the live bundle renders.
process.env.NODE_ENV = 'production';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssrEntry = path.join(root, 'dist-ssr', 'entry-server.js');

const {
  render,
  SEO_ROUTES,
  PUBLIC_ROUTES,
  CONTENT_PAGES,
  NOT_FOUND_META,
  PRIVATE_META,
  EMAIL_FORMAT_INDEX_META,
  emailFormatMeta,
  metaForPath,
  contentBody,
  headElements,
  llmsTxt,
  llmsFullTxt,
} = await import(pathToFileURL(ssrEntry).href);

const SITE_URL = 'https://datapit.io';
const SLOTS = ['<!--app-head-->', '<!--app-html-->'];

// The template is Vite's dist/index.html, which this script then overwrites
// with the home page. Keep the pristine copy beside the SSR bundle (rebuilt,
// and so refreshed, on every build) so the script can run again on its own.
const templateCache = path.join(root, 'dist-ssr', 'index.template.html');
let template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (SLOTS.every((slot) => template.includes(slot))) {
  fs.writeFileSync(templateCache, template);
} else if (fs.existsSync(templateCache)) {
  template = fs.readFileSync(templateCache, 'utf8');
} else {
  throw new Error('dist/index.html has no prerender slots; run `vite build` first');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// JSON inside <script>: escape `<` so no string can close the tag early.
const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function toTag({ tag, attrs, text }) {
  const attrText = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
    .join('');
  if (tag === 'script') return `<script${attrText} data-seo>${text.replace(/</g, '\\u003c')}</script>`;
  return `<${tag}${attrText} data-seo />`;
}

// The latin subset of the self-hosted Montserrat carries the first paint;
// preloading it saves a round trip behind the stylesheet.
const fontPreloads = fs
  .readdirSync(path.join(dist, 'assets'))
  .filter((f) => /^montserrat-latin-wght-normal-.*\.woff2$/.test(f))
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`);

function headHtml(meta, body) {
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    ...fontPreloads,
    ...headElements(meta, body).map(toTag),
  ].join('\n    ');
}

// `body` is a content page's object (for its FAQ structured data); `data` is
// a data-driven page's props, embedded for the client's first render (see
// src/prerender/pageData.js).
function page(meta, appHtml, { body, data } = {}) {
  let html = template
    .replace(/<title>[^<]*<\/title>\s*/, '')
    .replace(/<!--\s*Build-time slots[\s\S]*?-->\s*/, '')
    .replace('<!--app-head-->', headHtml(meta, body))
    .replace('<!--app-html-->', appHtml);
  if (data) {
    const tag = `<script id="dp-page-data" type="application/json">${scriptJson({ path: meta.path, data })}</script>`;
    html = html.replace('</body>', `  ${tag}\n  </body>`);
  }
  return html;
}

const QUIET = process.env.PRERENDER_QUIET === '1';
let written = 0;
function write(file, html) {
  const out = path.join(dist, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  written += 1;
  if (!QUIET) console.log(`prerender: ${file} (${(Buffer.byteLength(html) / 1024).toFixed(1)} kB)`);
}

const fileFor = (p) => (p === '/' ? 'index.html' : `${p.slice(1)}.html`);

async function fetchEmailFormats() {
  const base = process.env.PRERENDER_API_URL;
  if (!base) {
    console.log('prerender: PRERENDER_API_URL unset — no email-format pages');
    return null;
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/public/email-formats`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    console.log(`prerender: ${json.companies?.length ?? 0} email-format pages from the API`);
    return json;
  } catch (err) {
    console.log(`prerender: email formats unavailable (${err.message}) — no email-format pages`);
    return null;
  }
}

// The shell for app, admin and auth routes — written first, from the
// untouched template, before index.html becomes the home page.
write('app.html', page(PRIVATE_META, ''));

for (const route of SEO_ROUTES) {
  write(fileFor(route.path), page(route, render(route.path)));
}

// Content pages — published or not: an unpublished page still answers at its
// URL, with noindex, so it can be reviewed before it goes live.
for (const entry of CONTENT_PAGES) {
  const meta = metaForPath(entry.path);
  write(fileFor(entry.path), page(meta, render(entry.path), { body: contentBody(entry.path) }));
}

write('404.html', page(NOT_FOUND_META, render(null)));

// Company email-format pages, from the API's aggregate pattern stats
// (backend/src/routes/publicTools.js). Only companies with enough addresses
// get a page; with none (or no API reachable) the index stays noindex and
// empty, and no company pages are written.
const emailFormats = await fetchEmailFormats();
const formatPages = emailFormats?.companies ?? [];
const formatIndexMeta = { ...EMAIL_FORMAT_INDEX_META, noindex: formatPages.length === 0 };
const formatIndexData = emailFormats ?? { companies: [] };
write(
  'email-format.html',
  page(formatIndexMeta, render('/email-format', formatIndexData), { data: formatIndexData }),
);
for (const company of formatPages) {
  const meta = emailFormatMeta(company.domain, company);
  write(fileFor(meta.path), page(meta, render(meta.path, company), { data: company }));
}

// lastmod = the page's last commit, so it only moves when the page does.
// Falls back to today outside a git checkout.
const today = new Date().toISOString().slice(0, 10);
function lastModified(source) {
  if (!source) return today;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', source], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || today;
  } catch {
    return today;
  }
}

const sitemapEntries = [
  ...PUBLIC_ROUTES.map((r) => ({
    path: r.path,
    lastmod: r.updated ?? lastModified(r.source),
    changefreq: r.changefreq,
    priority: r.priority,
  })),
  ...(formatPages.length
    ? [{ path: '/email-format', lastmod: today, changefreq: 'weekly', priority: '0.5' }]
    : []),
  ...formatPages.map((c) => ({
    path: `/email-format/${c.domain}`,
    lastmod: c.updated ?? today,
    changefreq: 'monthly',
    priority: '0.4',
  })),
];
const urls = sitemapEntries.map((r) =>
  [
    '  <url>',
    `    <loc>${r.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${r.path}`}</loc>`,
    `    <lastmod>${r.lastmod}</lastmod>`,
    `    <changefreq>${r.changefreq}</changefreq>`,
    `    <priority>${r.priority}</priority>`,
    '  </url>',
  ].join('\n'),
);
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);

write('llms.txt', llmsTxt());
write('llms-full.txt', llmsFullTxt());

console.log(`prerender: ${written} files, ${sitemapEntries.length} URLs in the sitemap`);
