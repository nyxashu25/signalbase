import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAdminSession } from '../store/adminAuthSlice.js';
import { useTicketNotifications } from '../hooks/useTicketNotifications.js';

const NAV_ITEMS = [
  { to: '/control', label: 'Overview', end: true },
  { to: '/control/users', label: 'Users' },
  { to: '/control/billing', label: 'Billing' },
  { to: '/control/extend-database', label: 'Extend database' },
  { to: '/control/audit-log', label: 'Audit log' },
  { to: '/control/settings', label: 'Settings' },
];

export function AdminLayout() {
  const admin = useSelector((s) => s.adminAuth.admin);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const { unansweredCount } = useTicketNotifications();
  const [notifyPermission, setNotifyPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  );

  function handleLogout() {
    dispatch(clearAdminSession());
    navigate('/control/login', { replace: true });
  }

  function handleEnableNotifications() {
    Notification.requestPermission().then(setNotifyPermission);
  }

  return (
    <div className="flex h-screen bg-ink-950 text-white">
      {navOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-white/10 bg-ink-900 transition-transform duration-200 ease-brand md:static md:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-4">
          <p className="text-sm font-bold tracking-tight text-white">DataPit</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-mauve-magic">Control</p>
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
                  isActive ? 'bg-gradient-action text-white' : 'text-ink-300 hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col gap-1 border-t border-white/10 px-2 py-2">
          <NavLink
            to="/control/tickets"
            onClick={() => setNavOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-brand ${
                isActive ? 'bg-gradient-action text-white' : 'text-ink-300 hover:bg-white/5'
              }`
            }
          >
            <span>Tickets</span>
            {unansweredCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unansweredCount}
              </span>
            )}
          </NavLink>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-ink-900 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={navOpen}
              className="-ml-1.5 shrink-0 rounded-md p-1.5 text-ink-300 hover:bg-white/5 md:hidden"
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
            <span className="truncate text-sm font-medium text-ink-300">{admin?.email}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {notifyPermission === 'default' && (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/5"
              >
                Enable ticket notifications
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-ink-950 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
