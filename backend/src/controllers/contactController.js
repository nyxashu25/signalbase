import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../middleware/errorHandler.js';
import * as notificationService from '../services/notificationService.js';

// No CRM integration (explicitly deferred — see TODO.md); forwarding the
// lead by email to every super admin is the stand-in "sales inbox".
export async function submitContactRequest(req, res) {
  const { category, email } = req.body;

  // Support/Enterprise tickets (raised from the in-app chat widget) are
  // gated to existing accounts — the general Contact page stays open to
  // anyone, since a prospect filling that one out has no account yet.
  if (category !== 'general') {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      throw new ApiError(
        422,
        'That email isn’t associated with a DataPit account. Use the email registered to your workspace.',
      );
    }
  }

  logger.info({ ...req.body }, 'Contact form submission received');
  await notificationService.sendContactFormLead(req.body);
  res.status(204).end();
}
