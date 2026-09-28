import { prisma } from '../config/db.js';
import { redis } from '../config/redis.js';
import { normalizeDomain } from '../utils/domain.js';
import { optedOutEmails } from './privacyService.js';
import {
  PATTERNS,
  OTHER_PATTERN,
  classifyLocalPart,
  exampleAddress,
} from './emailPatternService.js';

// Aggregate email-format stats for the public email-format pages and the
// public email finder (routes/publicTools.js). Only counts ever leave this
// module — never a contact's name or address. Every example address is the
// "Jane Doe" placeholder (emailPatternService.exampleAddress).

export const MIN_CONTACTS = 5;
export const MAX_COMPANIES = 1000;
export const LIST_CACHE_KEY = 'public:email-formats';
const companyCacheKey = (domain) => `public:email-formats:${domain}`;
const CACHE_TTL_SECONDS = 60 * 60;
// Companies aggregated per round trip when building the full list.
const COMPANY_BATCH = 100;

// A contact counts toward a company's format when it's live (not erased,
// not a staged import row still awaiting super-admin review) and has an
// address. The address must also be at the company's own domain and not
// on the opt-out registry — both checked in buildCompanyFormat.
const COUNTED_CONTACT = { redactedAt: null, importBatchId: null, email: { not: null } };
const CONTACT_SELECT = {
  companyId: true,
  firstName: true,
  lastName: true,
  email: true,
  updatedAt: true,
};
const COMPANY_SELECT = {
  id: true,
  name: true,
  domain: true,
  industry: true,
  headcountMin: true,
  headcountMax: true,
  location: true,
};

/** Same wording as the app's Companies table: "51–200", "5,001+". */
function sizeLabel(min, max) {
  if (!min && !max) return null;
  if (min && max) return `${min.toLocaleString('en-US')}–${max.toLocaleString('en-US')}`;
  return `${(min ?? max).toLocaleString('en-US')}+`;
}

const byPatternRank = (a, b) =>
  b.count - a.count || PATTERNS.indexOf(a.pattern) - PATTERNS.indexOf(b.pattern);

const byCompanyRank = (a, b) => b.sampleSize - a.sampleSize || a.domain.localeCompare(b.domain);

/**
 * Two-decimal shares for `ranked` (pattern counts, best first) that add up
 * to exactly 1: each gets its floored share in hundredths, and the
 * hundredths left over go to the largest remainders — ties to the
 * higher-ranked pattern. Rounding each share on its own could total 1.02
 * (five of eight, then three of one).
 */
function sharesOf(ranked, total) {
  const cents = ranked.map((p) => Math.floor((p.count * 100) / total));
  const remainder = (i) => (ranked[i].count * 100) % total;
  let left = 100 - cents.reduce((sum, c) => sum + c, 0);
  const order = ranked.map((_, i) => i).sort((a, b) => remainder(b) - remainder(a) || a - b);
  for (const i of order) {
    if (left <= 0) break;
    cents[i] += 1;
    left -= 1;
  }
  return cents.map((c) => c / 100);
}

/**
 * One company's CompanyFormat from its contacts, or null when fewer than
 * MIN_CONTACTS addresses qualify. `optedOut` is a Set of lowercased
 * addresses to leave out.
 */
function buildCompanyFormat(company, contacts, optedOut) {
  const domain = normalizeDomain(company.domain);
  if (!domain) return null;

  const counts = new Map();
  let sampleSize = 0;
  let latest = null;
  for (const contact of contacts) {
    const email = contact.email?.trim().toLowerCase();
    if (!email) continue;
    const at = email.lastIndexOf('@');
    if (at < 1 || email.slice(at + 1) !== domain) continue;
    if (optedOut.has(email)) continue;

    const pattern = classifyLocalPart(email.slice(0, at), contact.firstName, contact.lastName);
    counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
    sampleSize += 1;
    if (!latest || contact.updatedAt > latest) latest = contact.updatedAt;
  }
  if (sampleSize < MIN_CONTACTS) return null;

  const ranked = [...counts].map(([pattern, count]) => ({ pattern, count })).sort(byPatternRank);
  const shares = sharesOf(ranked, sampleSize);
  const patterns = ranked.map(({ pattern, count }, i) => ({
    pattern,
    share: shares[i],
    count,
    example: exampleAddress(pattern, domain),
  }));

  return {
    domain,
    name: company.name,
    industry: company.industry ?? null,
    size: sizeLabel(company.headcountMin, company.headcountMax),
    location: company.location ?? null,
    sampleSize,
    patterns,
    updated: latest.toISOString().slice(0, 10),
  };
}

/** The live company for a bare domain (also matching a stored "www." form), or null. */
export async function findCompanyByDomain(domain) {
  return prisma.company.findFirst({
    where: { domain: { in: [domain, `www.${domain}`] }, importBatchId: null },
    select: COMPANY_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

async function computeCompanyFormat(company) {
  const contacts = await prisma.contact.findMany({
    where: { companyId: company.id, ...COUNTED_CONTACT },
    select: CONTACT_SELECT,
  });
  const optedOut = await optedOutEmails(contacts.map((c) => c.email));
  return buildCompanyFormat(company, contacts, optedOut);
}

/**
 * The CompanyFormat for a domain, or null when no live company has at
 * least MIN_CONTACTS qualifying addresses there. Cached for an hour per
 * company that exists — a qualifying one or not — so a big company's
 * page doesn't rescan its contacts on every hit. Domains with no company
 * row aren't cached (a lookup is one indexed query), so arbitrary input
 * can't grow the cache.
 */
export async function getEmailFormat(domainInput) {
  const domain = normalizeDomain(domainInput);
  if (!domain) return null;

  const key = companyCacheKey(domain);
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached);

  const company = await findCompanyByDomain(domain);
  if (!company) return null;

  const format = await computeCompanyFormat(company);
  await redis.set(key, JSON.stringify(format), 'EX', CACHE_TTL_SECONDS);
  return format;
}

/**
 * The top companies by qualifying-address count (at most MAX_COMPANIES).
 * The SQL count per company is an upper bound on its real sample size
 * (the address-domain and opt-out filters run in JS), so candidates are
 * walked in descending SQL-count order and the walk stops once no
 * remaining candidate could still make the list.
 */
async function computeEmailFormats() {
  const candidates = await prisma.contact.groupBy({
    by: ['companyId'],
    where: { ...COUNTED_CONTACT, company: { importBatchId: null } },
    _count: { companyId: true },
    having: { companyId: { _count: { gte: MIN_CONTACTS } } },
    orderBy: { _count: { companyId: 'desc' } },
  });

  // Keyed by domain: two company rows can normalize to one domain
  // ("acme.com" and "www.acme.com") and must not produce two pages.
  const byDomain = new Map();
  for (let i = 0; i < candidates.length; i += COMPANY_BATCH) {
    if (byDomain.size >= MAX_COMPANIES) {
      const cutoff = [...byDomain.values()].sort(byCompanyRank)[MAX_COMPANIES - 1].sampleSize;
      if (candidates[i]._count.companyId < cutoff) break;
    }

    const ids = candidates.slice(i, i + COMPANY_BATCH).map((c) => c.companyId);
    const [companies, contacts] = await Promise.all([
      prisma.company.findMany({
        where: { id: { in: ids }, importBatchId: null },
        select: COMPANY_SELECT,
      }),
      prisma.contact.findMany({
        where: { companyId: { in: ids }, ...COUNTED_CONTACT },
        select: CONTACT_SELECT,
      }),
    ]);
    const optedOut = await optedOutEmails(contacts.map((c) => c.email));

    const contactsByCompany = new Map();
    for (const contact of contacts) {
      const list = contactsByCompany.get(contact.companyId) ?? [];
      list.push(contact);
      contactsByCompany.set(contact.companyId, list);
    }

    for (const company of companies) {
      const format = buildCompanyFormat(company, contactsByCompany.get(company.id) ?? [], optedOut);
      if (!format) continue;
      const existing = byDomain.get(format.domain);
      if (!existing || format.sampleSize > existing.sampleSize) byDomain.set(format.domain, format);
    }
  }

  return {
    minContacts: MIN_CONTACTS,
    generatedAt: new Date().toISOString(),
    companies: [...byDomain.values()].sort(byCompanyRank).slice(0, MAX_COMPANIES),
  };
}

// Concurrent cache misses in this process share one computation instead
// of each running the full scan.
let inflight = null;

/**
 * The whole public email-format list as a JSON string, cached in Redis for
 * an hour. Kept serialized end to end: the list can run to hundreds of KB,
 * and the endpoint is public and unthrottled, so a cache hit must not
 * parse and re-stringify it on every request.
 */
export async function listEmailFormatsJson() {
  const cached = await redis.get(LIST_CACHE_KEY);
  if (cached !== null) return cached;

  if (!inflight) {
    inflight = computeEmailFormats()
      .then(async (result) => {
        const json = JSON.stringify(result);
        await redis.set(LIST_CACHE_KEY, json, 'EX', CACHE_TTL_SECONDS);
        return json;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** The whole public email-format list (see listEmailFormatsJson). */
export async function listEmailFormats() {
  return JSON.parse(await listEmailFormatsJson());
}

/** The company's most common named pattern (never 'other'), or null. */
export function topPattern(format) {
  const top = format?.patterns.find((p) => p.pattern !== OTHER_PATTERN);
  return top ? { pattern: top.pattern, share: top.share, sampleSize: format.sampleSize } : null;
}
