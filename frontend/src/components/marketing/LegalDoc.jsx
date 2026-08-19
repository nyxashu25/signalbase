export function LegalDoc({ title, updated, children }) {
  return (
    <section className="mx-auto max-w-[760px] px-6 py-20">
      <h1 className="text-4xl font-extrabold tracking-tight text-text">{title}</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated {updated}</p>
      <p className="mt-6 rounded-md border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-text-muted">
        This describes how DataPit actually handles data today, in plain language, and we keep it
        current as the product changes. It hasn't been reviewed by outside counsel, so if you need
        a formal legal review for your own compliance purposes,{' '}
        <a href="/contact" className="font-medium text-primary hover:underline">
          contact us
        </a>{' '}
        and we'll work with you directly.
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
