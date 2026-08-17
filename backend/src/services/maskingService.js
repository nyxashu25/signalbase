import { prisma } from '../config/db.js';

export function maskEmail(email) {
  const [local, domain] = email.split('@');
  const domainParts = domain.split('.');
  const tld = domainParts.pop();
  const domainName = domainParts.join('.');

  const maskedLocal = local[0] + '*'.repeat(Math.max(local.length - 1, 3));
  const maskedDomain = domainName[0] + '*'.repeat(Math.max(domainName.length - 1, 3));

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

/**
 * Applies the credit-gate to a page of contacts: an email is only ever
 * returned in the clear if this workspace has a matching EmailReveal row.
 * This MUST run on every response path that can include a contact — search
 * results, list contents, profile lookups — not just the "canonical" one.
 */
export async function attachRevealStatus(workspaceId, contacts) {
  const contactIds = contacts.map((c) => c.id);
  if (contactIds.length === 0) return contacts;

  const reveals = await prisma.emailReveal.findMany({
    where: { workspaceId, contactId: { in: contactIds } },
    select: { contactId: true },
  });
  const revealedIds = new Set(reveals.map((r) => r.contactId));

  return contacts.map((contact) => {
    if (!contact.email) {
      return { ...contact, revealed: false };
    }
    if (revealedIds.has(contact.id)) {
      return { ...contact, revealed: true };
    }
    return { ...contact, email: maskEmail(contact.email), revealed: false };
  });
}
