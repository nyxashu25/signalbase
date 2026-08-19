import { NavLink, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ProfileMenu } from '../components/ProfileMenu.jsx';

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

  return (
    <div className="flex h-screen bg-surface text-text">
      <aside className="w-56 shrink-0 border-r border-border bg-surface-elevated">
        <div className="px-4 py-4">
          <img src="/logos/datapit-logo-light.svg" alt="DataPit" className="h-6" />
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface-elevated px-6">
          <span className="text-sm font-medium text-text-muted">{workspace?.name}</span>
          <ProfileMenu />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
