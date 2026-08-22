import { useListTicketsQuery } from '../api/ticketsApi.js';

const POLL_INTERVAL_MS = 30_000;

/**
 * Count of this workspace's tickets sitting in ANSWERED status — support
 * has replied and it's the user's turn. There's no per-user read/unread
 * tracking in the Ticket model, so this reuses the same status the ticket
 * list already filters by (see ticketService.statusWhere) as the closest
 * available proxy for "something new to look at", rather than adding a
 * whole read-receipt system for one nav badge.
 */
export function useAnsweredTicketsBadge() {
  const { data } = useListTicketsQuery(
    { status: 'ANSWERED', pageSize: 1 },
    { pollingInterval: POLL_INTERVAL_MS },
  );
  return data?.total ?? 0;
}
