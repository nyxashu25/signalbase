import { Link } from 'react-router-dom';

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-4 px-6 py-10 text-sm text-text-muted sm:flex-row sm:justify-between">
        <img src="/logos/datapit-logo-light.svg" alt="DataPit" className="h-5 opacity-80" />
        <nav className="flex items-center gap-6">
          <Link to="/pricing" className="hover:text-text">
            Pricing
          </Link>
          <Link to="/login" className="hover:text-text">
            Log in
          </Link>
        </nav>
        <span>&copy; {new Date().getFullYear()} DataPit. All rights reserved.</span>
      </div>
    </footer>
  );
}
