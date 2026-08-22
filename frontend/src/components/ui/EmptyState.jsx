import { cn } from './cn.js';

/**
 * The empty-screen anatomy from docs/UX-ROADMAP.md §1.4: icon/illustration
 * → headline → one or two lines of guidance → 1–2 CTAs → learn-more link.
 * `icon` is a lucide component rendered in a soft accent tile; pass
 * `illustration` (any node) instead to swap in artwork later.
 */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  children,
  actions,
  learnMore,
  compact = false,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-10' : 'px-6 py-16 sm:py-20',
        className,
      )}
    >
      {illustration ??
        (Icon && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        ))}
      <h2 className="text-base font-bold text-text">{title}</h2>
      {children && <p className="mt-1.5 max-w-md text-sm text-text-muted">{children}</p>}
      {actions && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
      {learnMore && <div className="mt-4 text-xs text-text-muted">{learnMore}</div>}
    </div>
  );
}
