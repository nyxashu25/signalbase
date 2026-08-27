import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowUpRight, Upload, Trash2 } from 'lucide-react';
import {
  useGetWorkspaceProfileQuery,
  useUpdateWorkspaceMutation,
  useUploadWorkspaceLogoMutation,
  useRemoveWorkspaceLogoMutation,
} from '../../api/workspaceApi.js';
import { useGetBillingSummaryQuery } from '../../api/billingApi.js';
import { updateWorkspace } from '../../store/authSlice.js';
import { findPlan } from '../../data/plans.js';
import { Button } from '../../components/ui/Button.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { LetterAvatar } from '../../components/ui/LetterAvatar.jsx';
import { StatusPill } from '../../components/ui/StatusPill.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

const CAN_EDIT = new Set(['OWNER', 'ADMIN']);

export function SettingsWorkspace() {
  const workspace = useSelector((s) => s.auth.workspace);
  const role = useSelector((s) => s.auth.role);
  const dispatch = useDispatch();
  const toast = useToast();
  const fileRef = useRef(null);
  const { data: profile } = useGetWorkspaceProfileQuery();
  const { data: summary } = useGetBillingSummaryQuery();
  const [updateWorkspaceMut, { isLoading }] = useUpdateWorkspaceMutation();
  const [uploadLogo, { isLoading: uploading }] = useUploadWorkspaceLogoMutation();
  const [removeLogo] = useRemoveWorkspaceLogoMutation();

  const canEdit = CAN_EDIT.has(role);
  const currentName = profile?.name ?? workspace?.name ?? '';
  const [name, setName] = useState(currentName);
  const [motto, setMotto] = useState(profile?.motto ?? '');
  // Seed local fields once the profile loads (the query is async).
  const [seeded, setSeeded] = useState(false);
  if (profile && !seeded) {
    setName(profile.name ?? '');
    setMotto(profile.motto ?? '');
    setSeeded(true);
  }

  const dirty =
    canEdit &&
    name.trim().length > 0 &&
    (name.trim() !== (profile?.name ?? '') || (motto.trim() || '') !== (profile?.motto ?? ''));
  const plan = summary ? findPlan(summary.plan) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const updated = await updateWorkspaceMut({ name: name.trim(), motto: motto.trim() || null }).unwrap();
      dispatch(updateWorkspace({ name: updated.name }));
      toast.success('Workspace saved');
    } catch (err) {
      toast.error('Could not save workspace', err.data?.error?.message);
    }
  }

  async function handleLogoPick(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    try {
      await uploadLogo(file).unwrap();
      toast.success('Logo updated');
    } catch (err) {
      toast.error('Could not upload logo', err.data?.error?.message ?? 'Use a PNG, JPEG or WebP under 150KB.');
    }
  }

  async function handleLogoRemove() {
    try {
      await removeLogo().unwrap();
      toast.success('Logo removed');
    } catch (err) {
      toast.error('Could not remove logo', err.data?.error?.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Branding"
        description="Your workspace logo, name and motto — shown across DataPit. Available on every plan."
      >
        <div className="flex flex-wrap items-center gap-4">
          {profile?.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt="Workspace logo"
              className="h-14 w-14 rounded-lg border border-border object-cover"
            />
          ) : (
            <LetterAvatar name={currentName || 'W'} size="xl" square />
          )}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoPick}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={Upload}
                loading={uploading}
                disabled={!canEdit}
                onClick={() => fileRef.current?.click()}
              >
                {profile?.logoUrl ? 'Replace logo' : 'Upload logo'}
              </Button>
              {profile?.logoUrl && canEdit && (
                <Button variant="ghost" size="sm" icon={Trash2} onClick={handleLogoRemove}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-text-muted">PNG, JPEG or WebP · up to 150KB.</p>
          </div>
        </div>
      </SettingsSection>

      <form onSubmit={handleSubmit}>
        <SettingsSection
          title="Workspace"
          description="The shared space your lists, sequences, credits and teammates live in."
          footer={
            <Button type="submit" variant="primary" loading={isLoading} disabled={!dirty}>
              Save changes
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Workspace name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                disabled={!canEdit}
                hint={canEdit ? 'Shown in the top bar and on every ticket you raise.' : 'Only owners and admins can edit the workspace.'}
              />
              <FormField label="Workspace ID" hint="Handy when talking to support.">
                <code className="flex h-9 items-center truncate rounded-md border border-border bg-surface-sunken px-3 font-mono text-xs text-text-muted">
                  {workspace?.id}
                </code>
              </FormField>
            </div>
            <FormField
              label="Motto"
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              maxLength={140}
              disabled={!canEdit}
              placeholder="Optional — a short tagline for your team"
              hint="Optional. A one-liner shown on your workspace."
            />
          </div>
        </SettingsSection>
      </form>

      <SettingsSection
        title="Plan & credits"
        description="Upgrades, billing intervals and the full ledger live on the Billing page."
        footer={
          <Button variant="secondary" iconRight={ArrowUpRight} to="/app/billing">
            Open Billing
          </Button>
        }
      >
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Plan">
            <span className="flex items-center gap-2">
              {plan?.name ?? summary?.plan ?? '—'}
              {summary?.plan === 'FREE' && <StatusPill tone="neutral">Free</StatusPill>}
            </span>
          </Stat>
          <Stat label="Seats">{summary?.seats ?? '—'}</Stat>
          <Stat label="Monthly grant">{summary?.monthlyCreditGrant ?? '—'}</Stat>
          <Stat label="Balance">{summary?.balance ?? '—'}</Stat>
          <Stat label="Billing interval">{summary?.billingInterval ? summary.billingInterval.toLowerCase() : '—'}</Stat>
        </dl>
      </SettingsSection>
    </div>
  );
}

function Stat({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold capitalize tabular-nums text-text">{children}</dd>
    </div>
  );
}
