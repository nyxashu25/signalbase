import { AmbientCanvas } from './AmbientCanvas.jsx';
import { MaskedLines } from './MaskedLines.jsx';
import { FadeIn } from './motion.jsx';

/**
 * The shared editorial hero for the marketing sub-pages (Pricing, Product,
 * Solutions, About, Contact): dark, over the ambient canvas, with an
 * art-directed masked-line headline. Home builds its own larger variant of
 * the same treatment inline. `children` renders below the sub copy for
 * page-specific controls (e.g. Pricing's billing-interval toggle).
 */
export function PageHero({ eyebrow, lines, sub, children }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950 text-white">
      <AmbientCanvas />
      <div className="relative mx-auto max-w-[1400px] px-6 pb-20 pt-24 sm:pb-24 sm:pt-32">
        <FadeIn as="div" whileInView={false}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mauve-magic">
            {eyebrow}
          </span>
        </FadeIn>
        <MaskedLines
          as="h1"
          delay={0.15}
          lines={lines}
          className="mt-8 text-[clamp(2.6rem,7vw,6.5rem)] font-extrabold uppercase leading-[0.95] tracking-tight"
        />
        {sub && (
          <FadeIn
            as="p"
            whileInView={false}
            delay={0.7}
            className="mt-8 max-w-[560px] text-lg text-ink-300"
          >
            {sub}
          </FadeIn>
        )}
        {children && (
          <FadeIn as="div" whileInView={false} delay={0.85} className="mt-10">
            {children}
          </FadeIn>
        )}
      </div>
    </section>
  );
}
