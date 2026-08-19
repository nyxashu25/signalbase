import { Link } from 'react-router-dom';
import { Logo } from '../Logo.jsx';

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

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Logo className="h-6 opacity-90" />
            <p className="mt-4 max-w-[200px] text-sm text-text-muted">
              Search, reveal, and outreach on one credit ledger.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                {col.heading}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-text-muted hover:text-text">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-text-muted sm:flex-row">
          <span>&copy; {new Date().getFullYear()} DataPit. All rights reserved.</span>
          <Link to="/login" className="hover:text-text">
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}
