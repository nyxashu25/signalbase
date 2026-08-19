import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ProfileMenu } from '../components/ProfileMenu.jsx';
import { ThemeToggle } from '../components/ThemeToggle.jsx';

const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/people', label: 'People' },
  { to: '/app/companies', label: 'Companies' },
  { to: '/app/lists', label: 'Lists' },
  { to: '/app/sequences', label: 'Sequences' },
  { to: '/app/billing', label: 'Billing' },
];

export function AppLayout() {
  const workspace = useSelector((s) => s.auth.workspace);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface text-text">
      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-56 shrink-0 border-r border-border bg-surface-elevated transition-transform duration-200 ease-brand md:static md:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-4">
          <img src="/logos/datapit-logo-light.svg" alt="DataPit" className="h-6" />
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-brand ${
                  isActive
                    ? 'bg-gradient-action text-white'
                    : 'text-text-muted hover:bg-surface hover:text-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-elevated px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={navOpen}
              className="-ml-1.5 shrink-0 rounded-md p-1.5 text-text-muted hover:bg-surface md:hidden"
            >
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
            </button>
            <span className="truncate text-sm font-medium text-text-muted">{workspace?.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
