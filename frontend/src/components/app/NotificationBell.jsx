import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquareReply } from 'lucide-react';
import { useAnsweredTickets } from '../../hooks/useAnsweredTicketsBadge.js';
import { Tooltip } from '../ui/Tooltip.jsx';
import { cn } from '../ui/cn.js';

const SEEN_KEY = 'dp-notifications-seen-at';

function readSeenAt() {
  try {
    return localStorage.getItem(SEEN_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Header bell: lists tickets support has replied to (the only event stream
 * the app has today that is genuinely "for you"). The unread dot compares
 * the newest reply's timestamp against when the bell was last opened —
 * persisted per browser, so it clears once you've looked and stays clear
 * across reloads until something newer lands.
 */
export function NotificationBell() {
  const { count, tickets } = useAnsweredTickets();
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState(readSeenAt);
  const rootRef = useRef(null);

  const newest = tickets[0]?.updatedAt ?? '';
  const hasUnread = count > 0 && newest > seenAt;

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && newest) {
      setSeenAt(newest);
      try {
        localStorage.setItem(SEEN_KEY, newest);
      } catch {
        // storage unavailable — dot still clears for this tab
      }
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <Tooltip content="Notifications">
        <button
          type="button"
          onClick={toggle}
          aria-label={hasUnread ? `Notifications, ${count} new` : 'Notifications'}
          aria-haspopup="true"
          aria-expanded={open}
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text',
            open && 'bg-surface-hover text-text',
          )}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface-elevated"
            />
          )}
        </button>
      </Tooltip>

      {open && (
        <div className="dp-pop-in absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-dp-md">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <p className="text-sm font-bold text-text">Notifications</p>
            {count > 0 && (
              <Link
                to="/app/tickets"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all tickets
              </Link>
            )}
          </div>
          {tickets.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-text-muted">
              You&rsquo;re all caught up.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/app/tickets/${t.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-3.5 py-2.5 hover:bg-surface-hover"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <MessageSquareReply className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-text">
                        Support replied: {t.subject}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {new Date(t.updatedAt).toLocaleString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
