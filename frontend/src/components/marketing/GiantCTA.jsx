import { Link } from 'react-router-dom';
import { ScrubHeadline } from './ScrubHeadline.jsx';
import { Magnetic } from './Magnetic.jsx';

/**
 * The epilogue every marketing page ends on: a huge scroll-scrubbed
 * uppercase headline in the deep world, where the entire block is the link
 * and the arrow leans magnetically toward the pointer. Shared so each page
 * only supplies its own headline copy and the treatment stays identical
 * everywhere.
 *
 * `station` / `side`: the Signal World set piece behind it (world/README.md)
 * — the mark by default, centered.
 */
export function GiantCTA({
  eyebrow = 'Epilogue · Free to start · No credit card required',
  title,
  to = '/login?mode=register',
  label = 'Start free',
  station = 'mark',
  side = 0,
}) {
  return (
    <section
      data-chapter
      data-chapter-title="Epilogue"
      data-station={station}
      data-station-side={side}
      className="relative overflow-hidden border-t border-white/10 text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(190,61,255,0.18), transparent 62%)', filter: 'blur(30px)' }}
      />
      <Link to={to} className="group relative mx-auto block max-w-[1400px] px-6 py-32 sm:py-44">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-mauve-magic">{eyebrow}</p>
        <ScrubHeadline
          as="h2"
          className="mt-8 text-[clamp(2.6rem,8vw,8rem)] font-extrabold uppercase leading-[0.95] tracking-tight"
        >
          {title}
        </ScrubHeadline>
        <span className="mt-12 inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-white">
          {label}
          {/* Padding widens the magnetic field past the 44px disc. */}
          <Magnetic className="-m-4 inline-block p-4" max={6} strength={0.4}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-action shadow-[0_0_28px_rgba(197,82,255,0.5)] transition-transform duration-200 ease-brand group-hover:translate-x-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Magnetic>
        </span>
      </Link>
    </section>
  );
}
