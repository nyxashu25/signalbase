import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from './cn.js';

// One button. `variant` encodes the decision in docs/UX-ROADMAP.md §3:
//   hero      — the single brand-gradient action per screen (Create X,
//               Upgrade). Use at most once per view.
//   primary   — flat solid accent; the default "do the thing" button.
//   secondary — outlined, neutral. Most actions should be this.
//   ghost     — no border; toolbars, icon buttons, table-row actions.
//   danger    — destructive; outlined red until hovered.
// `to` renders a router Link with identical styling; `href` an <a>.
const VARIANTS = {
  hero: 'bg-gradient-action text-white shadow-[0_8px_20px_rgba(148,0,222,0.22)] hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(148,0,222,0.28)]',
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary:
    'border border-border bg-surface-elevated text-text hover:border-text-muted/40 hover:bg-surface-hover',
  ghost: 'text-text-muted hover:bg-surface-hover hover:text-text',
  danger: 'border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400',
};

const SIZES = {
  xs: 'h-7 gap-1 px-2 text-xs',
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-10 gap-2 px-4 text-sm',
};

const ICON_ONLY_SIZES = { xs: 'h-7 w-7', sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-10 w-10' };

export const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    iconOnly = false,
    loading = false,
    className,
    children,
    to,
    href,
    type = 'button',
    disabled,
    ...rest
  },
  ref,
) {
  const classes = cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    iconOnly ? ICON_ONLY_SIZES[size] : SIZES[size],
    className,
  );
  const iconClass = size === 'lg' || size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const content = (
    <>
      {loading ? (
        <Loader2 className={cn(iconClass, 'animate-spin')} aria-hidden="true" />
      ) : (
        Icon && <Icon className={iconClass} aria-hidden="true" />
      )}
      {!iconOnly && children}
      {IconRight && !loading && <IconRight className={iconClass} aria-hidden="true" />}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} aria-disabled={disabled || undefined} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
});
