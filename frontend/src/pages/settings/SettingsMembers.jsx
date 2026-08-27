import { useState } from 'react';
import { useSelector } from 'react-redux';
import { UserPlus, X, Copy, Check, Mail, Send, Trash2 } from 'lucide-react';
import {
  useListWorkspaceMembersQuery,
  useListInvitesQuery,
  useCreateInviteMutation,
  useBulkInviteMutation,
  useRevokeInviteMutation,
  useChangeMemberRoleMutation,
  useAssignSeatMutation,
  useRemoveMemberMutation,
  useTransferCreditsMutation,
  useGetTeamAuditQuery,
} from '../../api/workspaceApi.js';
import { ExportCsvButton } from '../../components/ExportCsvButton.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Banner } from '../../components/ui/Banner.jsx';
import { FormField, inputClass } from '../../components/ui/FormField.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../../components/ui/Card.jsx';
import { LetterAvatar } from '../../components/ui/LetterAvatar.jsx';
import { StatusPill } from '../../components/ui/StatusPill.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Tooltip } from '../../components/ui/Tooltip.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

const ROLE_TONE = { OWNER: 'accent', ADMIN: 'info', MEMBER: 'neutral' };
const ROLE_HINT = {
  OWNER: 'Full control, including billing and deleting the workspace.',
  ADMIN: 'Can manage lists, sequences, members and workspace settings.',
  MEMBER: 'Can search, reveal, build lists and run sequences.',
};
const CAN_INVITE = new Set(['OWNER', 'ADMIN']);

const SEAT_TONE = { PAID: 'success', FREE: 'info', PENDING: 'warning' };
const SEAT_LABEL = { PAID: 'Paid seat', FREE: 'Free seat', PENDING: 'Awaiting payment' };
const SEAT_HINT = {
  PAID: 'Occupies a paid seat - earns the plan rate in personal credits every month.',
  FREE: 'Occupies a bonus free seat - earns 1,500 personal credits every month.',
  PENDING:
    'Not covered by a purchased seat block yet - they can log in but hold no credits until payment covers them.',
};

// "a@x.com, b@x.com\nc@x.com" -> unique, trimmed, lowercased addresses.
function parseEmails(raw) {
  return [...new Set(
    raw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@')),
  )];
}

// Spend reasons shown in the audit (mirrors the backend's SPEND_REASON_LABELS).
const REASON_LABELS = {
  EMAIL_REVEAL: 'Reveals',
  EXTENSION_REVEAL: 'Extension reveals',
  COMPANY_VIEW: 'Company views',
  CSV_EXPORT: 'CSV exports',
  SEQUENCE_ENROLLMENT: 'Sequence enrollments',
};

export function SettingsMembers() {
  const me = useSelector((s) => s.auth.user);
  const role = useSelector((s) => s.auth.role);
  const canManage = CAN_INVITE.has(role); // OWNER/ADMIN — the role permission
  const toast = useToast();
  const { data, isLoading } = useListWorkspaceMembersQuery();
  const members = data?.members;
  const seatInfo = data?.seats;
  // Team features (invite, roles) are paid-only; on Free the whole section is
  // an upgrade prompt regardless of seats.
  const isFree = seatInfo?.plan === 'FREE';
  const teamUnlocked = canManage && !isFree;
  const canManageRoles = teamUnlocked;
  // Invites are uncapped under pay-later billing — members beyond purchased
  // capacity land as "awaiting payment" until a block covers them.
  const canInviteNow = teamUnlocked;
  const { data: invites } = useListInvitesQuery(undefined, { skip: !canManage || isFree });
  const [createInvite, { isLoading: inviting }] = useCreateInviteMutation();
  const [bulkInvite, { isLoading: bulkInviting }] = useBulkInviteMutation();
  const [revokeInvite] = useRevokeInviteMutation();
  const [changeRole] = useChangeMemberRoleMutation();
  const [assignSeat] = useAssignSeatMutation();
  const [removeMember] = useRemoveMemberMutation();
  const [transferCredits, { isLoading: transferring }] = useTransferCreditsMutation();
  const isOwner = role === 'OWNER';
  const [transferTarget, setTransferTarget] = useState(null); // member being transferred to
  const [transferAmount, setTransferAmount] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'MEMBER' });
  const [copiedId, setCopiedId] = useState(null);
  const [savingRoleFor, setSavingRoleFor] = useState(null);

  async function handleRoleChange(member, nextRole) {
    if (nextRole === member.role) return;
    setSavingRoleFor(member.user.id);
    try {
      await changeRole({ userId: member.user.id, role: nextRole }).unwrap();
      toast.success(
        `${member.user.name} is now ${nextRole === 'ADMIN' ? 'an admin' : 'a teammate'}`,
        'Takes effect the next time they refresh (within 15 minutes).',
      );
    } catch (err) {
      toast.error('Could not change role', err.data?.error?.message);
    } finally {
      setSavingRoleFor(null);
    }
  }

  async function handleSeatChange(member, seatType) {
    if (seatType === member.seatType) return;
    try {
      await assignSeat({ userId: member.user.id, seatType }).unwrap();
      toast.success(
        `${member.user.name} → ${SEAT_LABEL[seatType].toLowerCase()}`,
        seatType === 'PENDING'
          ? 'They keep their balance but earn no new monthly credits.'
          : 'Their monthly credits follow the seat from the next billing cycle.',
      );
    } catch (err) {
      toast.error('Could not change seat', err.data?.error?.message);
    }
  }

  async function handleRemove(member) {
    const sure = window.confirm(
      `Remove ${member.user.name} from this workspace? Their account and credit history survive — they just lose access here.`,
    );
    if (!sure) return;
    try {
      await removeMember(member.user.id).unwrap();
      toast.success(`${member.user.name} removed`, 'Their seat is free again.');
    } catch (err) {
      toast.error('Could not remove member', err.data?.error?.message);
    }
  }

  async function handleTransfer(e) {
    e.preventDefault();
    const amount = Number(transferAmount);
    if (!transferTarget || !Number.isInteger(amount) || amount < 1) return;
    try {
      await transferCredits({ toUserId: transferTarget.user.id, amount }).unwrap();
      toast.success(
        `${amount} credits sent to ${transferTarget.user.name}`,
        'Moved from your personal balance to theirs.',
      );
      setTransferTarget(null);
      setTransferAmount('');
    } catch (err) {
      toast.error('Could not transfer credits', err.data?.error?.message);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    const emails = parseEmails(form.email);
    if (emails.length === 0) return;
    try {
      if (emails.length === 1) {
        const { invite } = await createInvite({ email: emails[0], role: form.role }).unwrap();
        toast.success('Invite sent', `${invite.email} has 7 days to accept — or copy them the link below.`);
      } else {
        const result = await bulkInvite({ emails, role: form.role }).unwrap();
        const failures = result.results.filter((r) => !r.ok);
        if (result.failed === 0) {
          toast.success(`${result.invited} invites sent`, 'Each has 7 days to accept.');
        } else {
          toast.success(
            `${result.invited} sent · ${result.failed} skipped`,
            failures.map((f) => `${f.email}: ${f.error}`).slice(0, 3).join(' · '),
          );
        }
      }
      setForm({ email: '', role: 'MEMBER' });
      setShowForm(false);
    } catch (err) {
      toast.error('Could not send invites', err.data?.error?.message);
    }
  }

  async function handleRevoke(invite) {
    try {
      await revokeInvite(invite.id).unwrap();
      toast.success('Invite revoked', `The link sent to ${invite.email} no longer works.`);
    } catch (err) {
      toast.error('Could not revoke invite', err.data?.error?.message);
    }
  }

  async function copyLink(invite) {
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard unavailable — the link is still in the emailed invite
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Users & teams"
        description={
          seatInfo
            ? `${seatInfo.members} of ${seatInfo.total} ${seatInfo.total === 1 ? 'seat' : 'seats'} filled` +
              (seatInfo.pendingInvites > 0 ? ` · ${seatInfo.pendingInvites} invites pending` : '') +
              ' · every teammate earns their own monthly credits'
            : undefined
        }
        footer={
          canInviteNow ? (
            <Button variant="primary" icon={UserPlus} onClick={() => setShowForm((v) => !v)}>
              Invite teammate
            </Button>
          ) : (
            <Tooltip
              content={
                !canManage
                  ? 'Only workspace owners and admins can invite'
                  : 'Inviting teammates is a paid feature — upgrade from Billing'
              }
            >
              <span className="inline-flex">
                <Button variant="primary" icon={UserPlus} disabled aria-disabled="true">
                  Invite teammate
                </Button>
              </span>
            </Tooltip>
          )
        }
      >
        {showForm && canInviteNow && (
          <form onSubmit={handleInvite} className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-3">
            <FormField
              label="Emails"
              hint="One or many — separate with commas, spaces or new lines. No seat limit: extra teammates wait as 'awaiting payment' until your next block purchase covers them."
              className="min-w-[220px] flex-1"
            >
              <textarea
                id="field-emails"
                required
                autoFocus
                rows={2}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="teammate@company.com, another@company.com"
                className={inputClass}
              />
            </FormField>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text">Role</span>
              <SegmentedControl
                ariaLabel="Invite role"
                value={form.role}
                onChange={(r) => setForm((f) => ({ ...f, role: r }))}
                options={[
                  { value: 'MEMBER', label: 'Member' },
                  { value: 'ADMIN', label: 'Admin' },
                ]}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              icon={Mail}
              loading={inviting || bulkInviting}
              disabled={parseEmails(form.email).length === 0}
            >
              {parseEmails(form.email).length > 1
                ? `Send ${parseEmails(form.email).length} invites`
                : 'Send invite'}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </form>
        )}

        <TableFrame className="-mx-5 -my-4 rounded-none border-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Member</th>
                <th className={thClass}>Role</th>
                <th className={thClass}>Seat</th>
                {isOwner && <th className={thClass}>Balance</th>}
                <th className={thClass}>Joined</th>
                {isOwner && <th className={thClass} />}
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows rows={2} columns={isOwner ? 6 : 4} />}
              {members?.map((m) => (
                <tr key={m.id} className={trClass}>
                  <td className={tdClass}>
                    <span className="flex items-center gap-2.5">
                      <LetterAvatar name={m.user.name} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {m.user.name}
                          {m.user.id === me?.id && <span className="ml-1.5 text-xs font-medium text-text-muted">(you)</span>}
                        </span>
                        <span className="block truncate text-xs text-text-muted">{m.user.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canManageRoles && m.role !== 'OWNER' && m.user.id !== me?.id ? (
                      <select
                        aria-label={`Role for ${m.user.name}`}
                        value={m.role}
                        disabled={savingRoleFor === m.user.id}
                        onChange={(e) => handleRoleChange(m, e.target.value)}
                        className="h-8 rounded-md border border-border bg-surface-elevated px-2 text-xs font-semibold text-text outline-none focus:border-focus focus:ring-2 focus:ring-focus/25 disabled:opacity-60"
                      >
                        <option value="MEMBER">Teammate</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    ) : (
                      <Tooltip content={ROLE_HINT[m.role]}>
                        <span className="inline-flex">
                          <StatusPill tone={ROLE_TONE[m.role] ?? 'neutral'}>
                            {m.role === 'MEMBER' ? 'TEAMMATE' : m.role}
                          </StatusPill>
                        </span>
                      </Tooltip>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isFree ? (
                      <span className="text-xs text-text-muted">—</span>
                    ) : isOwner && m.role !== 'OWNER' ? (
                      <select
                        aria-label={`Seat for ${m.user.name}`}
                        value={m.seatType}
                        onChange={(e) => handleSeatChange(m, e.target.value)}
                        className="h-8 rounded-md border border-border bg-surface-elevated px-2 text-xs font-semibold text-text outline-none focus:border-focus focus:ring-2 focus:ring-focus/25"
                      >
                        <option value="PAID">Paid seat</option>
                        <option value="FREE">Free seat</option>
                        <option value="PENDING">Awaiting payment</option>
                      </select>
                    ) : (
                      <Tooltip content={SEAT_HINT[m.seatType] ?? ''}>
                        <span className="inline-flex">
                          <StatusPill tone={SEAT_TONE[m.seatType] ?? 'neutral'}>
                            {SEAT_LABEL[m.seatType] ?? m.seatType}
                          </StatusPill>
                        </span>
                      </Tooltip>
                    )}
                  </td>
                  {isOwner && (
                    <td className={`${tdMutedClass} tabular-nums`}>{m.balance ?? '—'}</td>
                  )}
                  <td className={tdMutedClass}>{new Date(m.joinedAt).toLocaleDateString()}</td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      {m.user.id !== me?.id && m.role !== 'OWNER' && (
                        <span className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Send}
                            onClick={() => {
                              setTransferTarget(m);
                              setTransferAmount('');
                            }}
                            aria-label={`Transfer credits to ${m.user.name}`}
                          >
                            Transfer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleRemove(m)}
                            aria-label={`Remove ${m.user.name}`}
                          >
                            Remove
                          </Button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>

        {transferTarget && (
          <form
            onSubmit={handleTransfer}
            className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-3"
          >
            <FormField
              label={`Transfer credits to ${transferTarget.user.name}`}
              hint="Moved from YOUR personal balance to theirs — the ledger records both sides."
              className="min-w-[200px]"
            >
              <input
                id="field-transfer-credits-to"
                type="number"
                min={1}
                autoFocus
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="250"
                className={inputClass}
              />
            </FormField>
            <Button
              type="submit"
              variant="primary"
              icon={Send}
              loading={transferring}
              disabled={!Number(transferAmount)}
            >
              Send credits
            </Button>
            <Button variant="ghost" onClick={() => setTransferTarget(null)}>
              Cancel
            </Button>
          </form>
        )}
      </SettingsSection>

      {canManage && teamUnlocked && invites && invites.length > 0 && (
        <SettingsSection
          title="Pending invites"
          description="Waiting to be accepted — each link works once and expires 7 days after it was sent."
        >
          <TableFrame className="-mx-5 -my-4 rounded-none border-0">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Expires</th>
                  <th className={thClass}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className={trClass}>
                    <td className={tdClass}>
                      <span className="block truncate font-semibold">{invite.email}</span>
                      {invite.invitedBy && (
                        <span className="block text-xs text-text-muted">invited by {invite.invitedBy.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={ROLE_TONE[invite.role] ?? 'neutral'}>{invite.role}</StatusPill>
                    </td>
                    <td className={tdMutedClass}>{new Date(invite.expiresAt).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <Tooltip content={copiedId === invite.id ? 'Copied' : 'Copy invite link'}>
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon={copiedId === invite.id ? Check : Copy}
                          aria-label={`Copy invite link for ${invite.email}`}
                          onClick={() => copyLink(invite)}
                        />
                      </Tooltip>
                      <Tooltip content="Revoke invite">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon={X}
                          aria-label={`Revoke invite for ${invite.email}`}
                          onClick={() => handleRevoke(invite)}
                          className="hover:text-red-600"
                        />
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        </SettingsSection>
      )}

      {teamUnlocked && <TeamAudit reasonLabels={REASON_LABELS} />}

      {canManage && isFree && (
        <Banner tone="info" title="Add your team on a paid plan" action="Open Billing" actionTo="/app/billing">
          Inviting teammates, setting roles, and the team credit audit are paid features. Upgrade
          from Billing to build your team — each seat block bundles paid + free seats, and every
          teammate earns their own monthly credits.
        </Banner>
      )}

      {canManage && teamUnlocked && (seatInfo?.members ?? 0) > (seatInfo?.total ?? 0) && (
        <Banner
          tone="info"
          title="Some teammates are awaiting payment"
          action="Buy blocks"
          actionTo="/app/billing"
        >
          You have more members than purchased seats. Buy another seat block from Billing to cover
          them — each newly covered teammate gets a one-time 1,500-credit welcome gift.
        </Banner>
      )}
    </div>
  );
}

// Per-teammate credit-usage audit — who spent what — with a downloadable CSV
// (opens in Excel). Paid + admin only (the parent gates on teamUnlocked).
function TeamAudit({ reasonLabels }) {
  const { data, isLoading } = useGetTeamAuditQuery();
  const rows = data?.members ?? [];
  const hasUnattributed = (data?.unattributed?.totalSpent ?? 0) > 0;

  return (
    <SettingsSection
      title="Team credit audit"
      description="Every teammate's credit spend on this workspace's shared balance."
      footer={
        <ExportCsvButton path="/workspace/audit/export" label="Download team audit" />
      }
    >
      <TableFrame className="-mx-5 -my-4 rounded-none border-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className={thClass}>Teammate</th>
              <th className={thClass}>Actions</th>
              <th className={thClass}>Breakdown</th>
              <th className={thClass}>Credits spent</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows rows={2} columns={4} />}
            {rows.map((m) => (
              <tr key={m.userId} className={trClass}>
                <td className={tdClass}>
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="block truncate text-xs text-text-muted">{m.email}</span>
                </td>
                <td className={`${tdMutedClass} tabular-nums`}>{m.actionCount}</td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1.5">
                    {Object.entries(m.byReason).length === 0 && <span className="text-xs text-text-muted">—</span>}
                    {Object.entries(m.byReason).map(([reason, amount]) => (
                      <span
                        key={reason}
                        className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-text-muted"
                      >
                        {`${reasonLabels[reason] ?? reason}: ${amount}`}
                      </span>
                    ))}
                  </span>
                </td>
                <td className={`${tdClass} font-semibold tabular-nums`}>{m.totalSpent}</td>
              </tr>
            ))}
            {hasUnattributed && (
              <tr className={trClass}>
                <td className={tdMutedClass}>
                  <span className="block font-semibold text-text-muted">Unattributed</span>
                  <span className="block text-xs text-text-muted">Older activity or former teammates</span>
                </td>
                <td className={`${tdMutedClass} tabular-nums`}>{data.unattributed.actionCount}</td>
                <td className={tdMutedClass}>—</td>
                <td className={`${tdMutedClass} font-semibold tabular-nums`}>{data.unattributed.totalSpent}</td>
              </tr>
            )}
          </tbody>
        </table>
      </TableFrame>
    </SettingsSection>
  );
}
