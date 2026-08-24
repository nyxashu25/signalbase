import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { UserCircle, Settings, CreditCard, LifeBuoy, LogOut, ChevronDown, Check, Building2 } from 'lucide-react';
import { useLogoutMutation, useListMyWorkspacesQuery, useSwitchWorkspaceMutation } from '../api/authApi.js';
import { setSession, clearSession } from '../store/authSlice.js';
import { LetterAvatar } from './ui/LetterAvatar.jsx';

const ITEMS = [
  { to: '/app/settings/profile', label: 'Profile', icon: UserCircle },
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/billing', label: 'Billing & plan', icon: CreditCard },
  { to: '/app/tickets', label: 'Support', icon: LifeBuoy },
];

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const user = useSelector((s) => s.auth.user);
  const workspace = useSelector((s) => s.auth.workspace);
  const role = useSelector((s) => s.auth.role);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  // Multi-workspace users (seat invites) get a switcher; everyone else
  // has exactly one entry, so the section stays hidden.
  const { data: workspaces } = useListMyWorkspacesQuery();
  const [switchWorkspace, { isLoading: switching }] = useSwitchWorkspaceMutation();

  async function handleSwitch(target) {
    if (target.current || switching) return;
    try {
      const result = await switchWorkspace({ workspaceId: target.id }).unwrap();
      dispatch(setSession(result));
      setOpen(false);
      navigate('/app', { replace: true });
    } catch {
      // Membership may have been revoked since the list loaded — the list
      // refetches on the next open and the current session is untouched.
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      dispatch(clearSession());
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Account menu for ${user?.name ?? 'your account'}`}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex h-9 items-center gap-1.5 rounded-md pl-1 pr-1.5 transition-colors hover:bg-surface-hover ${open ? 'bg-surface-hover' : ''}`}
      >
        <LetterAvatar name={user?.name ?? '?'} size="md" />
        <ChevronDown className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div className="dp-pop-in absolute right-0 top-11 z-30 w-60 rounded-lg border border-border bg-surface-elevated p-1.5 shadow-dp-md">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-bold text-text">{user?.name}</p>
            <p className="truncate text-xs text-text-muted">{user?.email}</p>
            <p className="mt-1.5 truncate text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {workspace?.name}
              {role && <span className="font-medium normal-case tracking-normal"> · {role}</span>}
            </p>
          </div>
          {workspaces && workspaces.length > 1 && (
            <>
              <div className="my-1 h-px bg-border" />
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Switch workspace
              </p>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  disabled={switching}
                  onClick={() => handleSwitch(w)}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{w.name}</span>
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-text-muted">
                      {w.role}
                    </span>
                  </span>
                  {w.current && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              ))}
            </>
          )}
          <div className="my-1 h-px bg-border" />
          {ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-medium text-text hover:bg-surface-hover"
            >
              <item.icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
