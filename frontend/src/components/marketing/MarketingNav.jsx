import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeToggle } from '../ThemeToggle.jsx';
import { Logo } from '../Logo.jsx';

const LINKS = [
  { to: '/product', label: 'Product' },
  { to: '/solutions', label: 'Solutions' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
];

export function MarketingNav() {
  const status = useSelector((s) => s.auth.status);
  const isAuthenticated = status === 'authenticated';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-elevated/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Link to="/" onClick={() => setMenuOpen(false)}>
          <Logo className="h-8" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-text-muted md:flex">
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="transition-colors hover:text-text">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/app"
              className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-semibold text-text-muted transition-colors hover:text-text sm:block"
              >
                Log in
              </Link>
              <Link
                to="/login?mode=register"
                className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px"
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
            className="rounded-md p-1.5 text-text-muted hover:bg-surface md:hidden"
          >
            {menuOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-3 text-sm font-medium text-text-muted md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2.5 transition-colors hover:bg-surface hover:text-text"
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated && (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-2 py-2.5 transition-colors hover:bg-surface hover:text-text"
            >
              Log in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
