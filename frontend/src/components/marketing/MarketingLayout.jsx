import { Suspense, useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SmoothScroll } from './SmoothScroll.jsx';
import { StoryBackdrop } from './StoryBackdrop.jsx';
import { MarketingNav } from './MarketingNav.jsx';
import { BookmarkRail } from './BookmarkRail.jsx';
import { smoothScrollStore } from './smoothScrollStore.js';

const EASE = [0.2, 0.8, 0.2, 1];

// Turning a page: the leaving page lifts at its right edge toward the reader
// and swings left; the arriving page turns in from the right, hinged on its
// right edge, and lays flat. Nav, backdrop and bookmark rail sit outside the
// turning surface, so they hold still like the desk the book rests on.
const turnVariants = {
  initial: { opacity: 0, rotateY: 14, x: 48, transformOrigin: '100% 50%' },
  enter: {
    opacity: 1,
    rotateY: 0,
    x: 0,
    transformOrigin: '100% 50%',
    transition: { duration: 0.62, ease: EASE },
  },
  exit: {
    opacity: 0,
    rotateY: -18,
    x: -56,
    transformOrigin: '0% 50%',
    transition: { duration: 0.42, ease: [0.4, 0, 0.7, 0.2] },
  },
};

const fadeVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function PageFallback() {
  // Deliberately blank: the backdrop shows through while a lazy page chunk
  // loads, so the turn reveals the book's surface rather than a spinner.
  return <div className="min-h-screen" role="status" aria-label="Loading" />;
}

// Sits after the page inside the same Suspense boundary, so its effect runs
// only once the lazy page has actually committed — that's the moment the
// chapters exist in the DOM for the bookmark rail to find and for GSAP to
// measure. Needed because AnimatePresence's `initial={false}` means the very
// first page never fires an enter animation callback.
function PageReady({ pathname }) {
  useEffect(() => {
    ScrollTrigger.refresh();
    window.dispatchEvent(new CustomEvent('story:page-ready'));
  }, [pathname]);
  return null;
}

/**
 * The shell every marketing page renders inside — one continuous storybook:
 * the fixed deep-indigo world with the signal river (StoryBackdrop), one
 * smooth scroller for the whole site, the nav, the bookmark rail, and a
 * 3D page-turn transition between routes. Pages provide only their own
 * content and footer.
 */
export function MarketingLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();

  // A fresh page should start at the top; GSAP's triggers must re-measure
  // once the previous page is gone and again after the new one lays flat.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [location.pathname]);

  function onPageReady() {
    ScrollTrigger.refresh();
    window.dispatchEvent(new CustomEvent('story:page-ready'));
  }

  return (
    <div className="relative min-h-screen bg-ink-950">
      <SmoothScroll />
      <StoryBackdrop />
      <MarketingNav />
      <BookmarkRail pathname={location.pathname} />

      <div className="relative z-[2]" style={{ perspective: 1800 }}>
        <AnimatePresence
          mode="wait"
          initial={false}
          onExitComplete={() => smoothScrollStore.scrollTo(0, { immediate: true })}
        >
          <motion.div
            key={location.pathname}
            variants={reduceMotion ? fadeVariants : turnVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            onAnimationComplete={(definition) => {
              if (definition === 'enter') onPageReady();
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Suspense fallback={<PageFallback />}>
              {outlet}
              <PageReady pathname={location.pathname} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
