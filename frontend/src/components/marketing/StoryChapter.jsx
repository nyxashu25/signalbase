import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Plate3D } from './Plate3D.jsx';
import { whenNear } from './onScreen.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * One chapter of the storybook — a full "spread" that turns in 3D as the
 * reader scrolls through it: the whole page rises out of depth (tilted
 * back, translated down and away on z, transparent), settles flat while
 * it's being read, then tips forward and recedes as the next chapter
 * arrives. Inside that, the extruded numeral slides in, the title resolves
 * word by word, the copy lifts, and the mockup plate swings in from its
 * side and drifts slowly for depth. One scrubbed GSAP timeline per chapter
 * — no nested ScrollTriggers, because the page's own 3D transform would
 * throw their measurements off.
 *
 * `tone`: 'deep' (transparent — the Signal World shows through) or
 * 'surface' (the readable page, as a floating glass card over the world).
 * `align` puts the plate on the right ('left' means the copy leads) or the
 * left. `station` names the Signal World set piece this chapter hosts (see
 * world/README.md); it sits on the copy's side of the frame — the plate is
 * an opaque mockup and would hide it, while the copy column is transparent
 * text over the world.
 *
 * Reduced motion: no timeline; everything renders flat and visible.
 */
export function StoryChapter({
  n,
  eyebrow,
  narration,
  title,
  desc,
  points = [],
  plate,
  align = 'left',
  tone = 'deep',
  station,
}) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef(null);
  const pageRef = useRef(null);
  const numeralRef = useRef(null);
  const titleRef = useRef(null);
  const copyRef = useRef(null);
  const plateRef = useRef(null);

  useLayoutEffect(() => {
    if (reduceMotion) return undefined;
    const section = sectionRef.current;
    if (!section) return undefined;
    const dir = align === 'right' ? 1 : -1;

    // Built as the chapter nears the screen, not in the page's first render
    // (onScreen.js whenNear): its turn starts only as it scrolls in anyway.
    return whenNear(section, () => {
      const ctx = gsap.context(() => {
        const split = new SplitText(titleRef.current, { type: 'words', wordsClass: 'story-word' });
        gsap.set(split.words, { display: 'inline-block' });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top 96%',
            end: 'bottom 6%',
            scrub: 0.9,
          },
        });

        // 0 → 0.24: the page turns in from depth.
        tl.fromTo(
          pageRef.current,
          { rotateX: 22, y: 150, z: -380, opacity: 0, transformPerspective: 1500 },
          { rotateX: 0, y: 0, z: 0, opacity: 1, duration: 0.24, ease: 'power2.out' },
          0,
        )
          .fromTo(
            numeralRef.current,
            { x: 70 * dir, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.2, ease: 'power2.out' },
            0.03,
          )
          .fromTo(
            split.words,
            { opacity: 0.06, y: 28, rotateX: -40, transformPerspective: 600 },
            { opacity: 1, y: 0, rotateX: 0, stagger: 0.012, duration: 0.18, ease: 'power2.out' },
            0.08,
          )
          .fromTo(
            copyRef.current,
            { y: 44, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.18, ease: 'power2.out' },
            0.14,
          )
          .fromTo(
            plateRef.current,
            { y: 140, rotateY: -26 * dir, opacity: 0, transformPerspective: 1400 },
            { y: 0, rotateY: 0, opacity: 1, duration: 0.22, ease: 'power2.out' },
            0.1,
          )
          // 0.24 → 0.76: settled. The plate keeps drifting for parallax depth.
          .to(plateRef.current, { y: -48, duration: 0.52, ease: 'none' }, 0.24)
          // 0.76 → 1: the page tips forward and recedes.
          .to(
            pageRef.current,
            { rotateX: -16, y: -130, z: -320, opacity: 0.08, duration: 0.24, ease: 'power2.in' },
            0.76,
          );
      }, section);

      return () => ctx.revert();
    });
  }, [reduceMotion, align]);

  const plateFirst = align === 'right';
  const glass = tone === 'surface';

  const page = (
    <div
      className={`relative mx-auto max-w-[1280px] px-6 ${glass ? 'py-20 sm:py-28' : 'py-28 sm:py-40'}`}
      style={{ perspective: 1500 }}
    >
      <div ref={pageRef} className="preserve-3d">
        <div className={`flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-10 ${plateFirst ? 'sm:flex-row-reverse sm:text-right' : ''}`}>
          <span
            ref={numeralRef}
            aria-hidden="true"
            className="story-numeral select-none text-[clamp(6rem,16vw,13rem)] font-extrabold leading-[0.8] tracking-tight"
          >
            {n}
          </span>
          <div className="pb-2">
            <p
              className={`text-xs font-bold uppercase tracking-[0.22em] ${glass ? 'story-eyebrow' : 'text-mauve-magic'}`}
            >
              Chapter {n} — {eyebrow}
            </p>
            {narration && (
              <p className={`story-narration mt-3 max-w-[440px] text-lg text-ink-300 ${tone === 'surface' ? 'text-text-muted' : ''}`}>
                {narration}
              </p>
            )}
          </div>
        </div>

        <h2
          ref={titleRef}
          className={`mt-10 max-w-[900px] text-[clamp(2rem,5vw,4.4rem)] font-extrabold uppercase leading-[1.02] tracking-tight ${plateFirst ? 'sm:ml-auto sm:text-right' : ''}`}
        >
          {title}
        </h2>

        <div className="mt-14 grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div ref={copyRef} className={plateFirst ? 'lg:order-2' : ''}>
            <p className={`text-base leading-relaxed ${tone === 'surface' ? 'text-text-muted' : 'text-ink-300'}`}>
              {desc}
            </p>
            {points.length > 0 && (
              <ul className="mt-8 flex flex-col text-sm">
                {points.map((p) => (
                  <li
                    key={p}
                    className={`flex items-start gap-3 border-t py-4 last:border-b ${tone === 'surface' ? 'border-border' : 'border-white/10'}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="mt-0.5 shrink-0 text-mauve-magic"
                      aria-hidden="true"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-medium">{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div ref={plateRef} className={plateFirst ? 'lg:order-1' : ''}>
            <Plate3D>{plate}</Plate3D>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      data-chapter
      data-chapter-title={eyebrow}
      data-station={station}
      // The set piece takes the empty upper corner opposite the title —
      // above the mockup plate, clear of the headline (world/README.md
      // "Station placement").
      data-station-side={align === 'right' ? -1 : 1}
      data-station-x="0.6"
      data-station-lift="0.34"
      data-station-size="0.72"
      className={`relative overflow-hidden ${glass ? 'py-6 text-text sm:py-10' : 'text-white'}`}
    >
      {glass ? (
        <div className="mx-auto max-w-[1328px] px-3 sm:px-6">
          <div className="story-glass">{page}</div>
        </div>
      ) : (
        page
      )}
    </section>
  );
}
