import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { MarketingFooter } from './MarketingFooter.jsx';
import { StoryCover } from './StoryCover.jsx';
import { GiantCTA } from './GiantCTA.jsx';
import { Magnetic } from './Magnetic.jsx';
import { DATABASE_CLAIM } from '../../data/facts.js';
import { TOOLS } from '../../content/tools.jsx';

// "August 27, 2026" — fixed to UTC so the server render and the browser agree.
export function formatDay(isoDay) {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

/** Renders the two inline marks content text allows: **bold** and [label](href). */
export function InlineText({ text }) {
  const parts = String(text).split(INLINE);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i} className="font-bold text-text">{bold[1]}</strong>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      const cls = 'font-semibold text-primary underline-offset-2 hover:underline';
      return href.startsWith('/') ? (
        <Link key={i} to={href} className={cls}>
          {label}
        </Link>
      ) : (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {label}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/\*\*|\[|\]\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function Table({ block }) {
  return (
    <figure className="flex flex-col gap-3">
      {block.caption && <figcaption className="text-sm font-bold text-text">{block.caption}</figcaption>}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
          <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
            <tr>
              {block.head.map((h) => (
                <th key={h} scope="col" className="px-3 py-3 align-bottom font-bold">
                  <InlineText text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) =>
                  c === 0 ? (
                    <th key={c} scope="row" className="px-3 py-3 align-top font-bold">
                      <InlineText text={cell} />
                    </th>
                  ) : (
                    <td key={c} className="px-3 py-3 align-top">
                      <InlineText text={cell} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.note && (
        <p className="text-xs leading-relaxed text-text-muted">
          <InlineText text={block.note} />
        </p>
      )}
    </figure>
  );
}

// Internal paths route in the app; anything else opens in a new tab.
function HeroLink({ to, className, children }) {
  return to.startsWith('/') ? (
    <Link to={to} className={className}>
      {children}
    </Link>
  ) : (
    <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function CtaLink({ to, primary, children }) {
  const cls = primary
    ? 'block rounded-md bg-gradient-action px-6 py-3 text-center text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.3)] transition-transform duration-150 ease-brand hover:-translate-y-px'
    : 'block rounded-md border border-border bg-surface-elevated px-6 py-3 text-center text-sm font-bold text-text transition-colors duration-150 ease-brand hover:bg-surface';
  return to.startsWith('/') ? (
    <Link to={to} className={cls}>
      {children}
    </Link>
  ) : (
    <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 id={slug(block.text)} className="scroll-mt-28 pt-4 text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold leading-tight tracking-tight text-text">
          <InlineText text={block.text} />
        </h2>
      );
    case 'h3':
      return (
        <h3 className="text-lg font-bold leading-snug text-text">
          <InlineText text={block.text} />
        </h3>
      );
    case 'p':
      return (
        <p className="text-base leading-relaxed text-text-muted">
          <InlineText text={block.text} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`flex flex-col gap-2 pl-5 text-base leading-relaxed text-text-muted ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-primary`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineText text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'steps':
      return (
        <ol className="flex flex-col gap-4">
          {block.items.map((step, i) => (
            <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-4">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-text">
                  <InlineText text={step.title} />
                </p>
                <p className="mt-1 text-base leading-relaxed text-text-muted">
                  <InlineText text={step.text} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      );
    case 'table':
      return <Table block={block} />;
    case 'callout':
      return (
        <aside className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-4">
          {block.title && <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{block.title}</p>}
          <p className={`${block.title ? 'mt-2 ' : ''}text-base leading-relaxed text-text`}>
            <InlineText text={block.text} />
          </p>
        </aside>
      );
    case 'faq':
      return (
        <div className="flex flex-col gap-4">
          <h2 id={slug(block.title ?? 'Frequently asked questions')} className="scroll-mt-28 pt-4 text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold leading-tight tracking-tight text-text">
            {block.title ?? 'Frequently asked questions'}
          </h2>
          {block.items.map((item) => (
            <div key={item.q} className="rounded-lg border border-border bg-surface-elevated/60 p-5">
              <h3 className="text-base font-bold text-text">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                <InlineText text={item.a} />
              </p>
            </div>
          ))}
        </div>
      );
    case 'cta':
      return (
        <div className="rounded-lg border border-border bg-surface px-6 py-6">
          <p className="text-lg font-extrabold text-text">
            <InlineText text={block.title} />
          </p>
          {block.text && (
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              <InlineText text={block.text} />
            </p>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <CtaLink to={block.primary.to} primary>
              {block.primary.label}
            </CtaLink>
            {block.secondary && <CtaLink to={block.secondary.to}>{block.secondary.label}</CtaLink>}
          </div>
        </div>
      );
    case 'related':
      return (
        <nav aria-label={block.title ?? 'Related pages'} className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{block.title ?? 'Related'}</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {block.items.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="block h-full rounded-lg border border-border bg-surface-elevated/60 p-4 transition-colors hover:border-primary/40">
                  <span className="font-bold text-text">{item.label}</span>
                  {item.text && <span className="mt-1 block text-sm text-text-muted">{item.text}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      );
    case 'sources':
      return (
        <div className="border-t border-border pt-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">Sources</p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-text-muted">
            {block.items.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                  {s.label}
                </a>{' '}
                <span className="text-xs">(checked {formatDay(s.checked)})</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'dataCoverage':
      return DATABASE_CLAIM ? (
        <p className="text-base leading-relaxed text-text-muted">
          <InlineText text={DATABASE_CLAIM} />
        </p>
      ) : null;
    default:
      return null;
  }
}

/**
 * The template for every content page (comparisons, features, personas,
 * the extension page, guides): the storybook cover with the page's
 * answer-first paragraph, then the readable glass document built from the
 * page's blocks (src/content/schema.js), its "Last updated" date, and the
 * closing call to action.
 */
export function ContentArticle({ page }) {
  const { meta, hero, blocks } = page;
  // A free tool's interactive widget (content/tools.jsx) leads its page body.
  const Tool = page.tool ? TOOLS[page.tool] : null;
  return (
    <div className="min-h-screen">
      <StoryCover
        station={meta.station ?? 'mark'}
        eyebrow={hero.eyebrow}
        sub={hero.sub}
        lines={hero.lines.map((content, i, all) => ({
          content:
            i === all.length - 1 ? (
              <span className="bg-gradient-brand bg-clip-text text-transparent">{content}</span>
            ) : (
              content
            ),
          className: i % 2 === 1 ? 'sm:ml-[6vw]' : undefined,
        }))}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Magnetic className="block">
            <HeroLink
              to={hero.primary?.to ?? '/login?mode=register'}
              className="block rounded-md bg-gradient-action px-7 py-3.5 text-center text-sm font-bold text-white shadow-[0_14px_32px_rgba(148,0,222,0.45)] transition-transform duration-150 ease-brand hover:-translate-y-px"
            >
              {hero.primary?.label ?? 'Start free'}
            </HeroLink>
          </Magnetic>
          <Magnetic className="block">
            <HeroLink
              to={hero.secondary?.to ?? '/pricing'}
              className="block rounded-md border border-white/20 bg-white/5 px-7 py-3.5 text-center text-sm font-bold text-white backdrop-blur transition-colors duration-150 ease-brand hover:bg-white/10"
            >
              {hero.secondary?.label ?? 'See pricing'}
            </HeroLink>
          </Magnetic>
        </div>
      </StoryCover>

      <section
        data-chapter
        data-chapter-title={meta.name}
        data-station="drift"
        data-station-side="0"
        className="relative py-6 text-text sm:py-10"
      >
        <div className="mx-auto max-w-[948px] px-3 sm:px-6">
          <article className="story-glass px-6 py-12 sm:px-12 sm:py-16">
            <div className="mx-auto flex max-w-[720px] flex-col gap-6">
              {Tool && <Tool />}
              {blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
              <p className="border-t border-border pt-6 text-xs text-text-muted">
                Last updated <time dateTime={meta.updated}>{formatDay(meta.updated)}</time>
              </p>
            </div>
          </article>
        </div>
      </section>

      <GiantCTA station="mark" title="Start free. Upgrade when it pays for itself." />
      <MarketingFooter />
    </div>
  );
}
