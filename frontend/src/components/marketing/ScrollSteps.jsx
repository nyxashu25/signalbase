import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Below this width, or under prefers-reduced-motion, scroll-pinning a
// section (locking the viewport in place while numbers swap underneath)
// is more disorienting than impressive — those cases get the plain
// stacked grid instead. See the mobile-fallback pattern already used by
// the reference sites this borrows from.
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * A scroll-pinned walkthrough: the section locks in place while the
 * active step's number/title/description crossfade as the user scrolls
 * past it, driven by a scrubbed GSAP timeline rather than viewport
 * intersection. Falls back to a plain static grid — same content, no
 * pinning — below the desktop breakpoint or under reduced motion.
 */
export function ScrollSteps({ eyebrow, steps }) {
  const [pinnedEligible, setPinnedEligible] = useState(false);
  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const numberRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const dotRefs = useRef([]);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia?.(DESKTOP_QUERY).matches;
    setPinnedEligible(Boolean(isDesktop && !reduceMotion));
  }, []);

  useLayoutEffect(() => {
    if (!pinnedEligible) return;
    const root = rootRef.current;
    if (!root) return;

    function setStep(i) {
      numberRef.current.textContent = steps[i].n;
      titleRef.current.textContent = steps[i].title;
      descRef.current.textContent = steps[i].desc;
      dotRefs.current.forEach((dot, idx) => {
        if (!dot) return;
        if (idx === i) {
          dot.classList.add('w-8', 'bg-primary');
          dot.classList.remove('w-1.5', 'bg-border');
        } else {
          dot.classList.remove('w-8', 'bg-primary');
          dot.classList.add('w-1.5', 'bg-border');
        }
      });
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => `+=${steps.length * 550}`,
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
        },
      });

      steps.forEach((_, i) => {
        if (i > 0) {
          // immediateRender: false is required here — fromTo() otherwise
          // applies its "from" values (autoAlpha: 0) to the DOM the instant
          // the timeline is built, regardless of scroll position, which
          // left the section permanently hidden before the user ever
          // scrolled to it.
          tl.to(contentRef.current, { autoAlpha: 0, y: -20, duration: 0.3, ease: 'power1.in' })
            .call(() => setStep(i))
            .fromTo(
              contentRef.current,
              { autoAlpha: 0, y: 20 },
              { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power1.out', immediateRender: false },
            );
        }
        tl.to({}, { duration: 0.6 });
      });
    }, root);

    return () => ctx.revert();
  }, [pinnedEligible, steps]);

  if (!pinnedEligible) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-24">
        <h2 className="mx-auto max-w-[640px] text-center text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          {eyebrow}
        </h2>
        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="text-sm font-extrabold text-primary">{s.n}</span>
              <h3 className="mt-2 text-lg font-bold text-text">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative overflow-hidden">
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{eyebrow}</p>
        <div ref={contentRef} className="mt-8 max-w-[680px]">
          <span ref={numberRef} className="block text-sm font-extrabold tabular-nums text-primary">
            {steps[0].n}
          </span>
          <h3 ref={titleRef} className="mt-4 text-4xl font-extrabold tracking-tight text-text sm:text-6xl">
            {steps[0].title}
          </h3>
          <p ref={descRef} className="mt-6 text-lg leading-relaxed text-text-muted">
            {steps[0].desc}
          </p>
        </div>
        <div className="mt-12 flex gap-2">
          {steps.map((s, i) => (
            <span
              key={s.n}
              ref={(el) => (dotRefs.current[i] = el)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === 0 ? 'w-8 bg-primary' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
