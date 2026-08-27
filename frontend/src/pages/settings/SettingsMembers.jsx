import { useState } from 'react';
import { useSelector } from 'react-redux';
import { UserPlus, X, Copy, Check, Mail } from 'lucide-react';
import {
  useListWorkspaceMembersQuery,
  useListInvitesQuery,
  useCreateInviteMutation,
  useRevokeInviteMutation,
  useChangeMemberRoleMutation,
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
  const seatsFull = Boolean(seatInfo && seatInfo.used >= seatInfo.total);
  const canInviteNow = teamUnlocked && !seatsFull;
  const fullHint = 'All seats are in use — revoke a pending invite, or upgrade your plan for more seats';
  const { data: invites } = useListInvitesQuery(undefined, { skip: !canManage || isFree });
  const [createInvite, { isLoading: inviting }] = useCreateInviteMutation();
  const [revokeInvite] = useRevokeInviteMutation();
  const [changeRole] = useChangeMemberRoleMutation();
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

  async function handleInvite(e) {
    e.preventDefault();
    try {
      const { invite } = await createInvite(form).unwrap();
      toast.success('Invite sent', `${invite.email} has 7 days to accept — or copy them the link below.`);
      setForm({ email: '', role: 'MEMBER' });
      setShowForm(false);
    } catch (err) {
      toast.error('Could not send invite', err.data?.error?.message);
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
              (seatInfo.pendingInvites > 0 ? ` · ${seatInfo.pendingInvites} pending` : '') +
              ' · all teammates share one credit balance'
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
                  : isFree
                    ? 'Inviting teammates is a paid feature — upgrade from Billing'
                    : fullHint
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
            <FormField label="Email" className="min-w-[220px] flex-1">
              <input
                id="field-email"
                type="email"
                required
                autoFocus
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="teammate@company.com"
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
            <Button type="submit" variant="primary" icon={Mail} loading={inviting} disabled={!form.email}>
              Send invite
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
                <th className={thClass}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows rows={2} columns={3} />}
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
                  <td className={tdMutedClass}>{new Date(m.joinedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
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
          Inviting teammates, setting roles, and the team credit audit are paid features. Upgrade from
          Billing to build your team — everyone will share this workspace's credit balance.
        </Banner>
      )}

      {canManage && teamUnlocked && seatsFull && (
        <Banner tone="info" title="All seats are in use" action="Open Billing" actionTo="/app/billing">
          Revoke a pending invite to free a seat, or upgrade to a higher plan for more seats — Basic
          includes 10, Professional 25, and Organization 45.
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
