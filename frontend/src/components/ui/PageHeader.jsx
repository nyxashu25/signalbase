import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { CountPill } from './StatusPill.jsx';
import { cn } from './cn.js';

/**
 * The one page-top pattern for every /app screen (docs/UX-ROADMAP.md §1.6):
 *
 *   [← back]
 *   Title  ·  subtitle                              [tertiary] [primary]
 *   description
 *   ── tab ── tab 3 ── tab ──────────────────────────────────────────────
 *
 * `tabs`: [{ key, label, count }] + `activeTab`/`onTabChange` renders the
 * underline sub-tabs with count pills. `actions` is a node (usually one or
 * two <Button>s) placed top-right.
 */
export function PageHeader({
  title,
  subtitle,
  description,
  backTo,
  backLabel = 'Back',
  actions,
  tabs,
  activeTab,
  onTabChange,
  className,
  children,
}) {
  return (
    <div className={cn('mb-5', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-text-muted hover:text-text"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <h1 className="text-xl font-bold tracking-tight text-text">{title}</h1>
            {subtitle && <span className="text-sm text-text-muted">{subtitle}</span>}
          </div>
          {description && <p className="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
      {tabs && tabs.length > 0 && (
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onTabChange?.(tab.key)}
                className={cn(
                  '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors',
                  active
                    ? 'border-primary text-text'
                    : 'border-transparent text-text-muted hover:border-border hover:text-text',
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <CountPill tone={active && tab.count > 0 && tab.emphasize ? 'accent' : 'neutral'}>
                    {tab.count}
                  </CountPill>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
