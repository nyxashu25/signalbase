import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { findEmail } from './emailFinderService.js';
import { verifyEmail } from './emailVerifierService.js';
import { resolveReservationForCommit, releaseReservation, refundAmount } from './creditService.js';
import { isOptedOut } from './privacyService.js';
import { enqueueIndex } from './indexerService.js';

// `reason` distinguishes where the spend came from in the ledger — the
// in-app route charges EMAIL_REVEAL, the Chrome extension EXTENSION_REVEAL.
// Everything else (reveal-state, masking, workspace-wide unlock) is shared.
export async function revealContactEmail({ workspaceId, userId, contactId, reservationId, reason = 'EMAIL_REVEAL' }) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { company: true },
  });

  if (!contact) {
    await releaseReservation(reservationId);
    throw new ApiError(404, 'Contact not found');
  }

  if (contact.redactedAt) {
    await releaseReservation(reservationId);
    throw new ApiError(410, 'This contact has been removed per a data-subject erasure request');
  }

  const existingReveal = await prisma.emailReveal.findUnique({
    where: { workspaceId_contactId: { workspaceId, contactId } },
  });
  if (existingReveal) {
    // Shouldn't normally be reached (the controller checks first), but
    // stay safe under a race between two concurrent reveal requests for
    // the same contact — refund rather than charge twice.
    await releaseReservation(reservationId);
    return {
      email: contact.email,
      emailVerified: contact.emailVerified,
      phone: contact.phone,
      alreadyRevealed: true,
    };
  }

  let { email, emailVerified } = contact;

  if (!email) {
    const guess = findEmail({
      firstName: contact.firstName,
      lastName: contact.lastName,
      domain: contact.company.domain,
    });

    if (await isOptedOut(guess.email)) {
      await releaseReservation(reservationId);
      throw new ApiError(422, 'This email address is on the data-subject opt-out registry');
    }

    const verification = await verifyEmail(guess.email);

    if (verification.verified === false && verification.checked === true) {
      // The provider actively confirmed this address is bad — don't charge
      // for a result the workspace can't use.
      await releaseReservation(reservationId);
      throw new ApiError(422, 'No valid email could be found for this contact');
    }

    email = guess.email;
    emailVerified = Boolean(verification.verified);
  }

  const { amount } = await resolveReservationForCommit(reservationId, { workspaceId });

  try {
    await prisma.$transaction([
      prisma.contact.update({ where: { id: contactId }, data: { email, emailVerified } }),
      prisma.creditLedgerEntry.create({
        data: { workspaceId, delta: -amount, reason, contactId, spentById: userId },
      }),
      prisma.emailReveal.create({ data: { workspaceId, contactId, revealedById: userId } }),
    ]);
  } catch (err) {
    if (err.code === 'P2002') {
      // Lost a race against a concurrent identical request from the same
      // workspace — it already committed its EmailReveal row. The
      // reservation's Redis side is already cleared, so refund directly
      // rather than double-charge for a result someone else just paid for.
      await refundAmount(workspaceId, amount);
      const winner = await prisma.contact.findUnique({ where: { id: contactId } });
      return {
        email: winner.email,
        emailVerified: winner.emailVerified,
        phone: winner.phone,
        alreadyRevealed: true,
      };
    }
    throw err;
  }

  await enqueueIndex('contact', contactId);

  // One reveal unlocks everything we hold on the contact — the phone number
  // comes from the dataset (seed/CSV import), there's no phone finder.
  return { email, emailVerified, phone: contact.phone, alreadyRevealed: false };
}
