// The free email verifier on /tools/email-verifier (content page
// src/content/pages/tools/email-verifier.js). Calls
// POST /api/v1/public/tools/verify-email — see backend/src/routes/publicTools.js.
import { useId, useRef, useState } from 'react';
import { Check, Info, Minus, X } from 'lucide-react';
import { useVerifyEmailPublicMutation } from '../../../api/marketingApi.js';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';
import { formatCount } from '../../../data/facts.js';
import { SignupCta, SubmitButton, ToolError, ToolField } from './toolUi.jsx';

const MAX_LENGTH = 254;

// Same status colors as components/ui/StatusPill.jsx (success/warning/danger).
const VERDICTS = {
  valid: { label: 'Valid', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  risky: { label: 'Risky', pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  invalid: { label: 'Invalid', pill: 'bg-red-500/10 text-red-700 dark:text-red-400' },
};

const REASONS = {
  ok: 'The format, the domain and its mail server all check out.',
  invalid_syntax: 'The address isn’t written like an email address.',
  no_domain: 'The domain after the @ doesn’t exist.',
  no_mail_server: 'The domain has no mail server set up to receive email.',
  disposable: 'It uses a disposable, throwaway email service.',
  role_account: 'It’s a shared role address, like info@ or sales@, not one person’s inbox.',
};

// The six checks, each as pass/fail in words. `good` is the value that
// passes; freeProvider is informational, so it's a note, never a fail.
const CHECKS = [
  {
    key: 'syntax',
    name: 'Format',
    good: true,
    pass: 'Written like a valid address',
    fail: 'Not a valid address format',
  },
  {
    key: 'domainExists',
    name: 'Domain',
    good: true,
    pass: 'The domain exists',
    fail: 'The domain wasn’t found',
  },
  {
    key: 'mxRecords',
    name: 'Mail server',
    good: true,
    pass: 'MX records found',
    fail: 'No MX records found',
  },
  {
    key: 'disposable',
    name: 'Disposable',
    good: false,
    pass: 'Not a throwaway email service',
    fail: 'A throwaway email service',
  },
  {
    key: 'roleAccount',
    name: 'Role address',
    good: false,
    pass: 'Looks like one person’s address',
    fail: 'A shared inbox, like info@ or sales@',
  },
  {
    key: 'freeProvider',
    name: 'Free provider',
    info: true,
    pass: 'A company or custom domain',
    fail: 'A free provider, like Gmail or Outlook',
  },
];

const STATES = {
  pass: {
    word: 'Pass',
    wordClass: 'text-emerald-700 dark:text-emerald-400',
    icon: <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />,
  },
  fail: {
    word: 'Fail',
    wordClass: 'text-red-700 dark:text-red-400',
    icon: <X className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />,
  },
  info: {
    word: 'Note',
    wordClass: 'text-text-muted',
    icon: <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />,
  },
  skipped: {
    word: 'Not checked',
    wordClass: 'text-text-muted',
    icon: <Minus className="h-4 w-4 text-text-muted" aria-hidden="true" />,
  },
};

/** Problems the browser can catch before spending one of the hour's checks. */
export function validateEmailInput(value) {
  const email = value.trim();
  if (!email) return 'Enter an email address to check.';
  if (email.length > MAX_LENGTH)
    return `That’s ${email.length} characters. An email address can be at most ${MAX_LENGTH}.`;
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1)
    return 'An email address needs a name, an @ and a domain, like jane@acme.com.';
  return null;
}

// `skipped` is why a check never ran (a malformed address, a DNS lookup
// that didn't finish), or null when it did.
function CheckRow({ check, value, skipped }) {
  let state;
  if (skipped) state = 'skipped';
  else if (check.info) state = value ? 'info' : 'pass';
  else state = value === check.good ? 'pass' : 'fail';
  const { word, wordClass, icon } = STATES[state];
  const detail = skipped ?? (state === 'pass' ? check.pass : check.fail);

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-bold text-text">{check.name}</span>
        <span className="text-text-muted">: {detail}</span>
      </span>
      <span className={`shrink-0 text-xs font-bold uppercase tracking-wide ${wordClass}`}>
        {word}
      </span>
    </li>
  );
}

function Result({ result }) {
  const verdict = VERDICTS[result.verdict] ?? VERDICTS.risky;
  const checks = result.checks ?? {};
  // A malformed address has no domain to look up, so the other checks never
  // ran. "Risky, no mail server" for a domain that doesn't exist can only
  // mean the DNS lookup timed out or failed (a missing domain is invalid).
  const dnsUnknown =
    result.reason === 'no_mail_server' && result.verdict === 'risky' && !checks.domainExists;
  const skippedFor = (key) => {
    if (key === 'syntax') return null;
    if (!checks.syntax) return 'Skipped, because the format isn’t valid';
    if (dnsUnknown && (key === 'domainExists' || key === 'mxRecords'))
      return 'Couldn’t be checked, the DNS lookup didn’t finish';
    return null;
  };
  const reason = dnsUnknown
    ? 'The domain couldn’t be checked right now.'
    : (REASONS[result.reason] ?? REASONS.ok);
  const mxHosts = result.mxHosts ?? [];
  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface-elevated p-5 sm:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="min-w-0 break-all text-lg font-extrabold text-text">{result.email}</h3>
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${verdict.pill}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {verdict.label}
          </span>
        </div>
        <p className="text-sm font-semibold text-text">{reason}</p>
        {result.note && <p className="text-sm leading-relaxed text-text-muted">{result.note}</p>}
        {/* Say what "valid" can't promise, unless the note already does. */}
        {result.verdict === 'valid' && !/mailbox/i.test(result.note ?? '') && (
          <p className="text-xs leading-relaxed text-text-muted">
            Valid means this domain can receive email. It doesn’t confirm that this mailbox exists.
          </p>
        )}
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">Checks</h4>
        <ul className="mt-1 divide-y divide-border">
          {CHECKS.map((check) => (
            <CheckRow
              key={check.key}
              check={check}
              value={Boolean(checks[check.key])}
              skipped={skippedFor(check.key)}
            />
          ))}
        </ul>
      </div>

      {mxHosts.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
            Mail servers (MX records)
          </h4>
          <ol className="mt-2 flex flex-col gap-1 font-mono text-xs text-text">
            {mxHosts.map((host) => (
              <li key={host} className="break-all">
                {host}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** Email input, "Check email" button and the result card. */
export function EmailVerifierTool() {
  const id = useId();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const inputRef = useRef(null);
  const [verify, { data, error, isLoading, reset }] = useVerifyEmailPublicMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validateEmailInput(email);
    setFieldError(problem);
    if (problem) {
      reset();
      inputRef.current?.focus();
      return;
    }
    try {
      await verify({ email: email.trim() }).unwrap();
    } catch {
      // Shown from the hook's `error` below.
    }
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 sm:p-7"
    >
      <div>
        <h2 id={`${id}-title`} className="text-xl font-extrabold text-text">
          Check an email address
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Free, with no sign-up. We don’t store the addresses you check.
        </p>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
      >
        <ToolField
          id={`${id}-email`}
          inputRef={inputRef}
          label="Email address"
          className="flex-1"
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="jane.doe@acme.com"
          value={email}
          error={fieldError}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldError) setFieldError(null);
          }}
        />
        <div className="sm:pt-[26px]">
          <SubmitButton busy={isLoading} busyLabel="Checking…">
            Check email
          </SubmitButton>
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col gap-4">
        {isLoading && (
          <p className="text-sm text-text-muted">Checking the domain and its mail servers…</p>
        )}
        {!isLoading && error && (
          <ToolError error={error} limitTitle="You’ve used the free checks for this hour." />
        )}
        {!isLoading && !error && data && (
          <>
            <Result result={data} />
            <SignupCta
              title="Need contacts, not just checks?"
              text={`Find people at any company in DataPit and reveal their verified work email. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`}
            />
          </>
        )}
      </div>
    </section>
  );
}
