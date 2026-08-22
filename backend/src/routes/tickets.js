import { Router } from 'express';
import * as ticketController from '../controllers/ticketController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createTicketSchema,
  addTicketMessageSchema,
  listTicketsQuerySchema,
} from '../validators/ticketValidators.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

// Per-workspace (not per-IP) — the actor here is always an authenticated
// member, so the abuse case is a buggy retry loop or a compromised account
// hammering the API, not anonymous spam.
const createLimiter = rateLimit({
  limit: 10,
  windowSeconds: 60 * 60,
  prefix: 'ticket-create',
  keyFn: byWorkspace,
});
const replyLimiter = rateLimit({
  limit: 30,
  windowSeconds: 60 * 60,
  prefix: 'ticket-reply',
  keyFn: byWorkspace,
});

ticketsRouter.get('/subjects', ticketController.getSubjects);
ticketsRouter.get('/', validateQuery(listTicketsQuerySchema), asyncHandler(ticketController.index));
ticketsRouter.post(
  '/',
  createLimiter,
  validateBody(createTicketSchema),
  asyncHandler(ticketController.create),
);
ticketsRouter.get('/:id', asyncHandler(ticketController.show));
ticketsRouter.post(
  '/:id/messages',
  replyLimiter,
  validateBody(addTicketMessageSchema),
  asyncHandler(ticketController.reply),
);
