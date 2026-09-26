import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeToggle } from '../ThemeToggle.jsx';

const LINKS = [
  { to: '/product', label: 'Product' },
  { to: '/solutions', label: 'Solutions' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
];

// Warm a page's lazy chunk the moment its link is hovered or focused, so the
// 3D page turn (MarketingLayout) reveals content rather than a blank sheet.
// These are the same module specifiers App.jsx lazy-loads, so Vite dedupes
// them into the same chunks.
const PREFETCH = {
  '/': () => import('../../pages/marketing/Home.jsx'),
  '/product': () => import('../../pages/marketing/Product.jsx'),
  '/solutions': () => import('../../pages/marketing/Solutions.jsx'),
  '/pricing': () => import('../../pages/marketing/Pricing.jsx'),
  '/about': () => import('../../pages/marketing/About.jsx'),
  '/contact': () => import('../../pages/marketing/Contact.jsx'),
};
const prefetched = new Set();
function prefetch(to) {
  if (prefetched.has(to) || !PREFETCH[to]) return;
  prefetched.add(to);
  PREFETCH[to]().catch(() => prefetched.delete(to));
}

// The nav is the book's desk lamp: always dark glass, whatever the theme,
// because every cover beneath it is dark. Overriding the semantic tokens
// inline means the ThemeToggle and any token-driven child resolve to their
// dark-mode values here without a second theme.
const DARK_CHROME = {
  '--dp-text-rgb': '255 255 255',
  '--dp-text-muted-rgb': '186 175 192',
  '--dp-surface-rgb': '20 0 29',
  '--dp-surface-hover-rgb': '38 6 58',
  '--dp-border-rgb': '60 21 81',
};

export function MarketingNav() {
  const status = useSelector((s) => s.auth.status);
  const isAuthenticated = status === 'authenticated';
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5" style={DARK_CHROME}>
      <div className="mx-auto max-w-[1280px] rounded-xl border border-white/10 bg-ink-950/75 shadow-[0_18px_50px_rgba(17,0,25,0.45)] backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" onClick={() => setMenuOpen(false)} onMouseEnter={() => prefetch('/')} className="flex items-center">
            <img src="/logos/datapit-logo-dark.svg" alt="DataPit" className="h-11" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            {LINKS.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onMouseEnter={() => prefetch(link.to)}
                  onFocus={() => prefetch(link.to)}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative py-1 transition-colors ${active ? 'text-white' : 'text-ink-300 hover:text-white'}`}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 left-0 h-px bg-gradient-action transition-all duration-200 ease-brand ${
                      active ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link
                to="/app"
                className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.35)] transition-transform duration-150 ease-brand hover:-translate-y-px"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden text-sm font-semibold text-ink-300 transition-colors hover:text-white sm:block"
                >
                  Log in
                </Link>
                <Link
                  to="/login?mode=register"
                  className="whitespace-nowrap rounded-md bg-gradient-action px-3 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.35)] transition-transform duration-150 ease-brand hover:-translate-y-px sm:px-4"
                >
                  Start free
                </Link>
              </>
            )}

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="rounded-md p-1.5 text-ink-300 hover:bg-white/5 hover:text-white md:hidden"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 text-sm font-medium text-ink-300 md:hidden">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2.5 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2.5 transition-colors hover:bg-white/5 hover:text-white"
            >
              Contact
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2.5 transition-colors hover:bg-white/5 hover:text-white"
              >
                Log in
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
