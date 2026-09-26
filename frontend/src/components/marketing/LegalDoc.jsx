import { FadeIn } from './motion.jsx';

/**
 * A bound document in the storybook: a short deep-toned cover strip with
 * the title, then the readable page — a floating glass card over the Signal
 * World's quiet drift — holding the sections. Legal text stays a plain,
 * quiet document — the 3D theatre is for the story pages, not for terms
 * people need to actually read.
 */
export function LegalDoc({ title, updated, children }) {
  return (
    <>
      <section
        data-chapter
        data-chapter-title={title}
        data-station="drift"
        data-station-side="0"
        className="relative text-white"
      >
        <div className="mx-auto max-w-[900px] px-6 pb-14 pt-20 sm:pt-24">
          <FadeIn as="p" whileInView={false} className="text-xs font-bold uppercase tracking-[0.22em] text-mauve-magic">
            Document
          </FadeIn>
          <FadeIn as="h1" whileInView={false} delay={0.1} className="mt-5 text-[clamp(2.4rem,6vw,5rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
            {title}
          </FadeIn>
          <FadeIn as="p" whileInView={false} delay={0.2} className="story-narration mt-5 text-lg text-mauve-2/90">
            Last updated {updated}
          </FadeIn>
        </div>
      </section>

      <section className="relative pb-16 text-text sm:pb-24">
        <div className="mx-auto max-w-[948px] px-3 sm:px-6">
          <div className="story-glass px-6 py-12 sm:px-10 sm:py-16">
            <p className="rounded-md border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">
              This describes how DataPit actually handles data today, in plain language, and we keep
              it current as the product changes. It hasn't been reviewed by outside counsel, so if you
              need a formal legal review for your own compliance purposes,{' '}
              <a href="/contact" className="font-medium text-primary hover:underline">
                contact us
              </a>{' '}
              and we'll work with you directly.
            </p>
            <div className="mt-12 flex flex-col gap-12">{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}

export function LegalSection({ title, children }) {
  return (
    <div className="grid grid-cols-1 gap-4 border-t border-border pt-8 sm:grid-cols-[220px_1fr] sm:gap-10">
      <h2 className="text-lg font-bold leading-snug text-text">{title}</h2>
      <div className="max-w-[620px] text-sm leading-relaxed text-text-muted [&_p]:mb-3 [&_p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
