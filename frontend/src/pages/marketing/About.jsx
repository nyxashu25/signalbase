import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';

const PRINCIPLES = [
  {
    title: 'Pay for outcomes, not access',
    desc: "A credit is spent when a contact is actually found and verified — never up front for the privilege of searching. If we can't find it, you don't pay for it.",
  },
  {
    title: 'One reveal, one workspace',
    desc: "The first person on your team to reveal a contact makes it visible to everyone else on that workspace, permanently. We're not going to charge five people to unlock the same email.",
  },
  {
    title: 'The ledger is the truth',
    desc: 'Every credit movement is a row in an append-only ledger, not a number we can quietly edit. If something looks wrong, you can trace exactly why.',
  },
];

export function About() {
  return (
    <div className="min-h-screen bg-bg">
      <MarketingNav />

      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background: 'radial-gradient(50% 40% at 85% 0%, rgba(148,0,222,0.3), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-[800px] px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mauve-magic">
            About DataPit
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
            We got tired of paying for lists that were already stale
          </h1>
          <p className="mt-6 text-lg text-ink-300">
            DataPit started from a simple complaint: most sales intelligence tools charge you before
            they've actually found anything. We built the credit ledger first, and the search
            product around it — so the money only moves when the data does.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-6 py-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-text">
          What we actually believe
        </h2>
        <div className="mt-10 flex flex-col gap-8">
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className="flex gap-6 border-t border-border pt-8 first:border-0 first:pt-0"
            >
              <span className="text-2xl font-extrabold text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-lg font-bold text-text">{p.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-text-muted">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[900px] px-6 py-24">
          <h2 className="text-3xl font-extrabold tracking-tight text-text">Where we're headed</h2>
          <p className="mt-5 max-w-[640px] text-base leading-relaxed text-text-muted">
            DataPit is early. The core — search, verified reveal, sequences, and a credit ledger you
            can actually audit — is live today. CRM sync, a browser extension, and deeper intent
            data are next, in that order, because that's the order our own users have asked for
            them.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="rounded-xl bg-gradient-action px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Come see it for yourself
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-base text-white/85">
            Free to start. No credit card required.
          </p>
          <Link
            to="/login?mode=register"
            className="mt-8 inline-block rounded-md bg-white px-7 py-3.5 text-sm font-bold text-primary transition-transform duration-150 ease-brand hover:-translate-y-px"
          >
            Start free
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
