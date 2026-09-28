import { Link } from 'react-router-dom';
import { FadeIn } from './motion.jsx';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Product', to: '/product' },
      { label: 'Solutions', to: '/solutions' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Chrome extension', to: '/chrome-extension' },
    ],
  },
  {
    heading: 'Compare',
    links: [
      { label: 'Apollo alternative', to: '/alternatives/apollo' },
      { label: 'ZoomInfo alternative', to: '/alternatives/zoominfo' },
      { label: 'Lusha alternative', to: '/alternatives/lusha' },
      { label: 'DataPit vs Apollo', to: '/compare/datapit-vs-apollo' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Guides', to: '/blog' },
      { label: 'Free email verifier', to: '/tools/email-verifier' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
];

/**
 * The back cover: link columns, then the wordmark set at display scale and
 * cropped by the page edge. Deep tone — transparent, so the signal river
 * runs all the way to the last pixel of the book.
 */
export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 text-white">
      <FadeIn as="div" className="mx-auto max-w-[1400px] px-6 pt-20">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <img src="/logos/datapit-logo-dark.svg" alt="DataPit" className="h-8" />
            <p className="mt-4 max-w-[220px] text-sm text-ink-300">
              The B2B contact data platform: search, reveal and outreach on one credit ledger.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">{col.heading}</p>
              <ul className="mt-5 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm font-medium text-ink-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-sm text-ink-500 sm:flex-row sm:items-center">
          <span>&copy; {new Date().getFullYear()} DataPit. All rights reserved.</span>
          <Link to="/login" className="transition-colors hover:text-white">
            Log in
          </Link>
        </div>
      </FadeIn>

      {/* Giant cropped wordmark */}
      <div aria-hidden="true" className="mt-10 overflow-hidden">
        <p className="translate-y-[14%] select-none bg-gradient-brand bg-clip-text text-center text-[clamp(4rem,15.5vw,15rem)] font-extrabold uppercase leading-[0.8] tracking-tight text-transparent">
          DataPit
        </p>
      </div>
    </footer>
  );
}
