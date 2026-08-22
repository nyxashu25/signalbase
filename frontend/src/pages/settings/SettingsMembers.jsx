import { useSelector } from 'react-redux';
import { UserPlus } from 'lucide-react';
import { useListWorkspaceMembersQuery } from '../../api/workspaceApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { Banner } from '../../components/ui/Banner.jsx';
import { TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../../components/ui/Card.jsx';
import { LetterAvatar } from '../../components/ui/LetterAvatar.jsx';
import { StatusPill } from '../../components/ui/StatusPill.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Tooltip } from '../../components/ui/Tooltip.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

const ROLE_TONE = { OWNER: 'accent', ADMIN: 'info', MEMBER: 'neutral' };
const ROLE_HINT = {
  OWNER: 'Full control, including billing and deleting the workspace.',
  ADMIN: 'Can manage lists, sequences, members and workspace settings.',
  MEMBER: 'Can search, reveal, build lists and run sequences.',
};

export function SettingsMembers() {
  const me = useSelector((s) => s.auth.user);
  const { data: members, isLoading } = useListWorkspaceMembersQuery();

  return (
    <div className="flex flex-col gap-4">
      <Banner tone="info" title="Seat invites are on the way">
        Every plan is priced per seat, and inviting teammates is the next thing we&rsquo;re building.
        Until it ships, a second person can&rsquo;t be added to this workspace — we&rsquo;ll light the
        button up the moment it can.
      </Banner>

      <SettingsSection
        title="Users & teams"
        description={members ? `${members.length} ${members.length === 1 ? 'seat' : 'seats'} in use.` : undefined}
        footer={
          <Tooltip content="Coming soon — seat invites are in progress">
            <span className="inline-flex">
              <Button variant="primary" icon={UserPlus} disabled aria-disabled="true">
                Invite teammate
              </Button>
            </span>
          </Tooltip>
        }
      >
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
    </div>
  );
}
