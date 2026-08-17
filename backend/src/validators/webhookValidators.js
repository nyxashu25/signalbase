import { z } from 'zod';

export const espWebhookSchema = z.object({
  events: z.array(
    z.object({
      id: z.string().min(1),
      messageId: z.string().min(1),
      type: z.enum(['OPENED', 'CLICKED', 'BOUNCED', 'REPLIED', 'UNSUBSCRIBED']),
    }),
  ),
});
