import { cn } from './cn.js';

// Semantic color is reserved for *status* (see docs/UX-ROADMAP.md §1.7) —
// every pill in the app goes through this so green/amber/red mean the same
// thing everywhere and the accent purple is never used for state.
const TONES = {
  neutral: 'bg-surface-sunken text-text-muted',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-700 dark:text-red-400',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  accent: 'bg-primary/10 text-primary',
};

export function StatusPill({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

// Small count badge for tabs/nav ("All tasks  0"). Neutral by default; pass
// tone="accent" for the "this needs you" variant.
export function CountPill({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums leading-none',
        tone === 'accent' ? 'bg-primary text-white' : 'bg-surface-sunken text-text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
