import { Link } from 'react-router-dom';
import { FadeIn } from './motion.jsx';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Product', to: '/product' },
      { label: 'Solutions', to: '/solutions' },
      { label: 'Pricing', to: '/pricing' },
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
 * Editorial dark footer: link columns up top, then the wordmark set at
 * display scale and cropped by the page edge — the signature closing move
 * of the reference sites this design borrows from. Always dark regardless
 * of theme, matching the GiantCTA band that precedes it on every page.
 */
export function MarketingFooter() {
  return (
    <footer className="overflow-hidden border-t border-white/10 bg-ink-950 text-white">
      <FadeIn as="div" className="mx-auto max-w-[1400px] px-6 pt-20">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <img src="/logos/datapit-logo-dark.svg" alt="DataPit" className="h-6" />
            <p className="mt-4 max-w-[220px] text-sm text-ink-300">
              Search, reveal, and outreach on one credit ledger.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
                {col.heading}
              </p>
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
