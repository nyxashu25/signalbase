import { prisma } from '../config/db.js';
import { maskEmailLocalPart } from './maskingService.js';
import { optedOutEmails } from './privacyService.js';
import { applyPattern } from './emailPatternService.js';
import { findCompanyByDomain, getEmailFormat, topPattern } from './emailFormatService.js';

// The public email finder (POST /public/tools/find-email). Answers "do you
// have this person?" with a masked address at most — the real one only
// ever leaves the server through a signed-in, credit-charged reveal.

export const SIGNUP_URL = '/login?mode=register';

// Prisma compiles `equals` + `mode: 'insensitive'` to ILIKE without
// escaping, so a typed "%" or "_" would be a wildcard: "%" / "%" would
// match everyone at the company and hand out their masked addresses one
// search at a time. Escape them (backslash is Postgres' LIKE escape) ...
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');
// ... and re-check the match in JS, so the answer never depends on how
// the ORM spells a case-insensitive comparison.
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

/**
 * The best live contact at the company with exactly this name (case-
 * insensitive, no wildcards): erased contacts, staged import rows and
 * addresses on the opt-out registry are skipped. Prefers one with a
 * verified address, then any address, then the most recently updated.
 */
async function findContact(companyId, firstName, lastName) {
  const candidates = await prisma.contact.findMany({
    where: {
      companyId,
      redactedAt: null,
      importBatchId: null,
      firstName: { equals: escapeLike(firstName), mode: 'insensitive' },
      lastName: { equals: escapeLike(lastName), mode: 'insensitive' },
    },
    select: { firstName: true, lastName: true, email: true, emailVerified: true, updatedAt: true },
    orderBy: [{ emailVerified: 'desc' }, { updatedAt: 'desc' }],
    take: 20,
  });
  const matches = candidates.filter(
    (m) => sameName(m.firstName, firstName) && sameName(m.lastName, lastName),
  );
  const optedOut = await optedOutEmails(matches.map((m) => m.email));
  const live = matches.filter((m) => !m.email || !optedOut.has(m.email.trim().toLowerCase()));
  return live.find((m) => m.email?.trim()) ?? live[0] ?? null;
}

export async function findPublicEmail({ firstName, lastName, domain }) {
  const company = await findCompanyByDomain(domain);
  const body = {
    domain,
    company: company ? { name: company.name } : null,
    found: false,
    maskedEmail: null,
    pattern: null,
    suggestion: null,
    signupUrl: SIGNUP_URL,
  };
  if (!company) return body;

  const [contact, format] = await Promise.all([
    findContact(company.id, firstName, lastName),
    getEmailFormat(domain),
  ]);

  if (contact) {
    body.found = true;
    body.maskedEmail = contact.email?.trim() ? maskEmailLocalPart(contact.email.trim()) : null;
  }

  body.pattern = topPattern(format);
  // No guess next to a masked match: the two together would confirm the
  // real address whenever the guess fits the mask, handing out for free
  // what a signed-in reveal charges for.
  if (body.pattern && !body.maskedEmail) {
    const local = applyPattern(body.pattern.pattern, firstName, lastName);
    const guess = local ? `${local}@${domain}` : null;
    // Same rule as a reveal (revealService.js): never hand out a guess
    // that's on the opt-out registry.
    if (guess && !(await optedOutEmails([guess])).has(guess)) body.suggestion = guess;
  }
  return body;
}
