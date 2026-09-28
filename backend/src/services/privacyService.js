import { prisma } from '../config/db.js';
import { enqueueIndex } from './indexerService.js';
import { logger } from '../config/logger.js';

export async function isOptedOut(email) {
  const entry = await prisma.dataSubjectOptOut.findUnique({ where: { email } });
  return Boolean(entry);
}

// Keeps each IN (...) list well under Postgres' bind-parameter limit.
const OPT_OUT_LOOKUP_CHUNK = 1000;

/**
 * Which of `emails` are on the opt-out registry, as a Set of trimmed,
 * lowercased addresses. The registry stores addresses lowercased (privacyValidators),
 * so a contact imported later with different casing still matches.
 */
export async function optedOutEmails(emails) {
  const unique = [...new Set(emails.map((e) => e?.trim().toLowerCase()).filter(Boolean))];
  const found = new Set();
  for (let i = 0; i < unique.length; i += OPT_OUT_LOOKUP_CHUNK) {
    const rows = await prisma.dataSubjectOptOut.findMany({
      where: { email: { in: unique.slice(i, i + OPT_OUT_LOOKUP_CHUNK) } },
      select: { email: true },
    });
    for (const row of rows) found.add(row.email.toLowerCase());
  }
  return found;
}

/**
 * A data subject's erasure request: registers the email so it's never
 * looked up again, AND immediately redacts every existing Contact row with
 * that email — registering intent without acting on existing data isn't
 * erasure. The Contact row itself survives (List/EmailReveal/Sequence
 * history hold FKs to it) but every PII field is wiped.
 */
export async function requestErasure(email, reason) {
  await prisma.dataSubjectOptOut.upsert({
    where: { email },
    update: {},
    create: { email, reason },
  });

  const matches = await prisma.contact.findMany({ where: { email } });

  for (const contact of matches) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        firstName: '[redacted]',
        lastName: '[redacted]',
        email: null,
        phone: null,
        linkedinUrl: null,
        linkedinSlug: null,
        title: null,
        seniority: null,
        department: null,
        redactedAt: new Date(),
      },
    });
    await enqueueIndex('contact', contact.id);
  }

  logger.info(
    { email, redactedContacts: matches.length },
    'Processed data-subject erasure request',
  );
  return { redactedContacts: matches.length };
}
