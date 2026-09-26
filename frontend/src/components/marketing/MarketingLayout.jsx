import { Suspense, useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SmoothScroll } from './SmoothScroll.jsx';
import { StoryBackdrop } from './StoryBackdrop.jsx';
import { SignalWorld } from './SignalWorld.jsx';
import { IntroOverlay } from './IntroOverlay.jsx';
import { CustomCursor } from './CustomCursor.jsx';
import { MarketingNav } from './MarketingNav.jsx';
import { BookmarkRail } from './BookmarkRail.jsx';
import { smoothScrollStore } from './smoothScrollStore.js';

const EASE = [0.2, 0.8, 0.2, 1];

// Scale around the middle of what the reader is looking at, not the middle
// of a page that may be many screens tall.
function viewportOrigin() {
  return `50% ${window.scrollY + window.innerHeight / 2}px`;
}

// The depth push that pairs with the Signal World's warp: the leaving page
// falls away into the pit (shrinks, blurs, fades) while the camera punches
// forward; the arriving page rushes up from just in front of the glass and
// comes into focus. Nav, backdrop, world and bookmark rail sit outside the
// moving surface. `filter` ends at `none`, not blur(0) — any filter would
// make this wrapper the containing block for position: fixed descendants and
// break GSAP pins (ScrollSteps).
const depthVariants = {
  initial: () => ({ opacity: 0, scale: 1.05, filter: 'blur(8px)', transformOrigin: viewportOrigin() }),
  enter: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: EASE },
    transitionEnd: { filter: 'none' },
  },
  exit: () => ({
    opacity: 0,
    scale: 0.94,
    filter: 'blur(10px)',
    transformOrigin: viewportOrigin(),
    transition: { duration: 0.42, ease: [0.4, 0, 0.7, 0.2] },
  }),
};

const fadeVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function PageFallback() {
  // Deliberately blank: the world shows through while a lazy page chunk
  // loads, so the warp lands on the pit rather than a spinner.
  return <div className="min-h-screen" role="status" aria-label="Loading" />;
}

// Sits after the page inside the same Suspense boundary, so its effect runs
// only once the lazy page has actually committed — that's the moment the
// chapters exist in the DOM for the bookmark rail and the Signal World to
// find and for GSAP to measure. Needed because AnimatePresence's
// `initial={false}` means the very first page never fires an enter
// animation callback.
function PageReady({ pathname }) {
  useEffect(() => {
    ScrollTrigger.refresh();
    window.dispatchEvent(new CustomEvent('story:page-ready'));
  }, [pathname]);
  return null;
}

/**
 * The shell every marketing page renders inside — one continuous storybook:
 * the fixed deep-indigo ground (StoryBackdrop, the CSS fallback), the WebGL
 * Signal World flown through above it (SignalWorld, with the first-visit
 * IntroOverlay), one smooth scroller for the whole site, the nav, the
 * bookmark rail, the custom cursor, and a depth-push transition between
 * routes. Pages provide only their own content and footer.
 */
export function MarketingLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();

  // A fresh page should start at the top; GSAP's triggers must re-measure
  // once the previous page is gone and again after the new one settles.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [location.pathname]);

  // Also fires when the enter animation finishes over the Suspense fallback
  // (a lazy page chunk still loading). ScrollTrigger just re-measures; the
  // Signal World ignores a page-ready while no [data-chapter] exists and
  // waits for PageReady's own dispatch once the page commits.
  function onPageReady() {
    ScrollTrigger.refresh();
    window.dispatchEvent(new CustomEvent('story:page-ready'));
  }

  return (
    <div className="relative min-h-screen bg-ink-950">
      <SmoothScroll />
      <StoryBackdrop />
      <SignalWorld pathname={location.pathname} />
      <MarketingNav />
      <BookmarkRail pathname={location.pathname} />

      <div className="relative z-[2]">
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={() => smoothScrollStore.scrollTo(0, { immediate: true })}
        >
          <motion.div
            key={location.pathname}
            variants={reduceMotion ? fadeVariants : depthVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            onAnimationComplete={(definition) => {
              if (definition === 'enter') onPageReady();
            }}
          >
            <Suspense fallback={<PageFallback />}>
              {outlet}
              <PageReady pathname={location.pathname} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      <IntroOverlay />
      <CustomCursor />
    </div>
  );
}
