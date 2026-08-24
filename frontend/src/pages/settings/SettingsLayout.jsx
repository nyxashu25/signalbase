import { NavLink, Outlet } from 'react-router-dom';
import { UserCircle, Building2, Users, ShieldCheck, Bell, Plug, KeyRound } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { cn } from '../../components/ui/cn.js';

// docs/UX-ROADMAP.md Phase 5: one settings area with a left sub-nav. Each
// section is its own route so it's linkable (/app/settings/security) and so
// the command palette can jump straight to one.
export const SETTINGS_SECTIONS = [
  { to: '/app/settings/profile', label: 'Profile', icon: UserCircle, keywords: 'name account' },
  { to: '/app/settings/workspace', label: 'Workspace', icon: Building2, keywords: 'plan rename' },
  { to: '/app/settings/members', label: 'Users & teams', icon: Users, keywords: 'seats invite members' },
  { to: '/app/settings/security', label: 'Security', icon: ShieldCheck, keywords: 'password google' },
  { to: '/app/settings/notifications', label: 'Notifications', icon: Bell, keywords: 'email marketing opt out' },
  { to: '/app/settings/integrations', label: 'Integrations', icon: Plug, keywords: 'crm export' },
  { to: '/app/settings/api', label: 'API & Extension', icon: KeyRound, keywords: 'api key chrome extension linkedin' },
];

export function SettingsLayout() {
  return (
    <div>
      <PageHeader title="Settings" description="Your account, your workspace, and how DataPit talks to you." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-4 lg:self-start">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {SETTINGS_SECTIONS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-hover hover:text-text',
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 max-w-3xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// Shared section chrome so every settings page reads the same.
export function SettingsSection({ title, description, children, footer }) {
  return (
    <section className="rounded-lg border border-border bg-surface-elevated">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-bold text-text">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
    </section>
  );
}
