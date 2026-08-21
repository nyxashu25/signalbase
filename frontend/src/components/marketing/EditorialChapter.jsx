import { ScrubHeadline } from './ScrubHeadline.jsx';
import { Parallax } from './Parallax.jsx';
import { FadeIn } from './motion.jsx';

/**
 * One numbered full-bleed feature chapter: a giant hollow index numeral
 * bleeding off the top-right, a scroll-scrubbed uppercase title, and a
 * text column beside a parallax-drifting product mockup. Shared between
 * Home and Product so the numbered-section language stays identical.
 * `alt` flips the column order and switches to the raised surface tone.
 */
export function EditorialChapter({ n, eyebrow, title, desc, points, mockup, alt = false }) {
  return (
    <section
      className={`relative overflow-hidden ${alt ? 'border-y border-border bg-surface' : ''}`}
    >
      <span
        aria-hidden="true"
        className="text-outline pointer-events-none absolute -top-8 right-2 select-none text-[clamp(8rem,22vw,20rem)] font-extrabold leading-none sm:right-6"
      >
        {n}
      </span>
      <div className="relative mx-auto max-w-[1200px] px-6 py-28 sm:py-36">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          {n} — {eyebrow}
        </p>
        <ScrubHeadline
          as="h2"
          className="mt-6 max-w-[820px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
        >
          {title}
        </ScrubHeadline>
        <div className="mt-14 grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <FadeIn as="div" className={alt ? 'lg:order-2' : ''}>
            <p className="text-base leading-relaxed text-text-muted">{desc}</p>
            <ul className="mt-8 flex flex-col text-sm text-text">
              {points.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 border-t border-border py-4 last:border-b"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="mt-0.5 shrink-0 text-primary"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-medium">{p}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
          <FadeIn as="div" delay={0.15} className={alt ? 'lg:order-1' : ''}>
            <Parallax amount={32}>{mockup}</Parallax>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
