import { z } from 'zod';
import { TICKET_SUBJECTS, TICKET_BODY_MAX_WORDS, countWords } from '../config/ticketConfig.js';

const ticketBodySchema = z
  .string()
  .trim()
  .min(1, 'Message is required')
  .refine(
    (text) => countWords(text) <= TICKET_BODY_MAX_WORDS,
    `Message must be ${TICKET_BODY_MAX_WORDS} words or fewer`,
  );

export const createTicketSchema = z
  .object({
    type: z.enum(['SUPPORT', 'SALES']),
    subject: z.string().trim().min(1),
    body: ticketBodySchema,
  })
  .refine((data) => TICKET_SUBJECTS[data.type]?.includes(data.subject), {
    message: 'Subject is not valid for this ticket type',
    path: ['subject'],
  });

export const addTicketMessageSchema = z.object({ body: ticketBodySchema });

// ACTIVE is UNANSWERED + ANSWERED — the "open" tickets a user or admin cares
// about day to day, vs. explicitly asking for CLOSED history.
export const listTicketsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'UNANSWERED', 'ANSWERED', 'CLOSED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export const adminListTicketsQuerySchema = listTicketsQuerySchema.extend({
  type: z.enum(['SUPPORT', 'SALES']).optional(),
});

export const ticketNotificationsQuerySchema = z.object({
  since: z.string().datetime().optional(),
});
