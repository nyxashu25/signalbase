import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MaskedLines } from './MaskedLines.jsx';
import { Hero3DMark } from './Hero3DMark.jsx';
import { FadeIn } from './motion.jsx';
import { useWorldState } from './worldStore.js';

gsap.registerPlugin(ScrollTrigger);

const EASE = [0.2, 0.8, 0.2, 1];

// Same footprint as Hero3DMark's stage, so the layout never shifts when the
// WebGL world takes over the mark.
const STAGE_SIZE = {
  lg: 'h-[280px] w-[280px] sm:h-[360px] sm:w-[360px] lg:h-[440px] lg:w-[440px]',
  md: 'h-[200px] w-[200px] sm:h-[260px] sm:w-[260px]',
};

// The engine frames the cover's piece at the viewport's vertical middle when
// the page is at the top (s = 0): on landscape viewports at NDC x ≈ 0.42
// (71% across), on portrait ones centered behind the text (world/engine.js,
// framing()). These queries mirror that split.
const LANDSCAPE_QUERY = '(min-aspect-ratio: 1/1)';
// Two columns (lg) and landscape: the piece sits over the empty right column.
const WIDE_QUERY = '(min-width: 1024px) and (min-aspect-ratio: 1/1)';

function useMediaQuery(query) {
  const subscribe = useCallback(
    (notify) => {
      const mq = window.matchMedia?.(query);
      mq?.addEventListener?.('change', notify);
      return () => mq?.removeEventListener?.('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => Boolean(window.matchMedia?.(query).matches),
    () => false,
  );
}

function documentTop(el) {
  let top = 0;
  for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
  return top;
}

const HINT_TEXT =
  'flex items-center gap-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.25em] text-ink-300/80';

function DragIcon() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 1L1 5l3 4M12 1l3 4-3 4M1 5h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * "Drag to spin" on portrait screens, where the mark sits centered behind
 * the text and the cover's buttons share its middle band: a zero-height
 * anchor at the end of the text column, the hint hanging just under the last
 * line of it (the CTAs) in the gap before the mark's stage — so it never
 * covers a button and never changes the layout.
 */
function InlineDragHint() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative h-0">
      <p className={`absolute left-0 top-5 ${HINT_TEXT}`}>
        <DragIcon />
        Drag to spin
      </p>
    </div>
  );
}

/**
 * "Drag to spin", kept next to the 3D mark on landscape screens (the mark
 * off to the right of the text). Below it (`top` null): a zero-height box
 * sticky to the viewport's lower band while the cover scrolls — the mark
 * holds its spot for the first stretch of scroll too — so it never changes
 * the layout. Above it (a cover that ends before the mark does): pinned at
 * `top` px inside the cover, level with the viewport's upper fifth at load.
 */
function DragHint({ top }) {
  const below = top == null;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none h-0 ${below ? 'sticky bottom-[12vh]' : 'absolute inset-x-0'}`}
      style={below ? undefined : { top }}
    >
      <p
        className={`absolute -translate-x-1/2 ${HINT_TEXT} ${below ? 'bottom-0' : 'top-0'}`}
        style={{ left: '71%' }}
      >
        <DragIcon />
        Drag to spin
      </p>
    </div>
  );
}

/**
 * The cover of each book — the shared hero for every marketing page. Deep
 * tone (the Signal World shows through), an art-directed per-character
 * headline beside the hero set piece, the italic narration line, sub copy,
 * and a slot for page-specific controls (Pricing's billing toggle, Home's
 * CTAs). As the reader scrolls on, the headline lifts away faster than the
 * page.
 *
 * `station` / `side`: which Signal World set piece this chapter hosts and
 * which side of the frame it sits on (see world/README.md). The CSS
 * Hero3DMark holds the stage until the world has drawn its first frame
 * (`ready`), then cross-fades out as the canvas fades in; it stays as the
 * fallback whenever the world is off (reduced motion, no WebGL2, load
 * failure). For the `mark` station the drag-to-spin area covers where the
 * engine actually draws the hero: the right-hand column on wide landscape
 * screens, the whole cover elsewhere (the mark sits behind the text there).
 *
 * `size`: 'lg' for Home's full-height cover, 'md' for sub-pages.
 */
export function StoryCover({
  eyebrow,
  lines,
  narration,
  sub,
  children,
  size = 'md',
  mark = true,
  station = 'mark',
  side = 1,
}) {
  const reduceMotion = useReducedMotion();
  const { ready: worldReady } = useWorldState();
  const landscape = useMediaQuery(LANDSCAPE_QUERY);
  const wide = useMediaQuery(WIDE_QUERY);
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);
  // null → under the mark (sticky); a number → above it, at that offset.
  const [hintTop, setHintTop] = useState(null);

  const grab = worldReady && mark && station === 'mark';

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

  // Room for the hint under the mark? The mark reaches ~76% of the viewport
  // height at load; a cover that ends above ~92% puts the hint over the top.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!grab || !landscape || !section) return undefined;
    const measure = () => {
      const top = documentTop(section);
      const vh = window.innerHeight;
      setHintTop(top + section.offsetHeight >= vh * 0.92 ? null : Math.max(8, Math.round(vh * 0.2 - top)));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(section);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [grab, landscape]);

  const tall = size === 'lg';
  const stageSize = STAGE_SIZE[tall ? 'lg' : 'md'];
  const sectionGrab = grab && !wide;

  return (
    <section
      ref={sectionRef}
      data-chapter
      data-chapter-title="Cover"
      data-station={station}
      data-station-side={side}
      data-world-grab={sectionGrab ? '' : undefined}
      style={sectionGrab ? { touchAction: 'pan-y pinch-zoom' } : undefined}
      className="story-cover-clip relative text-white"
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
                ? 'text-[clamp(2.8rem,8vw,7.6rem)] leading-[0.92] lg:text-[5.2vw]'
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
          {grab && !landscape && <InlineDragHint />}
        </div>

        {mark && (
          <FadeIn as="div" whileInView={false} delay={0.35} className="flex justify-center lg:justify-end">
            <div aria-hidden={worldReady ? 'true' : undefined} className={`relative ${stageSize}`}>
              <AnimatePresence initial={false}>
                {!worldReady && (
                  <motion.div
                    key="css-mark"
                    className="absolute inset-0"
                    exit={{ opacity: 0, transition: { duration: 0.7, ease: EASE } }}
                  >
                    <Hero3DMark sinkWith={sectionRef} size={tall ? 'lg' : 'md'} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeIn>
        )}
      </div>

      {/* Wide screens: the drag area is the right-hand column, full height —
          wherever in the cover the engine draws the mark, it's under here. */}
      {grab && wide && (
        <div
          aria-hidden="true"
          data-world-grab
          className="absolute inset-y-0 right-0 w-[45%] cursor-grab select-none active:cursor-grabbing"
          style={{ touchAction: 'pan-y pinch-zoom' }}
        />
      )}
      {grab && landscape && <DragHint top={hintTop} />}
    </section>
  );
}
