import { prisma } from '../config/db.js';

/**
 * Short-circuits before any credit is reserved if this workspace has
 * already revealed the contact — reveals are workspace-wide (see
 * EmailReveal's unique constraint), so a second call must be free.
 */
export async function skipIfAlreadyRevealed(req, res, next) {
  try {
    const contactId = req.params.id;
    const existing = await prisma.emailReveal.findUnique({
      where: { workspaceId_contactId: { workspaceId: req.auth.workspaceId, contactId } },
    });

    if (!existing) return next();

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    res.json({
      email: contact?.email ?? null,
      emailVerified: contact?.emailVerified ?? false,
      // One reveal unlocks the phone too (see revealService) — the free
      // repeat must return everything the paid first call did.
      phone: contact?.phone ?? null,
      alreadyRevealed: true,
    });
  } catch (err) {
    // Same reasoning as rateLimit.js/idempotency.js — an unhandled
    // rejection here would hang the request instead of surfacing as a 5xx.
    next(err);
  }
}
