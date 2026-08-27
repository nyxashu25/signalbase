import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useGetBillingSummaryQuery } from '../api/billingApi.js';
import { Button } from './ui/Button.jsx';

const STORAGE_KEY = 'dp:nag:lastShown';
const SHOW_EVERY_MS = 24 * 60 * 60 * 1000; // once a day, per browser

function lastShown() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // storage unavailable (private mode) — the nag just shows next session
  }
}

/**
 * The recurring "upgrade your plan" reminder for FREE workspaces: a
 * dismissible modal shown at most once every 24h per browser, never on the
 * Billing page itself (they're already where the CTA leads).
 */
export function UpgradeNagModal() {
  const { data: summary } = useGetBillingSummaryQuery();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onBilling = location.pathname.startsWith('/app/billing');

  useEffect(() => {
    if (!summary || summary.plan !== 'FREE' || onBilling) return;
    if (Date.now() - lastShown() < SHOW_EVERY_MS) return;
    setOpen(true);
    markShown();
  }, [summary, onBilling]);

  if (!open || summary?.plan !== 'FREE') return null;

  function dismiss() {
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade your plan"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface-elevated p-6 shadow-dp-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-md p-1 text-text-muted hover:bg-surface hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <h2 className="mt-4 text-lg font-bold text-text">You're on the Free plan</h2>
        <p className="mt-2 text-sm text-text-muted">
          Upgrade to a seat-block plan to bring in your team: every paid seat earns up to 2,000
          personal credits a month, free bonus seats earn 1,500, and each newly covered teammate
          gets a one-time 1,500-credit welcome gift.
        </p>
        <div className="mt-5 flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              dismiss();
              navigate('/app/billing');
            }}
          >
            See plans
          </Button>
          <Button variant="ghost" onClick={dismiss}>
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
