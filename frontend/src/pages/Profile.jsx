import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Coins, LogOut } from 'lucide-react';
import { useGetBillingSummaryQuery } from '../api/billingApi.js';
import { useLogoutMutation } from '../api/authApi.js';
import { clearSession } from '../store/authSlice.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LetterAvatar } from '../components/ui/LetterAvatar.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';

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
    <div className="max-w-2xl">
      <PageHeader title="Profile" description="Your account and workspace details." />

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <LetterAvatar name={user?.name ?? '?'} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-text">{user?.name}</p>
            <p className="truncate text-sm text-text-muted">{user?.email}</p>
          </div>
          {role && (
            <StatusPill tone="accent" className="ml-auto">
              {role}
            </StatusPill>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
          <Field label="Workspace" value={workspace?.name} />
          <Field label="Plan" value={summary?.plan} />
          <Field label="Credits used" value={isLoading ? '—' : summary?.creditsUsed} />
          <Field label="Credits remaining" value={isLoading ? '—' : summary?.balance} />
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-6">
          <Button variant="primary" icon={Coins} to="/app/billing/add-credits">
            Add credits
          </Button>
          <Button variant="danger" icon={LogOut} onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-text">{value ?? '—'}</dd>
    </div>
  );
}
