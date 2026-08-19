import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function MarketingNav() {
  const status = useSelector((s) => s.auth.status);
  const isAuthenticated = status === 'authenticated';

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface-elevated/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <Link to="/">
          <img src="/logos/datapit-logo-light.svg" alt="DataPit" className="h-6" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-text-muted md:flex">
          <a href="/#product" className="transition-colors hover:text-text">
            Product
          </a>
          <Link to="/pricing" className="transition-colors hover:text-text">
            Pricing
          </Link>
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
                to="/login"
                className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
