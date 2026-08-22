import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ProfileMenu } from '../components/ProfileMenu.jsx';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { Logo } from '../components/Logo.jsx';
import { GuidedTour } from '../components/GuidedTour.jsx';
import { CreditBadge } from '../components/CreditBadge.jsx';
import { useAnsweredTicketsBadge } from '../hooks/useAnsweredTicketsBadge.js';

const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', end: true, tourId: 'nav-dashboard' },
  { to: '/app/people', label: 'People', tourId: 'nav-people' },
  { to: '/app/companies', label: 'Companies', tourId: 'nav-companies' },
  { to: '/app/lists', label: 'Lists', tourId: 'nav-lists' },
  { to: '/app/sequences', label: 'Sequences', tourId: 'nav-sequences' },
  { to: '/app/billing', label: 'Billing', tourId: 'nav-billing' },
];

export function AppLayout() {
  const workspace = useSelector((s) => s.auth.workspace);
  const [navOpen, setNavOpen] = useState(false);
  const answeredTicketCount = useAnsweredTicketsBadge();

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
        className={`fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-border bg-surface-elevated transition-transform duration-200 ease-brand md:static md:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-4">
          <Logo className="h-[40px] w-[120px] object-contain" />
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-tour={item.tourId}
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
        <nav className="mt-auto flex flex-col gap-1 border-t border-border px-2 py-2">
          <NavLink
            to="/app/tickets"
            data-tour="nav-tickets"
            onClick={() => setNavOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-brand ${
                isActive
                  ? 'bg-gradient-action text-white'
                  : 'text-text-muted hover:bg-surface hover:text-text'
              }`
            }
          >
            <TicketIcon />
            Tickets
            {answeredTicketCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-none text-white">
                {answeredTicketCount > 9 ? '9+' : answeredTicketCount}
              </span>
            )}
          </NavLink>
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
          <div className="flex shrink-0 items-center gap-2">
            <CreditBadge />
            <span data-tour="theme-toggle" className="inline-flex">
              <ThemeToggle />
            </span>
            <span data-tour="profile-menu" className="inline-flex">
              <ProfileMenu />
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <GuidedTour />
    </div>
  );
}

function TicketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 7v10" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}
