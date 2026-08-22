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
 * "+1 415 555 0132" -> "+1 415 *** **32". Keeps the leading country/area
 * prefix (up to the first 4 digits) and the last 2 digits so the user can
 * tell it's a real, region-plausible number, and masks everything in
 * between — the same "enough to trust, not enough to use" posture as
 * maskEmail. Non-digit separators are preserved so the shape reads
 * naturally.
 */
export function maskPhone(phone) {
  let digitIndex = 0;
  const digitCount = phone.replace(/\D/g, '').length;
  const keepLeading = Math.min(4, Math.max(digitCount - 4, 0));
  const keepTrailing = digitCount > 4 ? 2 : 0;
  return phone.replace(/\d/g, (d) => {
    const i = digitIndex++;
    if (i < keepLeading || i >= digitCount - keepTrailing) return d;
    return '*';
  });
}

/**
 * Applies the credit-gate to a page of contacts: an email — and, since the
 * same reveal unlocks both, a phone number — is only ever returned in the
 * clear if this workspace has a matching EmailReveal row. This MUST run on
 * every response path that can include a contact — search results, list
 * contents, profile lookups — not just the "canonical" one.
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
    const hasPhone = Boolean(contact.phone);
    if (revealedIds.has(contact.id)) {
      return { ...contact, revealed: true, hasPhone };
    }
    return {
      ...contact,
      email: contact.email ? maskEmail(contact.email) : contact.email,
      phone: contact.phone ? maskPhone(contact.phone) : contact.phone,
      revealed: false,
      hasPhone,
    };
  });
}
