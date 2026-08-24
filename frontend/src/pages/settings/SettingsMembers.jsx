import { useState } from 'react';
import { useSelector } from 'react-redux';
import { UserPlus, X, Copy, Check, Mail } from 'lucide-react';
import {
  useListWorkspaceMembersQuery,
  useListInvitesQuery,
  useCreateInviteMutation,
  useRevokeInviteMutation,
} from '../../api/workspaceApi.js';
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

export function SettingsMembers() {
  const me = useSelector((s) => s.auth.user);
  const role = useSelector((s) => s.auth.role);
  const canInvite = CAN_INVITE.has(role);
  const toast = useToast();
  const { data, isLoading } = useListWorkspaceMembersQuery();
  const members = data?.members;
  const seatInfo = data?.seats;
  const seatsFull = Boolean(seatInfo && seatInfo.used >= seatInfo.total);
  const fullHint =
    seatInfo?.plan === 'FREE'
      ? 'The Free plan includes 1 seat — upgrade to invite teammates'
      : 'All seats are in use — revoke a pending invite or add seats from Billing';
  const { data: invites } = useListInvitesQuery(undefined, { skip: !canInvite });
  const [createInvite, { isLoading: inviting }] = useCreateInviteMutation();
  const [revokeInvite] = useRevokeInviteMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'MEMBER' });
  const [copiedId, setCopiedId] = useState(null);

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
              (seatInfo.pendingInvites > 0 ? ` · ${seatInfo.pendingInvites} pending` : '')
            : undefined
        }
        footer={
          canInvite && !seatsFull ? (
            <Button variant="primary" icon={UserPlus} onClick={() => setShowForm((v) => !v)}>
              Invite teammate
            </Button>
          ) : canInvite ? (
            <Tooltip content={fullHint}>
              <span className="inline-flex">
                <Button variant="primary" icon={UserPlus} disabled aria-disabled="true">
                  Invite teammate
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Tooltip content="Only workspace owners and admins can invite">
              <span className="inline-flex">
                <Button variant="primary" icon={UserPlus} disabled aria-disabled="true">
                  Invite teammate
                </Button>
              </span>
            </Tooltip>
          )
        }
      >
        {showForm && canInvite && (
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
                    <Tooltip content={ROLE_HINT[m.role]}>
                      <span className="inline-flex">
                        <StatusPill tone={ROLE_TONE[m.role] ?? 'neutral'}>{m.role}</StatusPill>
                      </span>
                    </Tooltip>
                  </td>
                  <td className={tdMutedClass}>{new Date(m.joinedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      </SettingsSection>

      {canInvite && invites && invites.length > 0 && (
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

      {canInvite && seatsFull && (
        <Banner tone="info" title={seatInfo?.plan === 'FREE' ? 'Invites need a paid plan' : 'All seats are in use'} action="Open Billing" actionTo="/app/billing">
          {seatInfo?.plan === 'FREE'
            ? 'The Free plan includes a single seat. Pick a plan and choose how many seats to buy — each seat adds its monthly credits too.'
            : 'Revoke a pending invite to free a seat, or add seats by re-subscribing with a higher seat count from Billing.'}
        </Banner>
      )}
    </div>
  );
}
