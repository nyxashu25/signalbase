import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { ScrubHeadline } from '../../components/marketing/ScrubHeadline.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
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
    <div className="min-h-screen">
      <StoryCover
        station="ledger"
        eyebrow="About DataPit"
        narration="This book started as a complaint. Then we built the ledger first."
        sub="DataPit started from a simple complaint: most sales intelligence tools charge you before they've actually found anything. We built the credit ledger first, and the search product around it — so the money only moves when the data does."
        lines={[
          { content: 'We got tired of' },
          {
            content: (
              <span className="bg-gradient-brand bg-clip-text text-transparent">paying for stale lists.</span>
            ),
            className: 'sm:ml-[6vw]',
          },
        ]}
      />

      <section
        data-chapter
        data-chapter-title="What we believe"
        data-station="crystals"
        data-station-side="1"
        className="relative text-white"
      >
        <div className="mx-auto max-w-[1100px] px-6 py-28 sm:py-36">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-mauve-magic">Chapter 01 — What we actually believe</p>
          <Stagger as="div" className="mt-12 flex flex-col" staggerDelay={0.12}>
            {PRINCIPLES.map((p, i) => (
              <StaggerItem
                key={p.title}
                as="div"
                className="grid grid-cols-[auto_1fr] items-start gap-6 border-t border-white/10 py-10 last:border-b sm:gap-12"
              >
                <span aria-hidden="true" className="story-numeral text-[clamp(3rem,7vw,6rem)] font-extrabold leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-[clamp(1.4rem,2.6vw,2.2rem)] font-extrabold uppercase tracking-tight">{p.title}</h3>
                  <p className="mt-3 max-w-[640px] text-base leading-relaxed text-ink-300">{p.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section
        data-chapter
        data-chapter-title="Where we're headed"
        data-station="tunnel"
        data-station-side="0"
        className="relative py-6 sm:py-10"
      >
        <div className="mx-auto max-w-[1148px] px-3 sm:px-6">
          <div className="story-glass relative overflow-hidden text-text">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-64"
              style={{ background: 'linear-gradient(180deg, rgba(231,179,255,0.2), transparent)' }}
            />
            <div className="relative mx-auto max-w-[1100px] px-6 py-24 sm:py-32">
              <p className="story-eyebrow text-xs font-bold uppercase tracking-[0.22em]">Chapter 02 — Where we're headed</p>
              <ScrubHeadline
                as="h2"
                className="mt-6 max-w-[900px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
              >
                The core is live today. The rest ships in the order our users ask for it.
              </ScrubHeadline>
              <FadeIn as="p" className="mt-8 max-w-[640px] text-base leading-relaxed text-text-muted">
                DataPit is early. Search, verified reveal, sequences, and a credit ledger you can actually
                audit are live now. CRM sync, a browser extension, and deeper intent data are next, in that
                order, because that's the order our own users have asked for them.
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <GiantCTA station="mark" title="Come see it for yourself." />

      <MarketingFooter />
    </div>
  );
}
