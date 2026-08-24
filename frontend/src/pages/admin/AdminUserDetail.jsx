import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useGetAdminUserDetailQuery,
  useSuspendAdminUserMutation,
  useUnsuspendAdminUserMutation,
  useAddAdminUserCreditsMutation,
  useUpdateAdminUserPlanMutation,
} from '../../api/adminDataApi.js';

const PLANS = ['FREE', 'BASIC', 'PROFESSIONAL', 'ORGANIZATION'];
const PLAN_LABELS = {
  FREE: 'Free',
  BASIC: 'Basic',
  PROFESSIONAL: 'Professional',
  ORGANIZATION: 'Organization',
};

export function AdminUserDetail() {
  const { userId } = useParams();
  const { data: user, isLoading } = useGetAdminUserDetailQuery(userId);
  const [suspend, { isLoading: suspending }] = useSuspendAdminUserMutation();
  const [unsuspend, { isLoading: unsuspending }] = useUnsuspendAdminUserMutation();
  const [addCredits, { isLoading: addingCredits }] = useAddAdminUserCreditsMutation();
  const [updatePlan, { isLoading: updatingPlan }] = useUpdateAdminUserPlanMutation();
  const [amount, setAmount] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [planFeedback, setPlanFeedback] = useState(null);

  async function handleAddCredits(e) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed === 0) return;
    const result = await addCredits({ userId, amount: parsed }).unwrap();
    setAmount('');
    setFeedback(`New balance: ${result.balance} credits`);
  }

  const [seatsDraft, setSeatsDraft] = useState('');

  async function handleSeatsApply() {
    const seats = Number(seatsDraft);
    if (!Number.isInteger(seats) || seats < 1) return;
    const result = await updatePlan({ userId, plan: user.workspace.plan, seats }).unwrap();
    setSeatsDraft('');
    setPlanFeedback(
      `Now ${result.seats} ${result.seats === 1 ? 'seat' : 'seats'} on ${PLAN_LABELS[result.plan]} — ${result.monthlyCreditGrant} credits/month`,
    );
  }

  async function handlePlanChange(e) {
    const plan = e.target.value;
    if (plan === user.workspace.plan) return;
    const result = await updatePlan({ userId, plan }).unwrap();
    setPlanFeedback(
      `Now on ${PLAN_LABELS[result.plan]} — ${result.monthlyCreditGrant} credits/month`,
    );
  }

  if (isLoading || !user) {
    return <p className="text-sm text-ink-300">Loading…</p>;
  }

  return (
    <div className="max-w-xl">
      <Link to="/control/users" className="text-sm font-medium text-mauve-magic hover:underline">
        &larr; Back to users
      </Link>

      <div className="mt-4 rounded-lg border border-white/10 bg-ink-900 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-white">{user.name}</p>
            <p className="text-sm text-ink-300">{user.email}</p>
          </div>
          {user.suspendedAt ? (
            <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400">
              Suspended
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
              Active
            </span>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Organization</dt>
            <dd className="mt-1 text-sm font-semibold text-white">{user.workspace.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Role</dt>
            <dd className="mt-1 text-sm font-semibold text-white">{user.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Plan</dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              {PLAN_LABELS[user.workspace.plan]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">
              Monthly grant
            </dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              {user.workspace.monthlyCreditGrant} credits
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Credits used</dt>
            <dd className="mt-1 text-sm font-semibold text-white">{user.creditsUsed}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">
              Credits remaining
            </dt>
            <dd className="mt-1 text-sm font-semibold text-white">{user.balance}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-300">Add credits</p>
          <p className="mt-1 text-xs text-ink-300">
            Grants any amount instantly, recorded as an ADJUSTMENT — not a payment.
          </p>
          <form onSubmit={handleAddCredits} className="mt-3 flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500 or -100"
              className="h-10 flex-1 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-neon-violet"
            />
            <button
              type="submit"
              disabled={addingCredits}
              className="rounded-md bg-gradient-action px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Apply
            </button>
          </form>
          {feedback && <p className="mt-2 text-xs text-emerald-400">{feedback}</p>}
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-300">Plan</p>
          <p className="mt-1 text-xs text-ink-300">
            Support override — changes the plan and its monthly credit grant instantly, without
            touching Stripe or the current balance.
          </p>
          <select
            value={user.workspace.plan}
            onChange={handlePlanChange}
            disabled={updatingPlan}
            className="mt-3 h-10 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-neon-violet disabled:opacity-50"
          >
            {PLANS.map((plan) => (
              <option key={plan} value={plan} className="bg-ink-900">
                {PLAN_LABELS[plan]}
              </option>
            ))}
          </select>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={seatsDraft}
              onChange={(e) => setSeatsDraft(e.target.value)}
              placeholder={`Seats (now ${user.workspace.seats ?? 1})`}
              aria-label="Seats"
              className="w-40 rounded-md border border-white/15 bg-ink-950 px-3 py-2 text-sm text-white placeholder:text-ink-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSeatsApply}
              disabled={updatingPlan || !seatsDraft}
              className="rounded-md border border-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-40"
            >
              Set seats
            </button>
          </div>
          {planFeedback && <p className="mt-2 text-xs text-emerald-400">{planFeedback}</p>}
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          {user.suspendedAt ? (
            <button
              type="button"
              disabled={unsuspending}
              onClick={() => unsuspend(userId)}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-white/5"
            >
              Unsuspend user
            </button>
          ) : (
            <button
              type="button"
              disabled={suspending}
              onClick={() => suspend(userId)}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-red-400 hover:bg-white/5"
            >
              Suspend user
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
