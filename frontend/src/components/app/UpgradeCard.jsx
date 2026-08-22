import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useGetBillingSummaryQuery } from '../../api/billingApi.js';
import { findPlan } from '../../data/plans.js';

// The always-visible upsell at the bottom of the sidebar — only for
// workspaces with somewhere to go. Reads the same billing summary the
// CreditBadge already polls, so this costs no extra request. Collapsed
// (rail) mode shrinks it to just the icon.
export function UpgradeCard({ collapsed = false }) {
  const { data: summary } = useGetBillingSummaryQuery();
  if (!summary || summary.plan === 'ORGANIZATION') return null;

  const plan = findPlan(summary.plan);
  const isFree = summary.plan === 'FREE';

  if (collapsed) {
    return (
      <Link
        to="/app/billing"
        aria-label="Upgrade plan"
        title="Upgrade plan"
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md bg-gradient-action text-white shadow-[0_6px_16px_rgba(148,0,222,0.25)]"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
        {plan?.name ?? summary.plan} plan
      </p>
      <p className="mt-1 text-xs text-text-muted">
        {isFree
          ? `${summary.monthlyCreditGrant} credits a month. Upgrade for more credits and sequences.`
          : 'Need more credits or seats? Move up a tier any time.'}
      </p>
      <Link
        to="/app/billing"
        className="mt-2.5 flex h-8 items-center justify-center gap-1.5 rounded-md bg-gradient-action text-xs font-bold text-white shadow-[0_6px_16px_rgba(148,0,222,0.22)] transition-transform duration-150 ease-brand hover:-translate-y-px"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Upgrade
      </Link>
    </div>
  );
}
