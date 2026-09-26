import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MaskedLines } from './MaskedLines.jsx';
import { Hero3DMark } from './Hero3DMark.jsx';
import { FadeIn } from './motion.jsx';

gsap.registerPlugin(ScrollTrigger);

/**
 * The cover of each book — the shared hero for every marketing page. Deep
 * tone (the signal river flows behind it), an art-directed masked-line
 * headline beside the 3D mark, the italic narration line, sub copy, and a
 * slot for page-specific controls (Pricing's billing toggle, Home's CTAs).
 * As the reader scrolls on, the headline lifts away faster than the page
 * and the mark sinks into the pit (see Hero3DMark's `sinkWith`).
 *
 * `size`: 'lg' for Home's full-height cover, 'md' for sub-pages.
 */
export function StoryCover({ eyebrow, lines, narration, sub, children, size = 'md', mark = true }) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);

  useLayoutEffect(() => {
    if (reduceMotion) return undefined;
    const section = sectionRef.current;
    const headline = headlineRef.current;
    if (!section || !headline) return undefined;
    const ctx = gsap.context(() => {
      gsap.to(headline, {
        y: -140,
        opacity: 0.2,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: 0.8 },
      });
    }, section);
    return () => ctx.revert();
  }, [reduceMotion]);

  const tall = size === 'lg';

  return (
    <section
      ref={sectionRef}
      data-chapter
      data-chapter-title="Cover"
      className="relative overflow-hidden text-white"
    >
      <div
        className={`relative mx-auto grid max-w-[1400px] items-center gap-10 px-6 lg:grid-cols-[1.25fr_1fr] ${
          tall ? 'min-h-[92vh] py-28' : 'py-24 sm:py-28 lg:py-32'
        }`}
      >
        <div ref={headlineRef}>
          <FadeIn as="div" whileInView={false}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mauve-magic">
              {eyebrow}
            </span>
          </FadeIn>
          <MaskedLines
            as="h1"
            delay={0.15}
            lines={lines}
            className={`mt-8 font-extrabold uppercase tracking-tight ${
              tall
                ? 'text-[clamp(2.8rem,8vw,7.6rem)] leading-[0.92]'
                : 'text-[clamp(2.4rem,6.4vw,5.6rem)] leading-[0.95]'
            }`}
          />
          {narration && (
            <FadeIn as="p" whileInView={false} delay={0.6} className="story-narration mt-8 max-w-[520px] text-xl text-mauve-2/90">
              {narration}
            </FadeIn>
          )}
          {sub && (
            <FadeIn as="p" whileInView={false} delay={0.75} className="mt-5 max-w-[560px] text-lg text-ink-300">
              {sub}
            </FadeIn>
          )}
          {children && (
            <FadeIn as="div" whileInView={false} delay={0.9} className="mt-10">
              {children}
            </FadeIn>
          )}
        </div>

        {mark && (
          <FadeIn
            as="div"
            whileInView={false}
            delay={0.35}
            className="flex justify-center lg:justify-end"
          >
            <Hero3DMark sinkWith={sectionRef} size={tall ? 'lg' : 'md'} />
          </FadeIn>
        )}
      </div>
    </section>
  );
}
