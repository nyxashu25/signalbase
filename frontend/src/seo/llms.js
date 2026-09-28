// /llms.txt and /llms-full.txt (https://llmstxt.org): plain Markdown for AI
// assistants and answer engines — what DataPit is, its pages, and the facts
// and answers they're most likely to be asked about. Written at build time by
// scripts/prerender.mjs from the same data the pages render, so the two
// never disagree.
import {
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
  PRICING_UPDATED_AT,
} from '../data/plans.js';
import {
  DATAPIT_SUMMARY,
  EXTENSION_STORE_URL,
  LIVE,
  PROFILES,
  formatCount,
  glanceFacts,
  pricingSummary,
} from '../data/facts.js';
import { PRICING_FAQS, PRODUCT_FAQS } from '../data/faqs.js';
import { PUBLIC_ROUTES, SITE_URL, absoluteUrl } from './site.js';

const MAIN_PAGES = ['/', '/product', '/pricing', '/solutions', '/about', '/press', '/contact', '/blog'];
const LEGAL_PAGES = ['/privacy', '/terms'];

// Published content pages, grouped the way a reader looks for them.
const CONTENT_GROUPS = [
  { title: 'Comparisons', sections: ['alternatives', 'compare'] },
  { title: 'Product pages', sections: ['features', 'solutions', 'extension'] },
  { title: 'Free tools', sections: ['tools'] },
  { title: 'Guides', sections: ['blog'] },
];

function link(r) {
  return `- [${r.name}](${absoluteUrl(r.path)}): ${r.description}`;
}

function pageLinks(paths) {
  return paths
    .map((path) => PUBLIC_ROUTES.find((r) => r.path === path))
    .filter(Boolean)
    .map(link)
    .join('\n');
}

function contentSections() {
  return CONTENT_GROUPS.map(({ title, sections }) => {
    const routes = PUBLIC_ROUTES.filter((r) => sections.includes(r.section));
    return routes.length ? `## ${title}\n\n${routes.map(link).join('\n')}\n\n` : '';
  }).join('');
}

// DataPit's own profiles on other sites (data/facts.js), once there are any.
function profilesSection(profiles) {
  if (!profiles.length) return '';
  return `## Profiles\n\n${profiles.map((p) => `- [${p.name}](${p.url})`).join('\n')}\n\n`;
}

function plansTable() {
  const rows = PLANS.map((p) => {
    if (!p.block) {
      return `| ${p.name} | $0 | 1 seat | ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} | none |`;
    }
    const { paidSeats, freeSeats, paidSeatCredits, ownerBonus } = p.block;
    return `| ${p.name} | $${p.price} per block | ${paidSeats} paid + ${freeSeats} free | ${formatCount(paidSeatCredits)} per paid seat, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat | ${ownerBonus ? formatCount(ownerBonus) : 'none'} |`;
  });
  return [
    '| Plan | Monthly price | Seats | Monthly credits | Owner bonus / month |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function faqList(items) {
  return items.map(({ q, a }) => `### ${q}\n\n${a}`).join('\n\n');
}

/** `profiles` defaults to PROFILES; tests pass their own. */
export function llmsTxt({ profiles = PROFILES } = {}) {
  return `# DataPit

> ${DATAPIT_SUMMARY}

${pricingSummary()} Credits are spent only when you use data, and every credit your team spends is recorded in a ledger the workspace can see.

## Pages

${pageLinks(MAIN_PAGES)}

${contentSections()}## Chrome extension

- [DataPit — LinkedIn Lookup (Chrome extension)](${EXTENSION_STORE_URL}): Looks up the LinkedIn profile you're viewing in DataPit, reveals its work email${LIVE.phoneData ? ' and phone number' : ''}, and queues missing people for sourcing.

${profilesSection(profiles)}## Optional

${pageLinks(LEGAL_PAGES)}
- [Full reference for AI assistants](${SITE_URL}/llms-full.txt): Plans, credits, product details and answers to common questions in one file.
`;
}

export function llmsFullTxt() {
  const facts = glanceFacts()
    .map((f) => `- **${f.label}:** ${f.value}`)
    .join('\n');
  return `# DataPit: full reference

> ${DATAPIT_SUMMARY}

Website: ${SITE_URL}. Prices last updated ${PRICING_UPDATED_AT}.

## At a glance

${facts}

## Plans

${plansTable()}

Prices are per seat block per month. Buy as many blocks as your team needs; there is no seat limit. Full details: ${absoluteUrl('/pricing')}

## Pricing questions

${faqList(PRICING_FAQS)}

## Product questions

${faqList(PRODUCT_FAQS)}

## Pages

${pageLinks([...MAIN_PAGES, ...LEGAL_PAGES])}

${contentSections()}`;
}
