import { useEffect, useRef, useState } from 'react';
import { useGetAdminTicketNotificationsQuery } from '../api/adminDataApi.js';

// Polls GET /admin/tickets/notifications and fires a native browser
// Notification for each newly-arrived unanswered ticket — only while the
// control panel is open in a tab. No service worker or push subscription:
// this is the "in-app while /control is open" tier, not true web push.
const POLL_INTERVAL_MS = 20_000;

export function useTicketNotifications() {
  // undefined until the first response lands — used as the RTK Query arg
  // (unfiltered poll) and as the signal that we haven't established a
  // baseline yet.
  const [since, setSince] = useState(undefined);
  const initializedRef = useRef(false);

  const { data } = useGetAdminTicketNotificationsQuery(since, {
    pollingInterval: POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (!data) return;

    if (!initializedRef.current) {
      // First load only establishes a baseline — an admin opening the panel
      // shouldn't get a flood of notifications for the existing backlog of
      // unanswered tickets that predate this session.
      initializedRef.current = true;
      if (data.latestCreatedAt) setSince(data.latestCreatedAt);
      return;
    }

    if (
      data.tickets.length > 0 &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      for (const ticket of data.tickets) {
        const notification = new Notification('New ticket raised', {
          body: `${ticket.workspace?.name ?? 'A workspace'} — ${ticket.subject}`,
          tag: ticket.id,
        });
        notification.onclick = () => {
          window.focus();
          window.location.href = `/control/tickets/${ticket.id}`;
        };
      }
    }

    if (data.latestCreatedAt) setSince(data.latestCreatedAt);
  }, [data]);

  return { unansweredCount: data?.unansweredCount ?? 0 };
}
