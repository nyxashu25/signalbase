import { Link } from 'react-router-dom';
import { useGetBillingSummaryQuery } from '../api/billingApi.js';

// Polls as a safety net for balance changes this tab didn't cause itself —
// a teammate revealing a contact, or a Stripe top-up webhook landing.
// Actions taken in this tab update instantly via BillingSummary tag
// invalidation (see billingApi.js, contactsApi.js, sequencesApi.js,
// searchApi.js, useCsvDownload.js) — polling only has to catch the rest.
const POLL_INTERVAL_MS = 30_000;

export function CreditBadge() {
  const { data: summary } = useGetBillingSummaryQuery(undefined, {
    pollingInterval: POLL_INTERVAL_MS,
  });

  return (
    <Link
      to="/app/billing"
      title="Credit balance — go to Billing"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm font-bold text-text transition-colors hover:border-primary/40 hover:text-primary"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-primary">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path
          d="M9.5 15.5c.5.7 1.4 1 2.5 1 1.7 0 2.7-.8 2.7-1.9 0-2.6-4.9-1.3-4.9-3.9 0-1.1 1-1.9 2.5-1.9 1 0 1.9.3 2.4 1M12 7.5v9"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="tabular-nums">{summary?.balance ?? '—'}</span>
    </Link>
  );
}
