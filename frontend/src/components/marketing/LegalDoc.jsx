export function LegalDoc({ title, updated, children }) {
  return (
    <section className="mx-auto max-w-[760px] px-6 py-20">
      <h1 className="text-4xl font-extrabold tracking-tight text-text">{title}</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated {updated}</p>
      <p className="mt-6 rounded-md border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">
        DataPit is an early-stage product. This document is a good-faith starting template, not a
        substitute for review by qualified legal counsel before relying on it for a real launch.
      </p>
      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </section>
  );
}

export function LegalSection({ title, children }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-text">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-text-muted [&_p]:mb-3 [&_p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
