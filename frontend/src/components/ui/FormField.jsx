import { forwardRef } from 'react';
import { cn } from './cn.js';

// The one text-input look inside /app (settings forms, list/sequence
// builders). `hint` is helper copy under the field; `error` replaces it in
// red and marks the input invalid.
export const inputClass =
  'h-9 w-full rounded-md border border-border bg-surface-elevated px-3 text-sm text-text outline-none placeholder:text-text-muted/60 focus:border-focus focus:ring-2 focus:ring-focus/25 disabled:cursor-not-allowed disabled:opacity-60';

export const FormField = forwardRef(function FormField(
  { label, hint, error, id, className, children, ...inputProps },
  ref,
) {
  const inputId = id ?? `field-${label?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-text">
          {label}
        </label>
      )}
      {children ?? (
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(inputClass, error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20')}
          {...inputProps}
        />
      )}
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-xs text-text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
});

// Label + description + control row, the way a settings page lists toggles.
export function SettingRow({ title, description, children, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4 py-4', className)}>
      <div className="min-w-0 max-w-xl">
        <p className="text-sm font-semibold text-text">{title}</p>
        {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Accessible switch — a real button with role=switch, styled with the
// accent only when on.
export function Switch({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50',
        checked ? 'border-primary bg-primary' : 'border-border bg-surface-sunken',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}
