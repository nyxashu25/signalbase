import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Users,
  Building2,
  ListChecks,
  Send,
  CreditCard,
  UserCircle,
  LifeBuoy,
  BookOpen,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react';
import { ProfileMenu } from '../components/ProfileMenu.jsx';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { Logo } from '../components/Logo.jsx';
import { GuidedTour } from '../components/GuidedTour.jsx';
import { CreditBadge } from '../components/CreditBadge.jsx';
import { NotificationBell } from '../components/app/NotificationBell.jsx';
import { UpgradeCard } from '../components/app/UpgradeCard.jsx';
import { OnboardingCard } from '../components/app/OnboardingCard.jsx';
import { useOnboardingRewards } from '../hooks/useOnboardingRewards.js';
import { CommandPalette, CommandPaletteTrigger } from '../components/app/CommandPalette.jsx';
import { TooltipProvider, Tooltip } from '../components/ui/Tooltip.jsx';
import { ToastProvider } from '../components/ui/toast.jsx';
import { CountPill } from '../components/ui/StatusPill.jsx';
import { useAnsweredTicketsBadge } from '../hooks/useAnsweredTicketsBadge.js';
import { cn } from '../components/ui/cn.js';

// Grouped by job-to-be-done (docs/UX-ROADMAP.md §1.1). Only features that
// actually exist get an entry — no placeholder nav for things we don't
// ship. data-tour ids are load-bearing: GuidedTour spotlights them.
const HOME = { to: '/app', label: 'Home', end: true, icon: LayoutDashboard, tourId: 'nav-dashboard' };

const NAV_GROUPS = [
  {
    key: 'prospect',
    label: 'Prospect',
    items: [
      { to: '/app/people', label: 'People', icon: Users, tourId: 'nav-people' },
      { to: '/app/companies', label: 'Companies', icon: Building2, tourId: 'nav-companies' },
      { to: '/app/lists', label: 'Lists', icon: ListChecks, tourId: 'nav-lists' },
    ],
  },
  {
    key: 'engage',
    label: 'Engage',
    items: [{ to: '/app/sequences', label: 'Sequences', icon: Send, tourId: 'nav-sequences' }],
  },
  {
    key: 'account',
    label: 'Account',
    items: [
      { to: '/app/billing', label: 'Billing', icon: CreditCard, tourId: 'nav-billing' },
      { to: '/app/profile', label: 'Profile', icon: UserCircle },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    items: [
      { to: '/app/tickets', label: 'Tickets', icon: LifeBuoy, tourId: 'nav-tickets', badge: 'tickets' },
      { to: '/app/help', label: 'Help', icon: BookOpen },
    ],
  },
];

const RAIL_KEY = 'dp-nav-rail';
const COLLAPSED_GROUPS_KEY = 'dp-nav-collapsed-groups';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — state still lives in memory for this tab
  }
}

export function AppLayout() {
  const workspace = useSelector((s) => s.auth.workspace);
  const [navOpen, setNavOpen] = useState(false); // mobile drawer
  const [rail, setRail] = useState(() => readJson(RAIL_KEY, false)); // desktop icon-only mode
  const [collapsedGroups, setCollapsedGroups] = useState(() => readJson(COLLAPSED_GROUPS_KEY, []));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const answeredTicketCount = useAnsweredTicketsBadge();

  const toggleRail = useCallback(() => {
    setRail((r) => {
      writeJson(RAIL_KEY, !r);
      return !r;
    });
  }, []);

  function toggleGroup(key) {
    setCollapsedGroups((list) => {
      const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
      writeJson(COLLAPSED_GROUPS_KEY, next);
      return next;
    });
  }

  // Closing the drawer on route change keeps the mobile experience sane; the
  // NavLink onClick below covers the common case and this covers the rest.
  useEffect(() => {
    if (!navOpen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') setNavOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  const badges = { tickets: answeredTicketCount };
  // The drawer on mobile always shows labels; rail mode is desktop-only.
  const showLabels = !rail || navOpen;

  function renderItem(item) {
    const Icon = item.icon;
    const badge = item.badge ? badges[item.badge] : 0;
    const link = (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        data-tour={item.tourId}
        onClick={() => setNavOpen(false)}
        className={({ isActive }) =>
          cn(
            'group relative flex h-9 items-center gap-2.5 rounded-md text-sm font-medium transition-colors duration-150 ease-brand',
            showLabels ? 'px-2.5' : 'justify-center px-0',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-text-muted hover:bg-surface-hover hover:text-text',
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {showLabels && <span className="flex-1 truncate">{item.label}</span>}
        {badge > 0 &&
          (showLabels ? (
            <CountPill tone="accent">{badge > 9 ? '9+' : badge}</CountPill>
          ) : (
            <span
              aria-label={`${badge} new`}
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-surface-elevated"
            />
          ))}
      </NavLink>
    );
    if (showLabels) return link;
    // Radix's asChild trigger merges `className` by string-joining, which
    // would turn NavLink's function className into literal source text — so
    // the tooltip targets a plain block wrapper instead of the link itself.
    return (
      <Tooltip key={item.to} content={item.label} side="right">
        <div>{link}</div>
      </Tooltip>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <ToastProvider>
        <div className="app-shell flex h-screen bg-bg text-text">
          {navOpen && (
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
            />
          )}

          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-border bg-surface-elevated transition-[transform,width] duration-200 ease-brand md:static md:translate-x-0',
              navOpen ? 'translate-x-0' : '-translate-x-full',
              showLabels ? 'w-60' : 'w-[60px]',
            )}
          >
            {/* Brand row + rail toggle */}
            <div
              className={cn(
                'flex h-14 shrink-0 items-center border-b border-border',
                showLabels ? 'justify-between pl-4 pr-2' : 'justify-center',
              )}
            >
              {showLabels ? (
                <Logo className="h-7 w-auto" />
              ) : (
                <img src="/logos/datapit-mark.svg" alt="DataPit" className="h-6 w-6" />
              )}
              <Tooltip content={rail ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
                <button
                  type="button"
                  onClick={toggleRail}
                  aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
                  className={cn(
                    'hidden h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover hover:text-text md:flex',
                    !showLabels && 'absolute -right-3.5 top-3 border border-border bg-surface-elevated shadow-sm',
                  )}
                >
                  {rail ? (
                    <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </Tooltip>
            </div>

            <nav className={cn('flex-1 overflow-y-auto py-3', showLabels ? 'px-3' : 'px-2')} aria-label="Primary">
              <div className="flex flex-col gap-0.5">{renderItem(HOME)}</div>

              {NAV_GROUPS.map((group) => {
                const collapsed = collapsedGroups.includes(group.key);
                return (
                  <div key={group.key} className="mt-4">
                    {showLabels ? (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        aria-expanded={!collapsed}
                        className="mb-1 flex w-full items-center justify-between rounded-sm px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-text-muted/80 hover:text-text"
                      >
                        {group.label}
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 transition-transform', collapsed && '-rotate-90')}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <div className="mx-2 mb-2 h-px bg-border" aria-hidden="true" />
                    )}
                    {(!collapsed || !showLabels) && (
                      <div className="flex flex-col gap-0.5">{group.items.map(renderItem)}</div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className={cn('flex shrink-0 flex-col gap-2 border-t border-border', showLabels ? 'p-3' : 'py-3')}>
              <OnboardingCard collapsed={!showLabels} />
              <UpgradeCard collapsed={!showLabels} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface-elevated px-3 sm:px-5">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open navigation"
                aria-expanded={navOpen}
                className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-hover md:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <span className="hidden max-w-[200px] truncate text-sm font-semibold text-text lg:block">
                {workspace?.name}
              </span>

              <div className="flex flex-1 justify-center px-2">
                <CommandPaletteTrigger onClick={() => setPaletteOpen(true)} />
              </div>

              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <CreditBadge />
                <NotificationBell />
                <span data-tour="theme-toggle" className="inline-flex">
                  <ThemeToggle />
                </span>
                <span data-tour="profile-menu" className="inline-flex">
                  <ProfileMenu />
                </span>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-6">
                <Outlet />
              </div>
            </main>
          </div>

          <GuidedTour />
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
          <OnboardingRewardToasts />
        </div>
      </ToastProvider>
    </TooltipProvider>
  );
}

// Has to live *inside* ToastProvider (the hook toasts), hence not a plain
// hook call in AppLayout itself.
function OnboardingRewardToasts() {
  useOnboardingRewards();
  return null;
}
