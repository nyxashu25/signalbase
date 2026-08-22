import { useListTicketsQuery } from '../api/ticketsApi.js';

const POLL_INTERVAL_MS = 30_000;

/**
 * This workspace's tickets sitting in ANSWERED status — support has replied
 * and it's the user's turn. There's no per-user read/unread tracking in the
 * Ticket model, so this reuses the same status the ticket list already
 * filters by (see ticketService.statusWhere) as the closest available proxy
 * for "something new to look at", rather than adding a whole read-receipt
 * system for one nav badge. One polled query feeds both the sidebar badge
 * (count) and the header notification bell (the rows themselves).
 */
export function useAnsweredTickets() {
  const { data } = useListTicketsQuery(
    { status: 'ANSWERED', pageSize: 5 },
    { pollingInterval: POLL_INTERVAL_MS },
  );
  return { count: data?.total ?? 0, tickets: data?.results ?? [] };
}

export function useAnsweredTicketsBadge() {
  return useAnsweredTickets().count;
}
