import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, AlertTriangle, CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from './cn.js';

const TONES = {
  info: {
    wrap: 'border-sky-500/25 bg-sky-500/10 text-text',
    icon: 'text-sky-500',
    Icon: Info,
  },
  warning: {
    wrap: 'border-amber-500/30 bg-amber-500/10 text-text',
    icon: 'text-amber-500',
    Icon: AlertTriangle,
  },
  success: {
    wrap: 'border-emerald-500/30 bg-emerald-500/10 text-text',
    icon: 'text-emerald-500',
    Icon: CheckCircle2,
  },
  danger: {
    wrap: 'border-red-500/30 bg-red-500/10 text-text',
    icon: 'text-red-500',
    Icon: XCircle,
  },
};

function readDismissed(key) {
  if (!key) return false;
  try {
    return localStorage.getItem(`dp-banner-dismissed:${key}`) === '1';
  } catch {
    return false;
  }
}

/**
 * Inline page-level notice: ⓘ/⚠/✓/✕ icon · title + body · optional
 * right-aligned action (a Link or a button) · optional dismiss ×. Pass
 * `dismissKey` to remember a dismissal across sessions (localStorage);
 * without it the banner just hides for this mount.
 */
export function Banner({
  tone = 'info',
  title,
  children,
  action,
  actionTo,
  onAction,
  dismissible = false,
  dismissKey,
  onDismiss,
  className,
}) {
  const [dismissed, setDismissed] = useState(() => readDismissed(dismissKey));
  if (dismissed) return null;
  const { wrap, icon, Icon } = TONES[tone] ?? TONES.info;

  function dismiss() {
    setDismissed(true);
    if (dismissKey) {
      try {
        localStorage.setItem(`dp-banner-dismissed:${dismissKey}`, '1');
      } catch {
        // storage unavailable — in-memory dismissal is fine for this tab
      }
    }
    onDismiss?.();
  }

  const actionClass = 'shrink-0 text-sm font-semibold underline-offset-2 hover:underline';

  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-md border px-3.5 py-2.5 text-sm',
        wrap,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-text-muted')}>{children}</div>}
      </div>
      {action &&
        (actionTo ? (
          <Link to={actionTo} className={actionClass}>
            {action}
          </Link>
        ) : (
          <button type="button" onClick={onAction} className={actionClass}>
            {action}
          </button>
        ))}
      {dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-0.5 rounded-sm p-1 text-text-muted hover:bg-black/5 hover:text-text dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
