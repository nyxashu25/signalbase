import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';

const PLANS = [
  {
    name: 'Free',
    price: 0,
    unit: null,
    credits: '100 credits / month',
    tagline: "Try DataPit's search and reveal on a real workspace.",
    cta: 'Start free',
    features: [
      'People & company search',
      'Masked email results',
      '100 reveal credits / month',
      '1 saved list',
      '1 seat',
    ],
  },
  {
    name: 'Basic',
    price: 29,
    unit: 'seat / month, billed annually',
    credits: '500 credits / seat / month',
    tagline: 'Take prospecting and outreach further.',
    cta: 'Start free',
    features: [
      'Everything in Free',
      '500 reveal credits / seat / month',
      'Unlimited lists',
      'Sequences with wait steps',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: 59,
    unit: 'seat / month, billed annually',
    credits: '1,200 credits / seat / month',
    tagline: 'Multi-touch outreach with room to scale a team.',
    cta: 'Start free',
    popular: true,
    features: [
      'Everything in Basic',
      '1,200 reveal credits / seat / month',
      'Sequence pause/resume & analytics',
      'API access',
      'Priority support',
    ],
  },
  {
    name: 'Organization',
    price: 99,
    unit: 'seat / month, min 3 seats, billed annually',
    credits: '2,500 credits / seat / month',
    tagline: 'Advanced controls for larger go-to-market teams.',
    cta: 'Talk to sales',
    features: [
      'Everything in Professional',
      '2,500 reveal credits / seat / month',
      'Single sign-on (SSO)',
      'Dedicated onboarding',
      'Custom credit pooling',
    ],
  },
];

const FAQS = [
  {
    q: 'What is a credit?',
    a: "One credit reveals one contact's verified email. Search and masked results never cost a credit — only the reveal action does, and it's reserved atomically so concurrent requests can never over-spend your balance.",
  },
  {
    q: 'Do unused credits roll over?',
    a: 'Monthly credits reset each billing cycle and do not roll over. Once any teammate in your workspace reveals a contact, the whole workspace can see it for free going forward.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes — upgrade, downgrade, or cancel from your workspace billing page at any time. Changes take effect at your next billing cycle.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'The Free plan itself is a real, permanently free workspace — search and reveal against live data, no card required, no trial clock.',
  },
];

export function Pricing() {
  return (
    <div className="min-h-screen bg-bg">
      <MarketingNav />

      <section className="mx-auto max-w-[1120px] px-6 pb-6 pt-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
          Simple, seat-based pricing
        </h1>
        <p className="mx-auto mt-4 max-w-[560px] text-base text-text-muted">
          Every plan runs on the same credit ledger. Pay for seats, spend credits only on the
          contacts you actually reveal.
        </p>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-14">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-xl border p-7 ${
                plan.popular
                  ? 'border-primary/40 bg-surface-elevated shadow-dp-md ring-2 ring-primary'
                  : 'border-border bg-surface-elevated shadow-dp'
              }`}
            >
              {plan.popular && (
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold text-text">{plan.name}</h3>
              <p className="mt-1 text-sm text-text-muted">{plan.tagline}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-text">
                  ${plan.price}
                </span>
                {plan.unit && <span className="text-sm text-text-muted">/{plan.unit}</span>}
              </div>
              {!plan.unit && <div className="mt-1 text-sm text-text-muted">forever</div>}

              <div className="mt-3 inline-flex w-fit rounded-full bg-surface px-3 py-1 text-xs font-bold text-text-muted">
                {plan.credits}
              </div>

              <Link
                to="/login"
                className={`mt-7 rounded-md px-4 py-2.5 text-center text-sm font-bold transition-transform duration-150 ease-brand hover:-translate-y-px ${
                  plan.popular
                    ? 'bg-gradient-action text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)]'
                    : 'border border-border bg-surface-elevated text-text'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-7 flex flex-1 flex-col gap-3 text-sm text-text-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckIcon />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-text-muted">
          Prices shown are per seat, billed annually. Monthly billing available at checkout.
        </p>
      </section>

      <section className="border-t border-border bg-ink-950">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-6 py-24 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-mauve-magic">
              How billing actually works
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              You only spend a credit when a reveal succeeds
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-300">
              Your seat price covers the platform. Credits are the only thing that moves when you
              actually use it &mdash; every grant, reveal, and top-up lands in the same append-only
              ledger you can see in your workspace at any time.
            </p>
          </div>
          <AnimatedCreditLedgerMockup />
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[760px] px-6 py-24">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-text">
            Frequently asked questions
          </h2>
          <div className="mt-10 flex flex-col gap-6">
            {FAQS.map((item) => (
              <div key={item.q} className="rounded-lg border border-border bg-surface-elevated p-6">
                <h3 className="text-sm font-bold text-text">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="mt-0.5 shrink-0 text-primary"
    >
      <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
