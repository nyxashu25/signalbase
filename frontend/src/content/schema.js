// The shape of a content page (src/content/pages/<section>/<slug>.js) — the
// comparison, feature, persona, extension and guide pages. Each file
// default-exports plain data, no JSX, so the same object feeds the React
// template (components/marketing/ContentArticle.jsx), the prerender, the
// structured data and llms-full.txt.
//
//   export default {
//     meta: {
//       path: '/alternatives/apollo',        // the URL
//       section: 'alternatives',             // see SECTIONS below
//       name: 'Apollo alternative',          // breadcrumb / link label
//       title: '...',                        // <title>, 60 chars max
//       description: '...',                  // meta description, 160 chars max
//       updated: 'YYYY-MM-DD',               // visible "Last updated"; dateModified
//       published: true,                     // false = noindex, off the sitemap and llms.txt
//       station: 'lens',                     // Signal World set piece for the cover (optional)
//     },
//     hero: {
//       eyebrow: 'Apollo alternative',
//       lines: ['A cheaper', 'Apollo alternative'], // art-directed headline lines (the h1)
//       sub: '40–60 words that answer the page's question directly.',
//     },
//     blocks: [ ...see BLOCK_TYPES ],
//   };
//
// Text fields accept two inline marks: **bold** and [label](/path) or
// [label](https://...). Internal links use site paths; external links open
// in a new tab.

export const SECTIONS = {
  alternatives: { label: 'Alternatives', og: 'compare' },
  compare: { label: 'Comparisons', og: 'compare' },
  features: { label: 'Features', og: 'features' },
  solutions: { label: 'Solutions', og: 'solutions' },
  extension: { label: 'Chrome extension', og: 'extension' },
  tools: { label: 'Free tools', og: 'tools' },
  blog: { label: 'Guides', og: 'guide' },
  'email-format': { label: 'Email formats', og: 'tools' },
};

/**
 * Block types and their required fields:
 *   h2        { text }                       a section heading (question form works best)
 *   h3        { text }
 *   p         { text }
 *   list      { items: [text], ordered? }
 *   steps     { items: [{ title, text }] }   a numbered how-to
 *   table     { head: [text], rows: [[text]], caption?, note? }  first column is the row header
 *   callout   { text, title? }               the short direct answer / key takeaway
 *   faq       { items: [{ q, a }], title? }  also emitted as FAQPage structured data
 *   cta       { title, text?, primary: { label, to }, secondary?: { label, to } }
 *   related   { items: [{ label, to, text? }], title? }
 *   sources   { items: [{ label, url, checked }] }  checked = YYYY-MM-DD the page was read
 *   dataCoverage {}                          DataPit's database size sentence — renders
 *                                            nothing until facts.js DATABASE_CLAIM is set
 */
export const BLOCK_TYPES = {
  h2: ['text'],
  h3: ['text'],
  p: ['text'],
  list: ['items'],
  steps: ['items'],
  table: ['head', 'rows'],
  callout: ['text'],
  faq: ['items'],
  cta: ['title', 'primary'],
  related: ['items'],
  sources: ['items'],
  dataCoverage: [],
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Problems with a content page object, as strings; empty means valid. */
export function validatePage(page, file = page?.meta?.path ?? '?') {
  const problems = [];
  const fail = (msg) => problems.push(`${file}: ${msg}`);
  const m = page?.meta;
  if (!m) return [`${file}: missing meta`];
  if (!/^\/[a-z0-9-]+(\/[a-z0-9.-]+)?$/.test(m.path ?? '')) fail(`bad path ${m.path}`);
  if (!SECTIONS[m.section]) fail(`unknown section ${m.section}`);
  for (const k of ['name', 'title', 'description']) if (!m[k]) fail(`meta.${k} missing`);
  if (m.title && m.title.length > 60) fail(`title is ${m.title.length} chars (max 60)`);
  if (m.description && m.description.length > 160)
    fail(`description is ${m.description.length} chars (max 160)`);
  if (!DAY.test(m.updated ?? '')) fail('meta.updated must be YYYY-MM-DD');
  if (typeof m.published !== 'boolean') fail('meta.published must be true or false');
  if (!page.hero?.eyebrow || !Array.isArray(page.hero?.lines) || !page.hero.lines.length || !page.hero?.sub)
    fail('hero needs eyebrow, lines and sub');
  if (!Array.isArray(page.blocks) || !page.blocks.length) fail('blocks missing');
  (page.blocks ?? []).forEach((b, i) => {
    const need = BLOCK_TYPES[b?.type];
    if (!need) return fail(`block ${i}: unknown type ${b?.type}`);
    for (const k of need) if (b[k] === undefined || b[k] === '') fail(`block ${i} (${b.type}): ${k} missing`);
    if (b.type === 'table') {
      if (!Array.isArray(b.rows) || b.rows.some((r) => !Array.isArray(r) || r.length !== b.head.length))
        fail(`block ${i} (table): every row needs ${b.head?.length} cells`);
    }
    if (b.type === 'sources') {
      for (const s of b.items ?? [])
        if (!/^https:\/\//.test(s.url ?? '') || !DAY.test(s.checked ?? '')) fail(`block ${i}: source needs https url and checked date`);
    }
  });
  return problems;
}

/** Every [label](/internal) link in a page, for link checking. */
export function internalLinks(page) {
  const found = [];
  const scan = (v) => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(/\]\((\/[^)\s]*)\)/g)) found.push(m[1]);
    } else if (Array.isArray(v)) v.forEach(scan);
    else if (v && typeof v === 'object') {
      if (typeof v.to === 'string' && v.to.startsWith('/')) found.push(v.to);
      Object.values(v).forEach(scan);
    }
  };
  scan(page.blocks);
  return found.map((p) => p.split(/[?#]/)[0]);
}
