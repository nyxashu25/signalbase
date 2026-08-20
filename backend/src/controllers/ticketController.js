import * as ticketService from '../services/ticketService.js';
import { TICKET_SUBJECTS, TICKET_BODY_MAX_WORDS } from '../config/ticketConfig.js';

export function getSubjects(req, res) {
  res.json({ subjects: TICKET_SUBJECTS, maxWords: TICKET_BODY_MAX_WORDS });
}

export async function create(req, res) {
  const { workspaceId, userId } = req.auth;
  const ticket = await ticketService.createTicket({ workspaceId, userId, ...req.body });
  res.status(201).json(ticket);
}

export async function index(req, res) {
  const { workspaceId } = req.auth;
  res.json(await ticketService.listTicketsForWorkspace(workspaceId, req.validatedQuery));
}

export async function show(req, res) {
  const { workspaceId } = req.auth;
  res.json(await ticketService.getTicketForWorkspace(workspaceId, req.params.id));
}

export async function reply(req, res) {
  const { workspaceId, userId } = req.auth;
  const ticket = await ticketService.addUserReply(workspaceId, req.params.id, userId, req.body.body);
  res.json(ticket);
}
