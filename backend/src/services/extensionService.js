import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { linkedinSlugFromUrl } from '../utils/linkedin.js';
import { attachRevealStatus } from './maskingService.js';
import { getBalance } from './creditService.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';
import { normalizeDomain } from '../utils/domain.js';
import { sizeLabel } from './emailFormatService.js';

// domText is the profile page's visible text, kept so an admin can
// hand-extract what the extension's parser missed. Cap it — a LinkedIn
// page's innerText is typically tens of KB; anything beyond this is
// runaway markup, not information.
export const DOM_TEXT_MAX_CHARS = 200_000;

const clip = (s) => (typeof s === 'string' ? s.slice(0, DOM_TEXT_MAX_CHARS) : null);
const clean = (s) => (typeof s === 'string' && s.trim() ? s.trim() : null);

// The extension sends LinkedIn's *headline*, which is freeform and usually
// wraps the real job title in company + marketing fluff:
//   "Head of Growth at Skyline Labs | ex-Google | Speaker"
//   "Full Stack Developer · React · Node"
//   "VP Engineering — Acme Corp"
// Our database stores a *clean* title ("Head of Growth"). Comparing the raw
// headline against the clean title would flag EVERY found contact as a
// title change (and Apply would then overwrite the clean title with the
// fluff). So distil the headline down to its leading title segment before
// comparing or storing.
export function extractJobTitle(headline) {
  const h = clean(headline);
  if (!h) return null;
  let t = h.split(/\s+(?:at|@)\s+/i)[0]; // "Title at/@  Company"
  t = t.split(/\s*[|·•]\s*/)[0]; // "Title | x", "Title · x", "Title • x"
  t = t.split(/\s+[-–—]\s+/)[0]; // "Title - x" (spaced hyphen/dash only — keeps "Co-founder")
  return clean(t);
}

// Compare titles by meaning, not formatting: lowercase, punctuation and
// spacing collapsed. "VP of Sales" and "vp of sales." read equal.
function normalizeTitle(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * The extension's one lookup call. Classifies a LinkedIn profile visit into
 * exactly one of three outcomes:
 *   found                  -> the (masked) contact + reveal price
 *   found + title differs  -> the above, plus a LostChild row ("Childs found")
 *   not found              -> a MissingPerson row ("Pending peoples")
 */
export async function observeProfile(auth, payload) {
  const slug = linkedinSlugFromUrl(payload.linkedinUrl);
  if (!slug) {
    throw new ApiError(422, 'Not a recognizable LinkedIn profile URL (expected linkedin.com/in/…)');
  }

  // The slug column isn't unique (the importer inserts, re-uploads are
  // expected) — take the richest match: a row that has an email beats one
  // that doesn't, then the oldest (most-established) row.
  const candidates = await prisma.contact.findMany({
    where: { linkedinSlug: slug, redactedAt: null },
    include: { company: { select: { id: true, name: true, domain: true, location: true } } },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });
  const contact = candidates.find((c) => c.email) ?? candidates[0];

  if (!contact) {
    await recordMissingPerson(auth, payload, slug);
    return { status: 'not_found', queued: true };
  }

  const titleChangeReported = await maybeRecordTitleChange(auth, payload, contact, slug);
  const [masked] = await attachRevealStatus(auth.workspaceId, [serializeContact(contact)]);

  return {
    status: 'found',
    contact: masked,
    // What the reveal button will charge — 0 tells the extension to label
    // it "already revealed — free".
    cost: masked.revealed ? 0 : CREDIT_COSTS.EXTENSION_REVEAL,
    titleChangeReported,
  };
}

function serializeContact(contact) {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    title: contact.title,
    seniority: contact.seniority,
    department: contact.department,
    location: contact.company?.location ?? null,
    email: contact.email,
    emailVerified: contact.emailVerified,
    phone: contact.phone,
    linkedinUrl: contact.linkedinUrl,
    company: contact.company
      ? { id: contact.company.id, name: contact.company.name, domain: contact.company.domain }
      : null,
  };
}

// "Missing peoples": one row per profile — a repeat sighting bumps the
// demand counter and refreshes the captured fields (the newest page is the
// freshest data), but never resurrects a row an admin already resolved:
// ADDED/DISMISSED stay as they are.
async function recordMissingPerson(auth, payload, slug) {
  const observed = {
    linkedinUrl: payload.linkedinUrl,
    name: clean(payload.name),
    jobTitle: clean(payload.jobTitle),
    location: clean(payload.location),
    companyName: clean(payload.companyName),
    domText: clip(payload.domText),
  };

  // Field-level freshest-wins: a repeat sighting refreshes only the fields
  // it actually captured — a sparse observation (parser had a bad day) must
  // never blank out data a richer earlier sighting already recorded.
  const refresh = Object.fromEntries(
    Object.entries(observed).filter(([, value]) => value != null),
  );
  const { count } = await prisma.missingPerson.updateMany({
    where: { linkedinSlug: slug },
    data: {
      ...refresh,
      reportCount: { increment: 1 },
      lastReportedAt: new Date(),
    },
  });
  if (count > 0) return;

  try {
    await prisma.missingPerson.create({
      data: { ...observed, linkedinSlug: slug, firstReportedById: auth.userId },
    });
  } catch (err) {
    // Lost a create race against a concurrent report of the same profile —
    // the other request's row exists now; count this sighting on it.
    if (err.code !== 'P2002') throw err;
    await prisma.missingPerson.updateMany({
      where: { linkedinSlug: slug },
      data: { reportCount: { increment: 1 }, lastReportedAt: new Date() },
    });
  }
}

// "Lost-child": the profile matched a contact but LinkedIn shows a
// different job title. One PENDING row per contact, updated in place on
// re-observation; once resolved (APPLIED/DISMISSED) a later sighting may
// open a fresh row.
async function maybeRecordTitleChange(auth, payload, contact, slug) {
  // Distil the headline to a clean title, then compare title-to-title by
  // meaning. Only a genuine difference is a "lost child" — a headline that
  // merely dresses up the same title is not.
  const observedTitle = extractJobTitle(payload.jobTitle);
  const ourTitle = clean(contact.title);
  if (!observedTitle || !ourTitle) return false;
  if (normalizeTitle(observedTitle) === normalizeTitle(ourTitle)) return false;

  const observed = {
    // Store the CLEAN extracted title — this is what Apply writes onto the
    // shared Contact, so it must never carry headline fluff.
    newTitle: observedTitle,
    observedCompanyName: clean(payload.companyName),
    domText: clip(payload.domText),
  };

  const existing = await prisma.lostChild.findFirst({
    where: { contactId: contact.id, status: 'PENDING' },
  });
  if (existing) {
    await prisma.lostChild.update({
      where: { id: existing.id },
      data: { ...observed, reportCount: { increment: 1 }, lastReportedAt: new Date() },
    });
  } else {
    await prisma.lostChild.create({
      data: {
        ...observed,
        contactId: contact.id,
        linkedinSlug: slug,
        oldTitle: ourTitle,
        firstReportedById: auth.userId,
      },
    });
  }
  return true;
}

/** The extension popup's status call: who am I, and what can I spend? */
export async function extensionStatus(auth) {
  const [user, workspace, balance] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true, email: true } }),
    prisma.workspace.findUnique({
      where: { id: auth.workspaceId },
      select: { name: true, plan: true },
    }),
    getBalance(auth.userId),
  ]);
  return {
    user,
    workspace,
    balance,
    revealCost: CREDIT_COSTS.EXTENSION_REVEAL,
  };
}

// Rows a lookup may return: not erased on request, not staged in an import
// still awaiting admin approval.
const LIVE_CONTACT = { redactedAt: null, importBatchId: null };
const COMPANY_FIELDS = { id: true, name: true, domain: true, location: true };

export const MAX_LOOKUP_EMAILS = 25;
export const MAX_COMPANY_CONTACTS = 25;

const EMAILISH = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Gmail, Google Calendar and CRM pages: which of these addresses are people
 * in DataPit? One result per distinct address, in the order asked. Found
 * contacts come back exactly as search shows them — masked until the
 * workspace reveals them — so a lookup never discloses more than search does.
 */
export async function lookupEmails(auth, emails) {
  const wanted = [
    ...new Set(emails.map((e) => String(e).trim().toLowerCase()).filter((e) => EMAILISH.test(e))),
  ].slice(0, MAX_LOOKUP_EMAILS);
  if (wanted.length === 0) return { results: [] };

  const rows = await prisma.contact.findMany({
    where: { ...LIVE_CONTACT, email: { in: wanted } },
    include: { company: { select: COMPANY_FIELDS } },
    orderBy: { createdAt: 'asc' },
  });
  // Several rows can share an address (re-imports); the oldest wins, as in observe.
  const byEmail = new Map();
  for (const row of rows) if (!byEmail.has(row.email)) byEmail.set(row.email, row);

  const masked = await attachRevealStatus(auth.workspaceId, [...byEmail.values()].map(serializeContact));
  const maskedById = new Map(masked.map((c) => [c.id, c]));

  return {
    results: wanted.map((email) => {
      const row = byEmail.get(email);
      if (!row) return { email, status: 'not_found' };
      const contact = maskedById.get(row.id);
      return {
        email,
        status: 'found',
        contact,
        cost: contact.revealed ? 0 : CREDIT_COSTS.EXTENSION_REVEAL,
      };
    }),
  };
}

// "blog.acme.co.uk" -> ["blog.acme.co.uk", "acme.co.uk"]: a company's own
// subdomains (app., blog., docs.) should still find the company.
function domainCandidates(domain) {
  const labels = domain.split('.');
  const out = [];
  for (let i = 0; i <= labels.length - 2; i += 1) out.push(labels.slice(i).join('.'));
  return out;
}

/**
 * Any company website: the company DataPit holds for this domain, and the
 * first people at it (masked, like search). Free, like search — reveals are
 * charged per contact as usual.
 */
export async function lookupCompany(auth, domainInput) {
  const domain = normalizeDomain(domainInput);
  if (!domain) throw new ApiError(422, 'Not a recognizable website address');

  const candidates = domainCandidates(domain);
  const companies = await prisma.company.findMany({
    where: { domain: { in: candidates }, importBatchId: null },
    select: { ...COMPANY_FIELDS, industry: true, headcountMin: true, headcountMax: true },
  });
  // The most specific match: app.acme.com's own row beats acme.com's.
  const company = candidates.map((d) => companies.find((c) => c.domain === d)).find(Boolean);
  if (!company) return { status: 'not_found', domain };

  const where = { ...LIVE_CONTACT, companyId: company.id };
  const [total, rows] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      include: { company: { select: COMPANY_FIELDS } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: MAX_COMPANY_CONTACTS,
    }),
  ]);
  const contacts = await attachRevealStatus(auth.workspaceId, rows.map(serializeContact));

  return {
    status: 'found',
    domain,
    company: {
      id: company.id,
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      size: sizeLabel(company.headcountMin, company.headcountMax),
      location: company.location,
    },
    total,
    contacts: contacts.map((c) => ({ ...c, cost: c.revealed ? 0 : CREDIT_COSTS.EXTENSION_REVEAL })),
  };
}

/**
 * Sales Navigator lead pages don't always expose the public /in/ URL, so a
 * lead can also be matched by name and current company. Exact first + last
 * name (case-insensitive) and, when given, a company whose name contains the
 * one on the page. Several matches (common names) only count as found when
 * the company narrows them to one.
 */
export async function lookupPerson(auth, { name, companyName }) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { status: 'not_found' };
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const company = String(companyName || '').trim();

  const rows = await prisma.contact.findMany({
    where: {
      ...LIVE_CONTACT,
      firstName: { equals: firstName, mode: 'insensitive' },
      lastName: { equals: lastName, mode: 'insensitive' },
      ...(company ? { company: { name: { contains: company, mode: 'insensitive' } } } : {}),
    },
    include: { company: { select: COMPANY_FIELDS } },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });
  if (rows.length === 0 || (rows.length > 1 && !company)) return { status: 'not_found' };
  const row = rows.find((r) => r.email) ?? rows[0];
  const [contact] = await attachRevealStatus(auth.workspaceId, [serializeContact(row)]);
  return { status: 'found', contact, cost: contact.revealed ? 0 : CREDIT_COSTS.EXTENSION_REVEAL };
}
