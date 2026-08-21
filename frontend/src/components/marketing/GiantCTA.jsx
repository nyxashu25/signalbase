import { Link } from 'react-router-dom';
import { AmbientCanvas } from './AmbientCanvas.jsx';
import { ScrubHeadline } from './ScrubHeadline.jsx';

/**
 * The full-bleed closing CTA every marketing page ends on: a huge
 * scroll-scrubbed uppercase headline over the ambient canvas, where the
 * entire block is the link. Shared so each page only supplies its own
 * headline copy and the treatment stays identical everywhere.
 */
export function GiantCTA({
  eyebrow = 'Free to start · No credit card required',
  title,
  to = '/login?mode=register',
  label = 'Start free',
}) {
  return (
    <section className="relative isolate overflow-hidden border-t border-border bg-ink-950 text-white">
      <AmbientCanvas />
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
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-action transition-transform duration-200 ease-brand group-hover:translate-x-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </Link>
    </section>
  );
}
