// A company's email format: /email-format/:domain. Prerendered per company
// from GET /api/v1/public/email-formats (scripts/prerender.mjs), which embeds
// the CompanyFormat as page data; the first render uses that, and client-side
// navigation fetches GET /api/v1/public/email-formats/:domain instead.
import { Link, useLocation } from 'react-router-dom';
import { MarketingFooter } from '../../../components/marketing/MarketingFooter.jsx';
import { StoryCover } from '../../../components/marketing/StoryCover.jsx';
import { formatDay } from '../../../components/marketing/ContentArticle.jsx';
import { usePageData } from '../../../prerender/pageData.js';
import { useGetEmailFormatQuery } from '../../../api/marketingApi.js';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../../data/plans.js';
import { formatCount } from '../../../data/facts.js';
import { MIN_CONTACTS, answerSentence, isOther, percent, sortedPatterns } from './formatUtils.js';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';
const LINK = `rounded-sm font-semibold text-primary underline-offset-2 hover:underline ${FOCUS_RING}`;

/** "acme.com" from "/email-format/acme.com". */
export function domainFromPath(pathname) {
  return pathname
    .replace(/^\/email-format\/?/, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function PatternTable({ company }) {
  const patterns = sortedPatterns(company);
  const n = formatCount(company.sampleSize);
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm font-bold text-text">
        Email formats at {company.name}, from {n} addresses
      </figcaption>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th scope="col" className="px-3 py-3 font-bold">
                Pattern
              </th>
              <th scope="col" className="px-3 py-3 font-bold">
                Example
              </th>
              <th scope="col" className="px-3 py-3 font-bold">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {patterns.map((p) => {
              const width = Math.max(0, Math.min(100, Math.round((Number(p.share) || 0) * 100)));
              return (
                <tr key={p.pattern}>
                  <th scope="row" className="whitespace-nowrap px-3 py-3 align-top font-bold">
                    {isOther(p) ? 'Other formats' : <span className="font-mono">{p.pattern}</span>}
                  </th>
                  <td className="px-3 py-3 align-top font-mono text-text-muted">
                    {isOther(p) || !p.example ? (
                      <span>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">No single example</span>
                      </span>
                    ) : (
                      <span className="break-all">{p.example}</span>
                    )}
                  </td>
                  <td className="min-w-[140px] px-3 py-3 align-top">
                    <div className="flex items-center gap-3">
                      <span className="w-10 shrink-0 font-bold">{percent(p.share)}</span>
                      <span
                        aria-hidden="true"
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                      >
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${width}%` }}
                        />
                      </span>
                    </div>
                    <span className="mt-0.5 block text-xs text-text-muted">
                      {formatCount(p.count)} of {n}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-text-muted">
        Examples use the placeholder name Jane Doe, not a real person’s address.
      </p>
    </figure>
  );
}

function CompanyFacts({ company }) {
  const facts = [
    ['Domain', company.domain],
    ['Industry', company.industry],
    ['Company size', company.size],
    ['Location', company.location],
  ].filter(([, v]) => v);
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface-elevated/60 p-4 sm:grid-cols-2">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{label}</dt>
          <dd className="mt-0.5 break-words text-sm text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CtaBox({ company }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-6 py-6">
      <p className="text-lg font-extrabold text-text">Find {company.name} contacts in DataPit</p>
      <p className="mt-1 text-sm leading-relaxed text-text-muted">
        Search people at {company.name} by role and reveal their work email. The Free plan includes{' '}
        {formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/login?mode=register"
          className={`block rounded-md bg-gradient-action px-6 py-3 text-center text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.3)] transition-transform duration-150 ease-brand hover:-translate-y-px ${FOCUS_RING}`}
        >
          Start free
        </Link>
        <Link
          to="/email-format"
          className={`block rounded-md border border-border bg-surface-elevated px-6 py-3 text-center text-sm font-bold text-text transition-colors duration-150 ease-brand hover:bg-surface ${FOCUS_RING}`}
        >
          All company email formats
        </Link>
      </div>
    </div>
  );
}

function CompanyBody({ company }) {
  const n = formatCount(company.sampleSize);
  return (
    <>
      <h2 className="text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold leading-tight tracking-tight text-text">
        Which email patterns does {company.name} use?
      </h2>
      <PatternTable company={company} />
      <CompanyFacts company={company} />

      <h2 className="pt-4 text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold leading-tight tracking-tight text-text">
        How is this measured?
      </h2>
      <p className="text-base leading-relaxed text-text-muted">
        We compare each {company.name} work address in DataPit with the name of the person it
        belongs to. Each address is sorted into one pattern, like first.last or flast. Addresses
        that fit no standard pattern count as other formats.
      </p>
      <p className="text-base leading-relaxed text-text-muted">
        This page counts {n} addresses at @{company.domain}. We only count addresses on the
        company’s own domain, and leave out people who asked to be removed. We publish a company’s
        format once DataPit has at least {MIN_CONTACTS} of its addresses. The counts were last
        updated <time dateTime={company.updated}>{formatDay(company.updated)}</time>.
      </p>

      <aside className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          Before you send
        </p>
        <p className="mt-2 text-base leading-relaxed text-text">
          A pattern tells you the likely address, not a confirmed one.{' '}
          <Link to="/tools/email-verifier" className={LINK}>
            Check it with the free email verifier
          </Link>{' '}
          to confirm the domain takes email and to catch role and disposable addresses.
        </p>
      </aside>

      <CtaBox company={company} />

      <p className="border-t border-border pt-6 text-xs text-text-muted">
        Last updated <time dateTime={company.updated}>{formatDay(company.updated)}</time>
      </p>
    </>
  );
}

function NotFoundBody({ domain }) {
  return (
    <>
      <h2 className="text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold leading-tight tracking-tight text-text">
        No email format for {domain} yet
      </h2>
      <p className="text-base leading-relaxed text-text-muted">
        We publish a company’s email format once DataPit has at least {MIN_CONTACTS} of its work
        addresses. {domain} doesn’t have enough yet, or the domain in the URL is misspelled.
      </p>
      <ul className="flex flex-col gap-2 pl-5 text-base leading-relaxed text-text-muted list-disc marker:text-primary">
        <li>
          <Link to="/email-format" className={LINK}>
            Browse all company email formats
          </Link>
        </li>
        <li>
          <Link to="/tools/email-verifier" className={LINK}>
            Check an address with the free email verifier
          </Link>
        </li>
      </ul>
    </>
  );
}

export function EmailFormatPage() {
  const { pathname } = useLocation();
  const domain = domainFromPath(pathname);
  const pageData = usePageData(pathname);
  // currentData, not data: navigating between companies must never show the
  // previous company's numbers while the next one loads.
  const { currentData, error, isError, refetch } = useGetEmailFormatQuery(domain, {
    skip: Boolean(pageData) || !domain,
  });
  const company = pageData ?? currentData ?? null;
  const notFound = !company && isError && error?.status === 404;
  const failed = !company && isError && !notFound;
  const state = company ? 'ready' : notFound ? 'missing' : failed ? 'error' : 'loading';

  let lines;
  let sub;
  if (company) {
    lines = [company.name, 'email format'];
    sub = answerSentence(company);
  } else if (notFound) {
    lines = [domain, 'not found'];
    sub = `We don’t have an email format for ${domain} yet.`;
  } else if (failed) {
    lines = [domain, 'email format'];
    sub = 'This page didn’t load.';
  } else {
    lines = [domain, 'email format'];
    sub = `Loading the email format for ${domain}.`;
  }

  return (
    <div className="min-h-screen">
      {/* Remounts per state: the headline's character split runs once per mount. */}
      <StoryCover
        key={`${domain}:${state}`}
        station="lens"
        eyebrow="Email format"
        sub={sub}
        lines={lines.map((content, i) => ({
          content:
            i === lines.length - 1 ? (
              <span className="bg-gradient-brand bg-clip-text text-transparent">{content}</span>
            ) : (
              <span className="break-words">{content}</span>
            ),
          className: i === 1 ? 'sm:ml-[6vw]' : undefined,
        }))}
      />
      <section
        data-chapter
        data-chapter-title={company ? `${company.name} email format` : 'Email format'}
        data-station="drift"
        data-station-side="0"
        className="relative py-6 text-text sm:py-10"
      >
        <div className="mx-auto max-w-[948px] px-3 sm:px-6">
          <article className="story-glass px-6 py-12 sm:px-12 sm:py-16">
            <div
              className="mx-auto flex max-w-[720px] flex-col gap-6"
              aria-busy={state === 'loading'}
            >
              {state === 'ready' && <CompanyBody company={company} />}
              {state === 'missing' && <NotFoundBody domain={domain} />}
              {state === 'error' && (
                <div role="alert" className="flex flex-col items-start gap-4">
                  <p className="text-base leading-relaxed text-text-muted">
                    We couldn’t load the email format for {domain}. Check your internet connection
                    and try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className={`rounded-md border border-border bg-surface-elevated px-5 py-2.5 text-sm font-bold text-text hover:bg-surface ${FOCUS_RING}`}
                  >
                    Try again
                  </button>
                </div>
              )}
              {state === 'loading' && (
                <p role="status" className="text-base text-text-muted">
                  Loading the email format for {domain}…
                </p>
              )}
            </div>
          </article>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
