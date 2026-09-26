import { useEffect, useState } from 'react';
import { smoothScrollStore } from './smoothScrollStore.js';

/**
 * The book's ribbon bookmarks: a fixed rail on the right edge (desktop only)
 * with one marker per chapter on the current page. Chapters announce
 * themselves with `data-chapter` + `data-chapter-title` (StoryCover,
 * StoryChapter, and any section that opts in); the rail re-scans the DOM
 * whenever a page finishes turning in (MarketingLayout dispatches
 * `story:page-ready`). The marker for the chapter in view glows; clicking
 * one glides there through the smooth scroller.
 */
export function BookmarkRail({ pathname }) {
  const [chapters, setChapters] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let observer;

    function scan() {
      const nodes = Array.from(document.querySelectorAll('[data-chapter]'));
      const next = nodes.map((el, i) => ({
        el,
        title: el.getAttribute('data-chapter-title') || `Chapter ${i + 1}`,
      }));
      setChapters(next);
      setActiveIndex(0);
      observer?.disconnect();
      if (typeof IntersectionObserver === 'undefined' || next.length === 0) return;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const idx = next.findIndex((c) => c.el === entry.target);
              if (idx >= 0) setActiveIndex(idx);
            }
          }
        },
        { rootMargin: '-40% 0px -50% 0px', threshold: 0 },
      );
      next.forEach((c) => observer.observe(c.el));
    }

    scan();
    window.addEventListener('story:page-ready', scan);
    return () => {
      window.removeEventListener('story:page-ready', scan);
      observer?.disconnect();
    };
  }, [pathname]);

  if (chapters.length < 2) return null;

  return (
    <nav
      aria-label="Chapters"
      className="fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex"
    >
      {chapters.map((c, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={`${c.title}-${i}`}
            type="button"
            onClick={() => smoothScrollStore.scrollTo(c.el, { offset: -72 })}
            aria-label={`Go to ${c.title}`}
            aria-current={active ? 'true' : undefined}
            className="group flex items-center gap-3"
          >
            <span
              className={`translate-x-2 text-[11px] font-bold uppercase tracking-[0.2em] opacity-0 transition-all duration-200 ease-brand group-hover:translate-x-0 group-hover:opacity-100 ${
                active ? 'text-mauve-magic' : 'text-ink-300'
              }`}
            >
              {c.title}
            </span>
            <span
              className={`block rounded-full transition-all duration-300 ease-brand ${
                active
                  ? 'h-8 w-1.5 bg-gradient-action shadow-[0_0_14px_rgba(197,82,255,0.8)]'
                  : 'h-3 w-1.5 bg-white/25 group-hover:bg-white/50'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
