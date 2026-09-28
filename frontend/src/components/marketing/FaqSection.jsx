import { ScrubHeadline } from './ScrubHeadline.jsx';
import { TiltCard } from './TiltCard.jsx';
import { Stagger, StaggerItem } from './motion.jsx';

/**
 * A chapter of questions on the glass page: each question is its own h3
 * with the answer right under it — the shape answer engines lift passages
 * from. Items come from data/faqs.js, which also feeds the page's FAQPage
 * structured data, so what's shown and what's marked up stay identical.
 */
export function FaqSection({
  eyebrow,
  title = 'Frequently asked questions',
  items,
  station = 'drift',
}) {
  return (
    <section
      data-chapter
      data-chapter-title="FAQ"
      data-station={station}
      data-station-side="0"
      className="relative py-6 sm:py-10"
    >
      <div className="mx-auto max-w-[948px] px-3 sm:px-6">
        <div className="story-glass relative overflow-hidden text-text">
          <div className="mx-auto max-w-[900px] px-6 py-20 sm:py-24">
            <p className="story-eyebrow text-xs font-bold uppercase tracking-[0.22em]">{eyebrow}</p>
            <ScrubHeadline
              as="h2"
              className="mt-6 text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
            >
              {title}
            </ScrubHeadline>
            <Stagger as="div" className="mt-12 flex flex-col gap-5" staggerDelay={0.08}>
              {items.map((item) => (
                <StaggerItem key={item.q} as="div">
                  <TiltCard tilt={3} className="p-6">
                    <h3 className="text-sm font-bold text-text">{item.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.a}</p>
                  </TiltCard>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </div>
    </section>
  );
}
