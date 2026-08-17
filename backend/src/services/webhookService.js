import { prisma } from '../config/db.js';
import { addSuppression } from './suppressionService.js';
import { unenroll } from './sequenceService.js';
import { logger } from '../config/logger.js';

async function processEvent(event) {
  // Correlate back to the send this event is about via the messageId we
  // stamped as providerEventId on the original SENT record.
  const sentEvent = await prisma.sequenceStepEvent.findFirst({
    where: { providerEventId: event.messageId, type: 'SENT' },
    include: { enrollment: { include: { contact: true } } },
  });

  if (!sentEvent) {
    logger.warn(
      { messageId: event.messageId },
      'Webhook event references an unknown send — ignoring',
    );
    return;
  }

  const { enrollment } = sentEvent;

  try {
    await prisma.sequenceStepEvent.create({
      data: {
        enrollmentId: enrollment.id,
        stepIndex: sentEvent.stepIndex,
        type: event.type,
        providerEventId: event.id,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') return; // already processed this exact event — ESPs deliver at-least-once
    throw err;
  }

  const email = enrollment.contact.email;

  if (event.type === 'BOUNCED' && email) {
    await addSuppression(enrollment.workspaceId, email, 'BOUNCED');
  }
  if (event.type === 'UNSUBSCRIBED' && email) {
    await addSuppression(enrollment.workspaceId, email, 'UNSUBSCRIBED');
  }
  if (event.type === 'REPLIED') {
    // The enrollment may already be COMPLETED/UNENROLLED by the time a
    // reply arrives — that's fine, not an error, just nothing to do.
    try {
      await unenroll(enrollment.workspaceId, enrollment.id, 'replied');
    } catch {
      logger.info(
        { enrollmentId: enrollment.id },
        'Reply webhook for an already-resolved enrollment',
      );
    }
  }
}

export async function processWebhookPayload(payload) {
  for (const event of payload.events) {
    await processEvent(event);
  }
}
