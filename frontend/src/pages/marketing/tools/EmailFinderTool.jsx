// The free email finder on /tools/email-finder (content page
// src/content/pages/tools/email-finder.js). Calls
// POST /api/v1/public/tools/find-email — see backend/src/routes/publicTools.js.
// The API only ever returns a masked address; a pattern-based suggestion is
// labelled as an unverified guess everywhere it appears.
import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFindEmailPublicMutation } from '../../../api/marketingApi.js';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';
import { CREDIT_COSTS, formatCount } from '../../../data/facts.js';
import {
  SIGNUP_PATH,
  SignupCta,
  SubmitButton,
  ToolError,
  ToolField,
  linkClass,
} from './toolUi.jsx';

const EMPTY = { firstName: '', lastName: '', domain: '' };

// Two or more labels and an alphabetic top-level one, like the API's check
// (backend/src/utils/domain.js); letters beyond ASCII are fine (bücher.de).
const HOSTNAME =
  /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?(?:\.[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?)*\.(?:\p{L}{2,63}|xn--[a-z0-9-]+)$/u;

/** A bare hostname from a domain, URL or email address, as the API normalizes it. */
export function normalizeDomainInput(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/^[^/]*@/, '')
    .split(/[/?#:]/)[0]
    .replace(/^www\./, '')
    .replace(/\.$/, '');
}

function validate(form) {
  const errors = {};
  if (!form.firstName.trim()) errors.firstName = 'Enter the person’s first name.';
  if (!form.lastName.trim()) errors.lastName = 'Enter the person’s last name.';
  const domain = normalizeDomainInput(form.domain);
  if (!form.domain.trim()) errors.domain = 'Enter the company’s website domain, like acme.com.';
  else if (!HOSTNAME.test(domain))
    errors.domain = 'That doesn’t look like a domain. Use the company’s website, like acme.com.';
  return errors;
}

const percent = (share) => `${Math.round(share * 100)}%`;

function Pill({ tone, children }) {
  const tones = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    neutral: 'bg-surface-sunken text-text-muted',
  };
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

function Guess({ result, companyName }) {
  const { pattern, suggestion } = result;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="warning">Unverified guess</Pill>
        <span className="text-xs text-text-muted">Likely address, not checked</span>
      </div>
      <p className="break-all font-mono text-base font-bold text-text">{suggestion}</p>
      <p className="text-sm leading-relaxed text-text-muted">
        The most common format at {companyName} is{' '}
        <span className="font-mono text-text">{pattern.pattern}</span>, used by{' '}
        {percent(pattern.share)} of the {formatCount(pattern.sampleSize)} addresses at{' '}
        {result.domain} in DataPit. This guess applies it to the name you entered. Nobody has
        confirmed it, so{' '}
        <Link to="/tools/email-verifier" className={linkClass}>
          run it through the free email verifier
        </Link>{' '}
        before you send.
      </p>
    </div>
  );
}

function Result({ result, person }) {
  const companyName = result.company?.name || result.domain;
  const signupUrl = result.signupUrl?.startsWith('/') ? result.signupUrl : SIGNUP_PATH;
  const hasMasked = result.found && result.maskedEmail;
  const showGuess = !hasMasked && result.pattern && result.suggestion;

  let pill;
  let heading;
  let body;
  if (hasMasked) {
    pill = <Pill tone="success">In DataPit</Pill>;
    heading = `${person} at ${companyName} is in DataPit`;
    body = 'Here’s a masked preview of their work email. Sign up free to reveal the full address.';
  } else if (result.found) {
    pill = <Pill tone="neutral">No email on file yet</Pill>;
    heading = `${person} at ${companyName} is in DataPit`;
    body = 'We have this person, but no email address on file for them yet.';
  } else {
    pill = <Pill tone="neutral">Not in DataPit yet</Pill>;
    heading = `${person} at ${companyName} isn’t in DataPit yet`;
    body = showGuess
      ? `We don’t have this person, but we know how ${companyName} formats its email addresses.`
      : `We don’t have this person, and we don’t know ${companyName}’s email format yet. We show a company’s format once DataPit has at least 5 of its addresses.`;
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-elevated p-5 sm:p-6">
      <div className="flex flex-col gap-2">
        {pill}
        <h3 className="text-lg font-extrabold leading-snug text-text">{heading}</h3>
        <p className="text-sm leading-relaxed text-text-muted">{body}</p>
      </div>
      {hasMasked && (
        <p className="rounded-md border border-border bg-surface px-4 py-3">
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
            Masked email
          </span>
          <span className="mt-1 block break-all font-mono text-base font-bold text-text">
            {result.maskedEmail}
          </span>
        </p>
      )}
      {showGuess && <Guess result={result} companyName={companyName} />}
      <SignupCta
        to={signupUrl}
        label={hasMasked ? 'Sign up to reveal' : 'Sign up free'}
        title={hasMasked ? 'Reveal the full address' : `Find contacts at ${companyName}`}
        text={
          hasMasked
            ? `Revealing a contact costs ${CREDIT_COSTS.REVEAL} credits. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`
            : `Search DataPit by company and role, and reveal work emails when we have them. The Free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`
        }
      />
    </div>
  );
}

/** First name, last name and company domain in; a masked match or the domain's pattern out. */
export function EmailFinderTool() {
  const id = useId();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [person, setPerson] = useState('');
  const refs = { firstName: useRef(null), lastName: useRef(null), domain: useRef(null) };
  const [find, { data, error, isLoading, reset }] = useFindEmailPublicMutation();

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problems = validate(form);
    setErrors(problems);
    const first = ['firstName', 'lastName', 'domain'].find((k) => problems[k]);
    if (first) {
      reset();
      refs[first].current?.focus();
      return;
    }
    const body = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      domain: form.domain.trim(),
    };
    setPerson(`${body.firstName} ${body.lastName}`);
    try {
      await find(body).unwrap();
    } catch {
      // Shown from the hook's `error` below.
    }
  }

  const field = (key, label, props) => (
    <ToolField
      id={`${id}-${key}`}
      inputRef={refs[key]}
      label={label}
      value={form[key]}
      error={errors[key]}
      onChange={update(key)}
      {...props}
    />
  );

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 sm:p-7"
    >
      <div>
        <h2 id={`${id}-title`} className="text-xl font-extrabold text-text">
          Find someone’s work email
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Free, with no sign-up. We search DataPit’s database and show a masked match.
        </p>
      </div>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field('firstName', 'First name', {
            autoComplete: 'off',
            maxLength: 100,
            placeholder: 'Jane',
          })}
          {field('lastName', 'Last name', {
            autoComplete: 'off',
            maxLength: 100,
            placeholder: 'Doe',
          })}
        </div>
        {field('domain', 'Company domain', {
          autoComplete: 'off',
          autoCapitalize: 'none',
          spellCheck: false,
          maxLength: 255,
          placeholder: 'acme.com',
          hint: 'The company’s website. A URL or an email address at the company works too.',
        })}
        <div>
          <SubmitButton busy={isLoading} busyLabel="Searching…">
            Find email
          </SubmitButton>
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col gap-4">
        {isLoading && <p className="text-sm text-text-muted">Searching DataPit…</p>}
        {!isLoading && error && (
          <ToolError error={error} limitTitle="You’ve used today’s free searches." />
        )}
        {!isLoading && !error && data && <Result result={data} person={person} />}
      </div>
    </section>
  );
}
