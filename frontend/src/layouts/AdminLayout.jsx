import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAdminSession } from '../store/adminAuthSlice.js';

const NAV_ITEMS = [
  { to: '/control', label: 'Overview', end: true },
  { to: '/control/users', label: 'Users' },
  { to: '/control/billing', label: 'Billing' },
  { to: '/control/settings', label: 'Settings' },
];

export function AdminLayout() {
  const admin = useSelector((s) => s.adminAuth.admin);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  function handleLogout() {
    dispatch(clearAdminSession());
    navigate('/control/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-ink-950 text-white">
      <aside className="w-56 shrink-0 border-r border-white/10 bg-ink-900">
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
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-ink-900 px-6">
          <span className="text-sm font-medium text-ink-300">{admin?.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/5"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 overflow-y-auto bg-ink-950 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
