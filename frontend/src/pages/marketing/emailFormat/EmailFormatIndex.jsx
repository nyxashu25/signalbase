// /email-format: every company with a published email format, A to Z.
// Prerendered from GET /api/v1/public/email-formats (scripts/prerender.mjs
// embeds the response as page data); client-side navigation fetches it.
import { Link, useLocation } from 'react-router-dom';
import { MarketingFooter } from '../../../components/marketing/MarketingFooter.jsx';
import { StoryCover } from '../../../components/marketing/StoryCover.jsx';
import { usePageData } from '../../../prerender/pageData.js';
import { useGetEmailFormatsQuery } from '../../../api/marketingApi.js';
import { formatCount } from '../../../data/facts.js';
import { MIN_CONTACTS, groupAlphabetically, percent, topPattern } from './formatUtils.js';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg';
const LINK = `rounded-sm font-semibold text-primary underline-offset-2 hover:underline ${FOCUS_RING}`;

function CompanyList({ companies }) {
  const groups = groupAlphabetically(companies);
  return (
    <div className="flex flex-col gap-8">
      {groups.length > 1 && (
        <nav aria-label="Companies by letter">
          <ul className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <li key={g.letter}>
                <a
                  href={`#letter-${g.letter === '#' ? 'other' : g.letter}`}
                  className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-border bg-surface-elevated px-2 text-sm font-bold text-text hover:border-primary/40 ${FOCUS_RING}`}
                >
                  {g.letter}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {groups.map((g) => (
        <section key={g.letter} aria-labelledby={`letter-${g.letter === '#' ? 'other' : g.letter}`}>
          <h2
            id={`letter-${g.letter === '#' ? 'other' : g.letter}`}
            className="scroll-mt-28 border-b border-border pb-2 text-xl font-extrabold text-text"
          >
            {g.letter === '#' ? '0–9 and symbols' : g.letter}
          </h2>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {g.companies.map((c) => {
              const top = topPattern(c);
              return (
                <li key={c.domain}>
                  <Link
                    to={`/email-format/${c.domain}`}
                    className={`group flex flex-col gap-0.5 rounded-md py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 ${FOCUS_RING}`}
                  >
                    <span className="min-w-0">
                      <span className="font-bold text-text group-hover:text-primary">{c.name}</span>{' '}
                      <span className="break-all text-sm text-text-muted">{c.domain}</span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-text-muted">
                      {top && (
                        <>
                          <span className="font-mono text-text">{top.pattern}</span>{' '}
                          {percent(top.share)} ·{' '}
                        </>
                      )}
                      {formatCount(c.sampleSize)} addresses
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function EmailFormatIndex() {
  const { pathname } = useLocation();
  const pageData = usePageData(pathname);
  const { currentData, isError, refetch } = useGetEmailFormatsQuery(undefined, {
    skip: Boolean(pageData),
  });
  const data = pageData ?? currentData ?? null;
  const companies = data?.companies ?? [];
  const minContacts = data?.minContacts ?? MIN_CONTACTS;
  const state = data ? (companies.length ? 'list' : 'empty') : isError ? 'error' : 'loading';

  const sub =
    state === 'list'
      ? `The email address formats ${formatCount(companies.length)} companies use, measured from the work addresses in DataPit. Each company has at least ${minContacts} addresses behind it.`
      : 'The email address formats companies use, measured from the work addresses in DataPit: first.last, flast, first and more.';

  return (
    <div className="min-h-screen">
      <StoryCover
        station="lens"
        eyebrow="Email formats"
        sub={sub}
        lines={[
          { content: 'Company' },
          {
            content: (
              <span className="bg-gradient-brand bg-clip-text text-transparent">email formats</span>
            ),
            className: 'sm:ml-[6vw]',
          },
        ]}
      />
      <section
        data-chapter
        data-chapter-title="All companies"
        data-station="drift"
        data-station-side="0"
        className="relative py-6 text-text sm:py-10"
      >
        <div className="mx-auto max-w-[948px] px-3 sm:px-6">
          <div className="story-glass px-6 py-12 sm:px-12 sm:py-16">
            <div
              className="mx-auto flex max-w-[720px] flex-col gap-6"
              aria-busy={state === 'loading'}
            >
              {state === 'list' && (
                <>
                  <p className="text-base leading-relaxed text-text-muted">
                    Each page shows how a company builds its work addresses, how common each pattern
                    is and how many addresses it’s based on. Examples use the placeholder name Jane
                    Doe. Guessed an address?{' '}
                    <Link to="/tools/email-verifier" className={LINK}>
                      Check it with the free email verifier
                    </Link>
                    .
                  </p>
                  <CompanyList companies={companies} />
                </>
              )}
              {state === 'empty' && (
                <p className="text-base leading-relaxed text-text-muted">
                  Company email formats are coming soon. We publish a company’s format once DataPit
                  has at least {minContacts} of its work addresses. Until then,{' '}
                  <Link to="/tools/email-verifier" className={LINK}>
                    check an address with the free email verifier
                  </Link>
                  .
                </p>
              )}
              {state === 'error' && (
                <div role="alert" className="flex flex-col items-start gap-4">
                  <p className="text-base leading-relaxed text-text-muted">
                    We couldn’t load the list of company email formats. Check your internet
                    connection and try again.
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
                  Loading company email formats…
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
