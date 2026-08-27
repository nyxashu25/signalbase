import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useGetAdminUserDetailQuery,
  useSuspendAdminUserMutation,
  useUnsuspendAdminUserMutation,
  useAdjustAdminUserCreditsMutation,
  useUpdateAdminUserPlanMutation,
  useDeleteAdminUserMutation,
  useRestoreAdminUserMutation,
  useSuspendAdminWorkspaceMutation,
  useUnsuspendAdminWorkspaceMutation,
  useDeleteAdminWorkspaceMutation,
  useRestoreAdminWorkspaceMutation,
} from '../../api/adminDataApi.js';

const PLANS = ['FREE', 'BASIC', 'PROFESSIONAL', 'ORGANIZATION'];
const PLAN_LABELS = {
  FREE: 'Free',
  BASIC: 'Basic',
  PROFESSIONAL: 'Professional',
  ORGANIZATION: 'Organization',
};
const MODE_LABELS = { add: 'Add', remove: 'Remove', set: 'Set to' };

export function AdminUserDetail() {
  const { userId } = useParams();
  const { data: user, isLoading } = useGetAdminUserDetailQuery(userId);
  const [suspend, { isLoading: suspending }] = useSuspendAdminUserMutation();
  const [unsuspend, { isLoading: unsuspending }] = useUnsuspendAdminUserMutation();
  const [adjustCredits, { isLoading: adjustingCredits }] = useAdjustAdminUserCreditsMutation();
  const [updatePlan, { isLoading: updatingPlan }] = useUpdateAdminUserPlanMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteAdminUserMutation();
  const [restoreUser, { isLoading: restoring }] = useRestoreAdminUserMutation();
  const [suspendWorkspace] = useSuspendAdminWorkspaceMutation();
  const [unsuspendWorkspace] = useUnsuspendAdminWorkspaceMutation();
  const [deleteWorkspace] = useDeleteAdminWorkspaceMutation();
  const [restoreWorkspace] = useRestoreAdminWorkspaceMutation();
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [planFeedback, setPlanFeedback] = useState(null);
  const [blocksDraft, setBlocksDraft] = useState('');

  async function handleAdjustCredits(e) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed < 0) return;
    const result = await adjustCredits({ userId, mode, amount: parsed }).unwrap();
    setAmount('');
    setFeedback(
      `${MODE_LABELS[mode]} ${parsed} applied (${result.delta >= 0 ? '+' : ''}${result.delta}) — new balance: ${result.balance} credits`,
    );
  }

  async function handleBlocksApply() {
    const blocks = Number(blocksDraft);
    if (!Number.isInteger(blocks) || blocks < 1) return;
    const result = await updatePlan({ userId, plan: user.workspace.plan, blocks }).unwrap();
    setBlocksDraft('');
    setPlanFeedback(
      `Now ${result.blocks} ${result.blocks === 1 ? 'block' : 'blocks'} on ${PLAN_LABELS[result.plan]} — ${result.capacity.paid} paid + ${result.capacity.free} free seats`,
    );
  }

  async function handlePlanChange(e) {
    const plan = e.target.value;
    if (plan === user.workspace.plan) return;
    const result = await updatePlan({ userId, plan }).unwrap();
    setPlanFeedback(
      plan === 'FREE'
        ? `Now on ${PLAN_LABELS[result.plan]}`
        : `Now on ${PLAN_LABELS[result.plan]} — ${result.blocks} ${result.blocks === 1 ? 'block' : 'blocks'} (${result.capacity.paid} paid + ${result.capacity.free} free seats)`,
    );
  }

  async function handleDeleteUser() {
    const sure = window.confirm(
      `Soft-delete ${user.name}? They can't log in; you can restore them from the Deleted section for 60 days, after which they're permanently purged.`,
    );
    if (sure) await deleteUser(userId);
  }

  async function handleDeleteWorkspace() {
    const sure = window.confirm(
      `Soft-delete the whole workspace "${user.workspace.name}"? Every member loses access; restorable from the Deleted section for 60 days, then permanently purged.`,
    );
    if (sure) await deleteWorkspace(user.workspace.id);
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
          <div className="flex items-center gap-2">
            {user.deletedAt ? (
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400">
                Deleted
              </span>
            ) : user.suspendedAt ? (
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400">
                Suspended
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                Active
              </span>
            )}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Organization</dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              {user.workspace?.name ?? '— (no workspace)'}
              {user.workspace?.suspendedAt && (
                <span className="ml-2 text-xs font-bold text-amber-400">SUSPENDED</span>
              )}
              {user.workspace?.deletedAt && (
                <span className="ml-2 text-xs font-bold text-red-400">DELETED</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Role</dt>
            <dd className="mt-1 text-sm font-semibold text-white">{user.role ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Plan</dt>
            <dd className="mt-1 text-sm font-semibold text-white">
              {user.workspace ? PLAN_LABELS[user.workspace.plan] : '—'}
              {user.workspace?.blocks > 0 && (
                <span className="ml-1.5 text-xs font-medium text-ink-300">
                  · {user.workspace.blocks} {user.workspace.blocks === 1 ? 'block' : 'blocks'}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">Credits used</dt>
            <dd className="mt-1 text-sm font-semibold text-white">{user.creditsUsed}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-ink-300">
              Personal balance
            </dt>
            <dd className="mt-1 text-sm font-semibold text-white">{user.balance}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-white/10 pt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-300">
            Adjust personal credits
          </p>
          <p className="mt-1 text-xs text-ink-300">
            Add grants, Remove deducts (never below zero), Set moves the balance to an exact
            figure — every change lands in the ledger as an ADJUSTMENT and in the audit log.
          </p>
          <form onSubmit={handleAdjustCredits} className="mt-3 flex gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              aria-label="Adjustment mode"
              className="h-10 rounded-md border border-white/15 bg-white/5 px-2 text-sm text-white outline-none focus:border-neon-violet"
            >
              <option value="add" className="bg-ink-900">Add</option>
              <option value="remove" className="bg-ink-900">Remove</option>
              <option value="set" className="bg-ink-900">Set to</option>
            </select>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="h-10 flex-1 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-white outline-none focus:border-neon-violet"
            />
            <button
              type="submit"
              disabled={adjustingCredits}
              className="rounded-md bg-gradient-action px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Apply
            </button>
          </form>
          {feedback && <p className="mt-2 text-xs text-emerald-400">{feedback}</p>}
        </div>

        {user.workspace && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-300">Plan</p>
            <p className="mt-1 text-xs text-ink-300">
              Support override — changes the plan (and its seat blocks) instantly, without touching
              Stripe. Pending members activate into the granted seats.
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
                value={blocksDraft}
                onChange={(e) => setBlocksDraft(e.target.value)}
                placeholder={`Blocks (now ${user.workspace.blocks ?? 0})`}
                aria-label="Blocks"
                className="w-40 rounded-md border border-white/15 bg-ink-950 px-3 py-2 text-sm text-white placeholder:text-ink-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBlocksApply}
                disabled={updatingPlan || !blocksDraft}
                className="rounded-md border border-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-40"
              >
                Set blocks
              </button>
            </div>
            {planFeedback && <p className="mt-2 text-xs text-emerald-400">{planFeedback}</p>}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-6">
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
          {user.deletedAt ? (
            <button
              type="button"
              disabled={restoring}
              onClick={() => restoreUser(userId)}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-white/5"
            >
              Restore user
            </button>
          ) : (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteUser}
              className="rounded-md border border-red-500/40 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10"
            >
              Delete user
            </button>
          )}
        </div>

        {user.workspace && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            {user.workspace.suspendedAt ? (
              <button
                type="button"
                onClick={() => unsuspendWorkspace(user.workspace.id)}
                className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-white/5"
              >
                Unsuspend workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={() => suspendWorkspace(user.workspace.id)}
                className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-amber-400 hover:bg-white/5"
              >
                Suspend workspace
              </button>
            )}
            {user.workspace.deletedAt ? (
              <button
                type="button"
                onClick={() => restoreWorkspace(user.workspace.id)}
                className="rounded-md border border-white/15 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-white/5"
              >
                Restore workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDeleteWorkspace}
                className="rounded-md border border-red-500/40 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10"
              >
                Delete workspace
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
