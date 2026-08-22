import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowUpRight } from 'lucide-react';
import { useRenameWorkspaceMutation } from '../../api/workspaceApi.js';
import { useGetBillingSummaryQuery } from '../../api/billingApi.js';
import { updateWorkspace } from '../../store/authSlice.js';
import { findPlan } from '../../data/plans.js';
import { Button } from '../../components/ui/Button.jsx';
import { FormField } from '../../components/ui/FormField.jsx';
import { StatusPill } from '../../components/ui/StatusPill.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

const CAN_RENAME = new Set(['OWNER', 'ADMIN']);

export function SettingsWorkspace() {
  const workspace = useSelector((s) => s.auth.workspace);
  const role = useSelector((s) => s.auth.role);
  const dispatch = useDispatch();
  const toast = useToast();
  const { data: summary } = useGetBillingSummaryQuery();
  const [renameWorkspace, { isLoading }] = useRenameWorkspaceMutation();
  const [name, setName] = useState(workspace?.name ?? '');
  const canRename = CAN_RENAME.has(role);
  const dirty = canRename && name.trim().length > 0 && name.trim() !== workspace?.name;
  const plan = summary ? findPlan(summary.plan) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const updated = await renameWorkspace({ name: name.trim() }).unwrap();
      dispatch(updateWorkspace({ name: updated.name }));
      toast.success('Workspace renamed');
    } catch (err) {
      toast.error('Could not rename workspace', err.data?.error?.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              disabled={!canRename}
              hint={canRename ? 'Shown in the top bar and on every ticket you raise.' : 'Only owners and admins can rename the workspace.'}
            />
            <FormField label="Workspace ID" hint="Handy when talking to support.">
              <code className="flex h-9 items-center truncate rounded-md border border-border bg-surface-sunken px-3 font-mono text-xs text-text-muted">
                {workspace?.id}
              </code>
            </FormField>
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
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Plan">
            <span className="flex items-center gap-2">
              {plan?.name ?? summary?.plan ?? '—'}
              {summary?.plan === 'FREE' && <StatusPill tone="neutral">Free</StatusPill>}
            </span>
          </Stat>
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
