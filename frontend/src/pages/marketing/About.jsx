import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { PageHero } from '../../components/marketing/PageHero.jsx';
import { ScrubHeadline } from '../../components/marketing/ScrubHeadline.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
import { SmoothScroll } from '../../components/marketing/SmoothScroll.jsx';
import { FadeIn, Stagger, StaggerItem } from '../../components/marketing/motion.jsx';

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
      <SmoothScroll />
      <MarketingNav />

      <PageHero
        eyebrow="About DataPit"
        lines={[
          { content: 'We got tired of' },
          {
            content: (
              <span className="bg-gradient-brand bg-clip-text text-transparent">
                paying for stale lists.
              </span>
            ),
            className: 'sm:ml-[6vw]',
          },
        ]}
        sub="DataPit started from a simple complaint: most sales intelligence tools charge you before they've actually found anything. We built the credit ledger first, and the search product around it — so the money only moves when the data does."
      />

      <section className="mx-auto max-w-[1100px] px-6 py-28 sm:py-36">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          What we actually believe
        </p>
        <Stagger as="div" className="mt-12 flex flex-col" staggerDelay={0.12}>
          {PRINCIPLES.map((p, i) => (
            <StaggerItem
              key={p.title}
              as="div"
              className="grid grid-cols-[auto_1fr] items-start gap-6 border-t border-border py-10 last:border-b sm:gap-12"
            >
              <span className="text-outline text-[clamp(3rem,7vw,6rem)] font-extrabold leading-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-[clamp(1.4rem,2.6vw,2.2rem)] font-extrabold uppercase tracking-tight text-text">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-[640px] text-base leading-relaxed text-text-muted">
                  {p.desc}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1100px] px-6 py-28 sm:py-36">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Where we're headed
          </p>
          <ScrubHeadline
            as="h2"
            className="mt-6 max-w-[900px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
          >
            The core is live today. The rest ships in the order our users ask for it.
          </ScrubHeadline>
          <FadeIn as="p" className="mt-8 max-w-[640px] text-base leading-relaxed text-text-muted">
            DataPit is early. Search, verified reveal, sequences, and a credit ledger you can
            actually audit are live now. CRM sync, a browser extension, and deeper intent data are
            next, in that order, because that's the order our own users have asked for them.
          </FadeIn>
        </div>
      </section>

      <GiantCTA title="Come see it for yourself." />

      <MarketingFooter />
    </div>
  );
}
