import { Link } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { useGetBillingSummaryQuery } from '../api/billingApi.js';
import { Tooltip } from './ui/Tooltip.jsx';

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
  const low = summary && summary.balance <= 10;

  return (
    <Tooltip content="Credit balance — go to Billing">
      <Link
        to="/app/billing"
        aria-label="Credit balance — go to Billing"
        className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition-colors ${
          low
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400'
            : 'border-border bg-surface-elevated text-text hover:border-text-muted/40 hover:bg-surface-hover'
        }`}
      >
        <Coins className={`h-3.5 w-3.5 ${low ? '' : 'text-primary'}`} aria-hidden="true" />
        <span className="tabular-nums">{summary?.balance ?? '—'}</span>
        <span className="font-semibold text-text-muted">credits</span>
      </Link>
    </Tooltip>
  );
}
