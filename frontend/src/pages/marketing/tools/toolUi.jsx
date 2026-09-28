// Shared pieces of the free tools (EmailVerifierTool, EmailFinderTool): the
// labelled input, the submit button, error wording and the sign-up nudge.
// Everything here renders on the server too — no window or document access.
import { Link } from 'react-router-dom';

export const SIGNUP_PATH = '/login?mode=register';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export const linkClass = `rounded-sm font-semibold text-primary underline-offset-2 hover:underline ${FOCUS_RING}`;

/** A labelled text input; `error` is announced with the field and marks it invalid. */
export function ToolField({ id, label, error, hint, inputRef, className = '', ...inputProps }) {
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`h-[44px] w-full rounded-md border bg-surface-elevated px-3.5 text-sm text-text outline-none placeholder:text-text-muted/70 focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)] ${
          error ? 'border-red-500/70' : 'border-border'
        }`}
        {...inputProps}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({ busy, busyLabel, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={`h-[44px] shrink-0 rounded-md bg-gradient-action px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${FOCUS_RING}`}
    >
      {busy ? busyLabel : children}
    </button>
  );
}

/** "in 42 minutes" / "in about 3 hours" for a Retry-After in seconds; null if unknown. */
export function formatWait(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  if (seconds < 60) return 'in less than a minute';
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.round(minutes / 60);
  return `in about ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/**
 * What went wrong with a free-tool request, in words: the rate limit with
 * the wait and a sign-up link, the server's own validation message, or a
 * network / server problem and what to do about it. Render it inside the
 * tool's aria-live region so it's announced.
 */
export function ToolError({ error, limitTitle }) {
  if (!error) return null;
  if (error.status === 429) {
    const wait = formatWait(error.retryAfter);
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <p className="font-bold text-text">{limitTitle}</p>
        <p className="mt-1 text-text-muted">
          {wait ? `You can try again ${wait}. ` : 'You can try again later. '}
          <Link to={SIGNUP_PATH} className={linkClass}>
            Sign up free
          </Link>{' '}
          to search and reveal contacts in DataPit without this limit.
        </p>
      </div>
    );
  }
  let message;
  if (error.status === 'FETCH_ERROR') {
    message = 'We couldn’t reach DataPit. Check your internet connection and try again.';
  } else if (error.status === 400) {
    // validateBody's 400: { message: 'Validation failed', details: { fieldErrors } }.
    const fieldMessages = Object.values(error.data?.error?.details?.fieldErrors ?? {}).flat();
    message = fieldMessages.length
      ? `${fieldMessages.map((m) => String(m).replace(/\.?$/, '.')).join(' ')} Fix it and try again.`
      : 'Some of the details weren’t accepted. Check them and try again.';
  } else if (typeof error.status === 'number' && error.status >= 500) {
    message = 'Something went wrong on our side. Wait a minute and try again.';
  } else {
    message = error.data?.error?.message || 'The request didn’t go through. Try again in a minute.';
  }
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-text">
      {message}
    </p>
  );
}

/** The short sign-up nudge under a result. */
export function SignupCta({ title, text, to = SIGNUP_PATH, label = 'Sign up free' }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-text">{title}</p>
        {text && <p className="mt-1 text-sm leading-relaxed text-text-muted">{text}</p>}
      </div>
      <Link
        to={to}
        className={`shrink-0 rounded-md bg-gradient-action px-5 py-2.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px ${FOCUS_RING}`}
      >
        {label}
      </Link>
    </div>
  );
}
