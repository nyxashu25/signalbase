import { prisma } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import * as notificationService from './notificationService.js';

function serializeTicket(t) {
  return {
    id: t.id,
    type: t.type,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    closedAt: t.closedAt,
    workspace: t.workspace ? { id: t.workspace.id, name: t.workspace.name } : undefined,
    createdBy: t.createdBy
      ? { id: t.createdBy.id, name: t.createdBy.name, email: t.createdBy.email }
      : undefined,
    // When the list query included the newest message: who spoke last and
    // how many messages the thread has — enough for the admin panel to tell
    // "brand-new ticket" from "customer replied to an answered thread".
    lastMessageAuthorType: t.messages?.[0]?.authorType,
    messageCount: t._count?.messages,
  };
}

const LAST_MESSAGE_INCLUDE = {
  messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { authorType: true } },
  _count: { select: { messages: true } },
};

/** Per-status totals for the tab pills — one grouped query. */
async function countTicketsByStatus(where) {
  const rows = await prisma.ticket.groupBy({ by: ['status'], where, _count: true });
  const counts = { UNANSWERED: 0, ANSWERED: 0, CLOSED: 0 };
  for (const row of rows) counts[row.status] = row._count;
  return { ...counts, ACTIVE: counts.UNANSWERED + counts.ANSWERED };
}

function serializeMessage(m) {
  return {
    id: m.id,
    authorType: m.authorType,
    authorName:
      m.authorType === 'ADMIN' ? (m.authorAdmin?.name ?? 'Support team') : (m.authorUser?.name ?? 'User'),
    body: m.body,
    createdAt: m.createdAt,
  };
}

// status=undefined means "no filter" (all statuses); status='ACTIVE' means
// "still open" (UNANSWERED or ANSWERED) — everything else is a literal
// column match.
function statusWhere(status) {
  if (!status) return {};
  if (status === 'ACTIVE') return { status: { in: ['UNANSWERED', 'ANSWERED'] } };
  return { status };
}

export async function createTicket({ workspaceId, userId, type, subject, body }) {
  const ticket = await prisma.ticket.create({
    data: {
      workspaceId,
      createdById: userId,
      type,
      subject,
      status: 'UNANSWERED',
      messages: { create: { authorType: 'USER', authorUserId: userId, body } },
    },
    include: { createdBy: true },
  });
  await notificationService.sendTicketCreatedConfirmation(ticket.createdBy, ticket);
  return serializeTicket(ticket);
}

export async function listTicketsForWorkspace(workspaceId, { status, page, pageSize }) {
  const where = { workspaceId, ...statusWhere(status) };
  const [total, tickets, counts] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: LAST_MESSAGE_INCLUDE,
    }),
    countTicketsByStatus({ workspaceId }),
  ]);
  return { results: tickets.map(serializeTicket), total, page, pageSize, counts };
}

export async function getTicketForWorkspace(workspaceId, ticketId) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, workspaceId },
    include: {
      messages: { orderBy: { createdAt: 'asc' }, include: { authorAdmin: true, authorUser: true } },
    },
  });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  return { ...serializeTicket(ticket), messages: ticket.messages.map(serializeMessage) };
}

export async function addUserReply(workspaceId, ticketId, userId, body) {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, workspaceId } });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (ticket.status === 'CLOSED') throw new ApiError(400, 'This ticket is closed');

  await prisma.ticketMessage.create({
    data: { ticketId, authorType: 'USER', authorUserId: userId, body },
  });
  // Flips back to UNANSWERED even if the admin had already replied — the
  // ball is back in the admin's court until they reply again.
  const updated = await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'UNANSWERED' } });
  return serializeTicket(updated);
}

export async function listAllTickets({ status, type, page, pageSize }) {
  const where = { ...statusWhere(status), ...(type ? { type } : {}) };
  const [total, tickets, counts] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { workspace: true, createdBy: true, ...LAST_MESSAGE_INCLUDE },
    }),
    countTicketsByStatus(type ? { type } : {}),
  ]);
  return { results: tickets.map(serializeTicket), total, page, pageSize, counts };
}

export async function getTicketForAdmin(ticketId) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      workspace: true,
      createdBy: true,
      messages: { orderBy: { createdAt: 'asc' }, include: { authorAdmin: true, authorUser: true } },
    },
  });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  return { ...serializeTicket(ticket), messages: ticket.messages.map(serializeMessage) };
}

export async function addAdminReply(ticketId, adminId, body) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { createdBy: true } });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (ticket.status === 'CLOSED') throw new ApiError(400, 'This ticket is closed');

  await prisma.ticketMessage.create({
    data: { ticketId, authorType: 'ADMIN', authorAdminId: adminId, body },
  });
  const updated = await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'ANSWERED' } });
  await notificationService.sendTicketReplyNotification(ticket.createdBy, updated);
  return serializeTicket(updated);
}

export async function closeTicket(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { createdBy: true } });
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CLOSED', closedAt: new Date() },
  });
  await notificationService.sendTicketClosedNotification(ticket.createdBy, updated);
  return serializeTicket(updated);
}

// Polled by the admin control panel (see TicketNotifier.jsx) to drive the
// in-browser Notification popup — `since` is the last poll's newest
// createdAt the client has already notified about, so a freshly-opened
// panel doesn't fire a notification for every pre-existing ticket at once.
export async function getTicketNotifications(since) {
  // Keyed on updatedAt, not createdAt, so a customer's reply to an already-
  // answered thread (which flips it back to UNANSWERED and bumps updatedAt)
  // surfaces as a notification too, not just brand-new tickets.
  const [tickets, unansweredCount] = await Promise.all([
    prisma.ticket.findMany({
      where: { status: 'UNANSWERED', ...(since ? { updatedAt: { gt: new Date(since) } } : {}) },
      orderBy: { updatedAt: 'asc' },
      take: 20,
      include: { workspace: true, ...LAST_MESSAGE_INCLUDE },
    }),
    prisma.ticket.count({ where: { status: 'UNANSWERED' } }),
  ]);

  const latestAt = tickets.length ? tickets[tickets.length - 1].updatedAt : (since ?? null);
  return {
    tickets: tickets.map((t) => ({
      ...serializeTicket(t),
      kind: (t._count?.messages ?? 1) > 1 ? 'reply' : 'new',
    })),
    unansweredCount,
    latestAt,
    // Back-compat name for the field the panel's poller keyed on.
    latestCreatedAt: latestAt,
  };
}
