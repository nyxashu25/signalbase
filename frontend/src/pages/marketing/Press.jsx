import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import {
  BOILERPLATE_MEDIUM,
  BOILERPLATE_SHORT,
  DATAPIT_SUMMARY,
  PROFILES,
  glanceFacts,
} from '../../data/facts.js';
import { PLANS } from '../../data/plans.js';

// The company description in three lengths (data/facts.js), so a writer can
// paste whichever fits and every profile reads the same.
const BOILERPLATES = [
  { label: 'One line', text: DATAPIT_SUMMARY },
  { label: 'About 50 words', text: BOILERPLATE_SHORT },
  { label: 'About 100 words', text: BOILERPLATE_MEDIUM },
];

// PNGs are rendered by scripts/press-assets.mjs into public/press/; the SVGs
// are the originals in public/logos/. `ground` is the preview tile's
// background, the kind of surface the file is made for.
const LOGOS = [
  {
    name: 'Mark',
    use: 'Avatars, social profiles and app icons. Transparent background.',
    preview: '/press/datapit-mark-400.png',
    ground: 'light',
    square: true,
    files: [
      { label: 'PNG 400×400', href: '/press/datapit-mark-400.png' },
      { label: 'PNG 1024×1024', href: '/press/datapit-mark-1024.png' },
      { label: 'SVG', href: '/logos/datapit-mark.svg' },
    ],
  },
  {
    name: 'Mark on dark',
    use: 'Profile pictures that need a solid background.',
    preview: '/press/datapit-mark-on-dark-400.png',
    ground: 'dark',
    square: true,
    files: [
      { label: 'PNG 400×400', href: '/press/datapit-mark-on-dark-400.png' },
      { label: 'PNG 1024×1024', href: '/press/datapit-mark-on-dark-1024.png' },
    ],
  },
  {
    name: 'Logo for light backgrounds',
    use: 'White or pale backgrounds. Transparent background.',
    preview: '/press/datapit-logo-light.png',
    ground: 'light',
    files: [
      { label: 'PNG, 1200 px wide', href: '/press/datapit-logo-light.png' },
      { label: 'SVG', href: '/logos/datapit-logo-light.svg' },
    ],
  },
  {
    name: 'Logo for dark backgrounds',
    use: 'Dark or deep purple backgrounds. Transparent background.',
    preview: '/press/datapit-logo-dark.png',
    ground: 'dark',
    files: [
      { label: 'PNG, 1200 px wide', href: '/press/datapit-logo-dark.png' },
      { label: 'SVG', href: '/logos/datapit-logo-dark.svg' },
    ],
  },
  {
    name: 'One-color marks',
    use: 'Print, embossing and single-color layouts.',
    preview: '/logos/datapit-mark-ink.svg',
    ground: 'light',
    square: true,
    files: [
      { label: 'SVG, ink', href: '/logos/datapit-mark-ink.svg' },
      { label: 'SVG, white', href: '/logos/datapit-mark-white.svg' },
    ],
  },
];

const BASIC = PLANS.find((p) => p.key === 'BASIC');

const IMAGES = [
  {
    name: 'Pricing',
    href: '/press/datapit-gallery-pricing.png',
    alt: `DataPit pricing: ${BASIC.block.paidSeats + BASIC.block.freeSeats} seats for $${BASIC.price} a month, with all ${PLANS.length} plans and their monthly credits.`,
  },
  {
    name: 'How DataPit works',
    href: '/press/datapit-gallery-workspace.png',
    alt: 'How DataPit works: search people and companies, reveal work emails, build lists and use the Chrome extension.',
  },
];

// The brand palette, as defined in tailwind.config.js (a test checks they
// still match). Roles follow the DataPit design language.
const COLORS = [
  { name: 'Royal Violet', hex: '#7C00BA', role: 'Primary brand color on light backgrounds' },
  { name: 'Purple X11', hex: '#AA00FF', role: 'Primary brand color on dark backgrounds' },
  { name: 'Hyper Magenta', hex: '#BE3DFF', role: 'Highlights and gradients' },
  { name: 'Mauve Magic', hex: '#CF70FF', role: 'Secondary highlight' },
  { name: 'Indigo', hex: '#440066', role: 'Deep brand backgrounds' },
  { name: 'Ink 950', hex: '#110019', role: 'Dark background' },
  { name: 'Ink 900', hex: '#180022', role: 'Text on light backgrounds' },
];

const headingClass =
  'scroll-mt-28 text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold leading-tight tracking-tight text-text';
const fileLinkClass =
  'inline-flex items-center rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-bold text-text transition-colors duration-150 ease-brand hover:border-primary/40 hover:text-primary';
const GROUND = {
  light: 'bg-white',
  dark: 'bg-ink-950',
};

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the text is on the page to select by hand.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy the ${label.toLowerCase()} description`}
      className="shrink-0 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-xs font-bold text-text transition-colors duration-150 ease-brand hover:border-primary/40 hover:text-primary"
    >
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <h2 id={id} className={headingClass}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function FileLinks({ name, files }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((file) => (
        <li key={file.href}>
          <a href={file.href} download aria-label={`Download ${name}, ${file.label}`} className={fileLinkClass}>
            {file.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * The press kit: DataPit described in three lengths, the facts at a glance,
 * logo and image downloads, brand colors and type, profiles and a contact.
 * Every fact comes from data/facts.js, so it matches the rest of the site
 * and llms.txt word for word.
 */
export function Press() {
  return (
    <div className="min-h-screen">
      <StoryCover
        station="mark"
        eyebrow="Press kit"
        sub="Logos, product images, key facts and ready-to-use descriptions of DataPit. You're welcome to use all of it when you write about us."
        lines={[
          { content: 'DataPit' },
          {
            content: <span className="bg-gradient-brand bg-clip-text text-transparent">press kit.</span>,
            className: 'sm:ml-[6vw]',
          },
        ]}
      />
      <section
        data-chapter
        data-chapter-title="Press kit"
        data-station="drift"
        data-station-side="0"
        className="relative py-6 text-text sm:py-10"
      >
        <div className="mx-auto max-w-[948px] px-3 sm:px-6">
          <article className="story-glass px-6 py-12 sm:px-12 sm:py-16">
            <div className="mx-auto flex max-w-[760px] flex-col gap-14">
              <Section id="about-datapit" title="About DataPit">
                <p className="text-base leading-relaxed text-text-muted">
                  Three lengths of the same description. Use whichever fits.
                </p>
                <div className="flex flex-col gap-4">
                  {BOILERPLATES.map((b) => (
                    <figure key={b.label} className="rounded-lg border border-border bg-surface-elevated/60 p-5">
                      <figcaption className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{b.label}</span>
                        <CopyButton text={b.text} label={b.label} />
                      </figcaption>
                      <p className="mt-3 text-base leading-relaxed text-text">{b.text}</p>
                    </figure>
                  ))}
                </div>
              </Section>

              <Section id="at-a-glance" title="DataPit at a glance">
                {/* The same facts, word for word, as the About page and llms-full.txt. */}
                <dl className="divide-y divide-border border-y border-border">
                  {glanceFacts().map((fact) => (
                    <div key={fact.label} className="grid grid-cols-1 gap-2 py-5 sm:grid-cols-[180px_1fr] sm:gap-8">
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{fact.label}</dt>
                      <dd className="text-base leading-relaxed">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </Section>

              <Section id="logos" title="Logos">
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {LOGOS.map((logo) => (
                    <li key={logo.name} className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated/60">
                      <div className={`flex h-40 items-center justify-center border-b border-border p-6 ${GROUND[logo.ground]}`}>
                        <img
                          src={logo.preview}
                          alt={`${logo.name} preview`}
                          loading="lazy"
                          className={logo.square ? 'h-28 w-28 object-contain' : 'max-h-24 w-full object-contain'}
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-5">
                        <div>
                          <h3 className="text-base font-bold text-text">{logo.name}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-text-muted">{logo.use}</p>
                        </div>
                        <FileLinks name={logo.name} files={logo.files} />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-sm leading-relaxed text-text-muted">
                  Use the logo as supplied: don&apos;t recolor parts of it, stretch it, rotate it or add effects,
                  and leave clear space around it about as wide as the mark&apos;s tallest bar. The SVG logos set
                  their text in Montserrat; if you don&apos;t have it installed, use the PNGs.
                </p>
              </Section>

              <Section id="product-images" title="Product images">
                <p className="text-base leading-relaxed text-text-muted">
                  1270×760 PNGs, the size Product Hunt recommends for gallery images.
                </p>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {IMAGES.map((image) => (
                    <li key={image.href} className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated/60">
                      <img
                        src={image.href}
                        alt={image.alt}
                        width="1270"
                        height="760"
                        loading="lazy"
                        className="aspect-[1270/760] h-auto w-full border-b border-border object-cover"
                      />
                      <div className="flex items-center justify-between gap-3 p-5">
                        <h3 className="text-base font-bold text-text">{image.name}</h3>
                        <FileLinks name={image.name} files={[{ label: 'PNG 1270×760', href: image.href }]} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section id="brand" title="Colors and type">
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {COLORS.map((color) => (
                    <li key={color.hex} className="flex items-center gap-4 rounded-lg border border-border bg-surface-elevated/60 p-3">
                      <span
                        aria-hidden="true"
                        className="h-12 w-12 shrink-0 rounded-md border border-border"
                        style={{ background: color.hex }}
                      />
                      <div>
                        <p className="text-sm font-bold text-text">
                          {color.name} <span className="font-mono font-semibold text-text-muted">{color.hex}</span>
                        </p>
                        <p className="text-sm text-text-muted">{color.role}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2">
                  <span aria-hidden="true" className="h-10 w-full rounded-md bg-gradient-brand" />
                  <p className="text-sm leading-relaxed text-text-muted">
                    The brand gradient runs from Indigo 2 (#610091) through Royal Violet, Purple X11 and Hyper Magenta to
                    Mauve Magic.
                  </p>
                </div>
                <p className="text-base leading-relaxed text-text-muted">
                  The typeface is{' '}
                  <a
                    href="https://fonts.google.com/specimen/Montserrat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Montserrat
                  </a>
                  , free on Google Fonts. Headlines are set in ExtraBold (800) and body text in Medium (500).
                </p>
              </Section>

              <Section id="profiles" title="Profiles">
                {PROFILES.length ? (
                  <ul className="flex flex-col gap-2 text-base">
                    {PROFILES.map((profile) => (
                      <li key={profile.url}>
                        <a
                          href={profile.url}
                          target="_blank"
                          rel="noopener noreferrer me"
                          className="font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          DataPit on {profile.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-base leading-relaxed text-text-muted">
                    DataPit&apos;s official profiles on other sites will be listed here once they&apos;re live.
                  </p>
                )}
              </Section>

              <Section id="press-contact" title="Press contact">
                <p className="text-base leading-relaxed text-text-muted">
                  For interviews, product questions or a fact check, write to us through the{' '}
                  <Link to="/contact" className="font-semibold text-primary underline-offset-2 hover:underline">
                    contact page
                  </Link>{' '}
                  and mention your publication.
                </p>
              </Section>
            </div>
          </article>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
