import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { linkedinSlugFromUrl } from '../utils/linkedin.js';
import { attachRevealStatus } from './maskingService.js';
import { getBalance } from './creditService.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';

// domText is the profile page's visible text, kept so an admin can
// hand-extract what the extension's parser missed. Cap it — a LinkedIn
// page's innerText is typically tens of KB; anything beyond this is
// runaway markup, not information.
export const DOM_TEXT_MAX_CHARS = 200_000;

const clip = (s) => (typeof s === 'string' ? s.slice(0, DOM_TEXT_MAX_CHARS) : null);
const clean = (s) => (typeof s === 'string' && s.trim() ? s.trim() : null);

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
  const observedTitle = clean(payload.jobTitle);
  const ourTitle = clean(contact.title);
  if (!observedTitle || !ourTitle) return false;
  if (observedTitle.toLowerCase() === ourTitle.toLowerCase()) return false;

  const observed = {
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
    getBalance(auth.workspaceId),
  ]);
  return {
    user,
    workspace,
    balance,
    revealCost: CREDIT_COSTS.EXTENSION_REVEAL,
  };
}
