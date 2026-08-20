import * as ticketService from '../services/ticketService.js';

export async function index(req, res) {
  res.json(await ticketService.listAllTickets(req.validatedQuery));
}

export async function show(req, res) {
  res.json(await ticketService.getTicketForAdmin(req.params.id));
}

export async function reply(req, res) {
  const ticket = await ticketService.addAdminReply(req.params.id, req.superAdmin.adminId, req.body.body);
  res.json(ticket);
}

export async function close(req, res) {
  res.json(await ticketService.closeTicket(req.params.id));
}

export async function notifications(req, res) {
  res.json(await ticketService.getTicketNotifications(req.validatedQuery.since));
}
