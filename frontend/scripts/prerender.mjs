// Post-build step (see "build" in package.json): writes a static HTML file for
// every public marketing page, plus the 404 page, the app shell and the
// sitemap, into dist/. Pages come from the SSR bundle built from
// src/prerender/entry-server.jsx; head tags come from src/seo/site.js.
//
// Output, as nginx serves it (deploy/nginx/datapit.io.conf):
//   dist/index.html        /            (home)
//   dist/<page>.html       /<page>      (pricing, product, ...)
//   dist/404.html          any unknown URL, with a 404 status
//   dist/app.html          /app, /control and the auth screens (noindex)
//   dist/sitemap.xml
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

const { render, SEO_ROUTES, NOT_FOUND_META, PRIVATE_META, headElements } = await import(
  pathToFileURL(ssrEntry).href
);

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

function toTag({ tag, attrs, text }) {
  const attrText = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${escapeHtml(v)}"`)
    .join('');
  if (tag === 'script') {
    // JSON inside <script>: escape `<` so no string can close the tag early.
    return `<script${attrText} data-seo>${text.replace(/</g, '\\u003c')}</script>`;
  }
  return `<${tag}${attrText} data-seo />`;
}

// The latin subset of the self-hosted Montserrat carries the first paint;
// preloading it saves a round trip behind the stylesheet.
const fontPreloads = fs
  .readdirSync(path.join(dist, 'assets'))
  .filter((f) => /^montserrat-latin-wght-normal-.*\.woff2$/.test(f))
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`);

function headHtml(meta) {
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    ...fontPreloads,
    ...headElements(meta).map(toTag),
  ].join('\n    ');
}

function page(meta, appHtml) {
  return template
    .replace(/<title>[^<]*<\/title>\s*/, '')
    .replace(/<!--\s*Build-time slots[\s\S]*?-->\s*/, '')
    .replace('<!--app-head-->', headHtml(meta))
    .replace('<!--app-html-->', appHtml);
}

function write(file, html) {
  fs.writeFileSync(path.join(dist, file), html);
  console.log(`prerender: ${file} (${(Buffer.byteLength(html) / 1024).toFixed(1)} kB)`);
}

// The shell for app, admin and auth routes — written first, from the
// untouched template, before index.html becomes the home page.
write('app.html', page(PRIVATE_META, ''));

for (const route of SEO_ROUTES) {
  const html = page(route, render(route.path));
  write(route.path === '/' ? 'index.html' : `${route.path.slice(1)}.html`, html);
}

write('404.html', page(NOT_FOUND_META, render(null)));

// lastmod = the page component's last commit, so it only moves when the
// page does. Falls back to today outside a git checkout.
const today = new Date().toISOString().slice(0, 10);
function lastModified(source) {
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

const urls = SEO_ROUTES.map((r) => {
  const loc = r.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${r.path}`;
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastModified(r.source)}</lastmod>`,
    `    <changefreq>${r.changefreq}</changefreq>`,
    `    <priority>${r.priority}</priority>`,
    '  </url>',
  ].join('\n');
});
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);
