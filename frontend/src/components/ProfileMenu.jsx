import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useLogoutMutation } from '../api/authApi.js';
import { clearSession } from '../store/authSlice.js';
import { RabbitAvatar } from './RabbitAvatar.jsx';

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const user = useSelector((s) => s.auth.user);
  const workspace = useSelector((s) => s.auth.workspace);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-action text-white transition-transform duration-150 ease-brand hover:-translate-y-px"
      >
        <RabbitAvatar className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-56 rounded-lg border border-border bg-surface-elevated p-1.5 shadow-dp-md">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold text-text">{user?.name}</p>
            <p className="truncate text-xs text-text-muted">{workspace?.name}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            to="/app/profile"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 text-sm font-medium text-text hover:bg-surface"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-surface"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
