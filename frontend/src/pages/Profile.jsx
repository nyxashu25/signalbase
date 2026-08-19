import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useGetBillingSummaryQuery } from '../api/billingApi.js';
import { useLogoutMutation } from '../api/authApi.js';
import { clearSession } from '../store/authSlice.js';

export function Profile() {
  const user = useSelector((s) => s.auth.user);
  const workspace = useSelector((s) => s.auth.workspace);
  const role = useSelector((s) => s.auth.role);
  const { data: summary, isLoading } = useGetBillingSummaryQuery();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      dispatch(clearSession());
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold text-text">Profile</h1>

      <div className="mt-6 rounded-lg border border-border bg-surface-elevated p-6 shadow-dp">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-action text-lg font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-base font-bold text-text">{user?.name}</p>
            <p className="text-sm text-text-muted">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-muted">
              Organization
            </dt>
            <dd className="mt-1 text-sm font-semibold text-text">{workspace?.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-muted">Role</dt>
            <dd className="mt-1 text-sm font-semibold text-text">{role}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-muted">
              Credits used
            </dt>
            <dd className="mt-1 text-sm font-semibold text-text">
              {isLoading ? '—' : summary?.creditsUsed}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-text-muted">
              Credits remaining
            </dt>
            <dd className="mt-1 text-sm font-semibold text-text">
              {isLoading ? '—' : summary?.balance}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
          <Link
            to="/app/billing/add-credits"
            className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px"
          >
            Add credits
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-border px-4 py-2 text-sm font-bold text-red-600 hover:bg-surface"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
