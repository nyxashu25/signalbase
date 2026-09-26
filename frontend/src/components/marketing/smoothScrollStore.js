// The one live Lenis instance (see SmoothScroll.jsx), shared so the parts of
// the storybook that live outside the scrolling page — the bookmark rail,
// the route-level page turn — can drive the smoothed scroll instead of
// fighting it with native window.scrollTo. Falls back to native scrolling
// when Lenis isn't running (reduced motion, touch devices, tests).
let instance = null;

export const smoothScrollStore = {
  set(lenis) {
    instance = lenis;
  },
  get() {
    return instance;
  },
  /**
   * target: a number (px from top) or an element.
   * opts.immediate: jump instead of glide (used when a new page mounts).
   * opts.offset: px added to an element target (e.g. to clear the nav).
   */
  scrollTo(target, { immediate = false, offset = 0 } = {}) {
    if (instance) {
      instance.scrollTo(target, { immediate, offset, force: true });
      return;
    }
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: immediate ? 'auto' : 'smooth' });
      return;
    }
    if (target?.getBoundingClientRect) {
      const top = window.scrollY + target.getBoundingClientRect().top + offset;
      window.scrollTo({ top, behavior: immediate ? 'auto' : 'smooth' });
    }
  },
};
