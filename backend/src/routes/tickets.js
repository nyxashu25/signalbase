import { Router } from 'express';
import * as ticketController from '../controllers/ticketController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createTicketSchema,
  addTicketMessageSchema,
  listTicketsQuerySchema,
} from '../validators/ticketValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

ticketsRouter.get('/subjects', ticketController.getSubjects);
ticketsRouter.get('/', validateQuery(listTicketsQuerySchema), asyncHandler(ticketController.index));
ticketsRouter.post('/', validateBody(createTicketSchema), asyncHandler(ticketController.create));
ticketsRouter.get('/:id', asyncHandler(ticketController.show));
ticketsRouter.post(
  '/:id/messages',
  validateBody(addTicketMessageSchema),
  asyncHandler(ticketController.reply),
);
