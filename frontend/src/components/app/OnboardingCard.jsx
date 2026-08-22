import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { useGetOnboardingQuery } from '../../api/dashboardApi.js';
import { Tooltip } from '../ui/Tooltip.jsx';

// Sidebar progress card for the getting-started checklist (docs/UX-ROADMAP
// §1.4 / Phase 3). Shares the cached checklist query with the Home screen
// and the reward toasts, so it costs no extra request; disappears for good
// once everything is done.
export function OnboardingCard({ collapsed = false }) {
  const { data } = useGetOnboardingQuery();
  if (!data || data.percent >= 100) return null;

  const label = `Getting started · ${data.completedCount} of ${data.totalCount} done`;

  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        <Link
          to="/app?view=getting-started"
          aria-label={label}
          className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-elevated text-primary hover:bg-surface-hover"
        >
          <Rocket className="h-4 w-4" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 overflow-hidden rounded-full bg-surface-sunken"
          >
            <span className="block h-full bg-primary" style={{ width: `${data.percent}%` }} />
          </span>
        </Link>
      </Tooltip>
    );
  }

  return (
    <Link
      to="/app?view=getting-started"
      data-testid="onboarding-card"
      className="block rounded-lg border border-border bg-surface-elevated p-3 transition-colors hover:border-text-muted/40"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
          <Rocket className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Getting started
        </p>
        <span className="text-[11px] font-bold tabular-nums text-text">{data.percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={data.percent}
        aria-label="Getting started progress"
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-brand"
          style={{ width: `${data.percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {data.completedCount} of {data.totalCount} done
        {data.creditsEarned < data.creditsAvailable && (
          <>
            {' '}
            · <span className="font-semibold text-text">+{data.creditsAvailable - data.creditsEarned} credits</span> to
            earn
          </>
        )}
      </p>
    </Link>
  );
}
