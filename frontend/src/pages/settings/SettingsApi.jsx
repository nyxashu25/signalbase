import { useState } from 'react';
import { KeyRound, Plus, X, Copy, Check, Download, CheckCircle2 } from 'lucide-react';
import {
  useExtensionInstalled,
  EXTENSION_VERSION,
  EXTENSION_DOWNLOAD_URL,
} from '../../hooks/useExtensionInstalled.js';
import {
  useListApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
} from '../../api/apiKeysApi.js';
import { Button } from '../../components/ui/Button.jsx';
import { Banner } from '../../components/ui/Banner.jsx';
import { FormField, inputClass } from '../../components/ui/FormField.jsx';
import { TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../../components/ui/Card.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Illustration } from '../../components/ui/illustrations.jsx';
import { SkeletonRows } from '../../components/ui/Skeleton.jsx';
import { Tooltip } from '../../components/ui/Tooltip.jsx';
import { useToast } from '../../components/ui/toast.jsx';
import { SettingsSection } from './SettingsLayout.jsx';

// Settings → API & Extension: personal API keys, primarily for the DataPit
// Chrome extension (paste a key into its popup) and later for direct API
// use. Keys are personal, not workspace-shared — each teammate creates
// their own.
export function SettingsApi() {
  const toast = useToast();
  const { data: keys, isLoading } = useListApiKeysQuery();
  const [createApiKey, { isLoading: creating }] = useCreateApiKeyMutation();
  const [revokeApiKey] = useRevokeApiKeyMutation();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  // The full secret of the key just created — the only time it ever exists
  // client-side. Cleared as soon as the user dismisses the banner.
  const [freshKey, setFreshKey] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const created = await createApiKey({ name }).unwrap();
      setFreshKey(created);
      setName('');
      setShowForm(false);
    } catch (err) {
      toast.error('Could not create key', err.data?.error?.message);
    }
  }

  async function handleRevoke(key) {
    try {
      await revokeApiKey(key.id).unwrap();
      toast.success('Key revoked', `"${key.name}" no longer works — anything using it is now signed out.`);
      if (freshKey?.id === key.id) setFreshKey(null);
    } catch (err) {
      toast.error('Could not revoke key', err.data?.error?.message);
    }
  }

  async function copyFreshKey() {
    try {
      await navigator.clipboard.writeText(freshKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the key is visible to copy by hand
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {freshKey && (
        <Banner tone="success" title={`API key "${freshKey.name}" created`}>
          <p className="mb-2">
            Copy it now — for your security it is shown <strong>only this once</strong> and can never be
            retrieved again. Paste it into the DataPit Chrome extension to connect it.
          </p>
          <span className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-surface-sunken px-2 py-1 font-mono text-xs break-all">{freshKey.key}</code>
            <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={copyFreshKey}>
              {copied ? 'Copied' : 'Copy key'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFreshKey(null)}>
              Done — hide it
            </Button>
          </span>
        </Banner>
      )}

      <SettingsSection
        title="API keys"
        description="Personal credentials for the Chrome extension and the DataPit API. Actions taken with a key spend this workspace's credits, as you."
        footer={
          <Button variant="primary" icon={Plus} onClick={() => setShowForm((v) => !v)}>
            New API key
          </Button>
        }
      >
        {showForm && (
          <form onSubmit={handleCreate} className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-3">
            <FormField
              label="Key name"
              hint="Where will it live? e.g. “Chrome extension — work laptop”"
              className="min-w-[260px] flex-1"
            >
              <input
                id="field-key-name"
                type="text"
                required
                autoFocus
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chrome extension — work laptop"
                className={inputClass}
              />
            </FormField>
            <Button type="submit" variant="primary" icon={KeyRound} loading={creating} disabled={!name.trim()}>
              Create key
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </form>
        )}

        {!isLoading && (!keys || keys.length === 0) && !showForm ? (
          <EmptyState
            illustration={<Illustration.Plug />}
            title="No API keys yet"
            actions={
              <Button variant="secondary" icon={Plus} onClick={() => setShowForm(true)}>
                Create your first key
              </Button>
            }
          >
            Create a key and paste it into the DataPit Chrome extension — it looks up every LinkedIn
            profile you visit and reveals emails and phone numbers for 4 credits.
          </EmptyState>
        ) : (
          <TableFrame className="-mx-5 -my-4 rounded-none border-0">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Key</th>
                  <th className={thClass}>Created</th>
                  <th className={thClass}>Last used</th>
                  <th className={thClass}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <SkeletonRows rows={2} columns={5} />}
                {keys?.map((key) => (
                  <tr key={key.id} className={trClass}>
                    <td className={tdClass}>
                      <span className="block truncate font-semibold">{key.name}</span>
                    </td>
                    <td className={tdMutedClass}>
                      <code className="font-mono text-xs">{key.prefix}…</code>
                    </td>
                    <td className={tdMutedClass}>{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td className={tdMutedClass}>
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <Tooltip content="Revoke key">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          icon={X}
                          aria-label={`Revoke API key ${key.name}`}
                          onClick={() => handleRevoke(key)}
                          className="hover:text-red-600"
                        />
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        )}
      </SettingsSection>

      <ExtensionSection />
    </div>
  );
}

// Always-available home for the extension download + install steps. Unlike
// the Dashboard install banner (which hides once the extension is
// detected), this stays put so an installed user can always fetch an
// update — and tells them when their installed copy is behind the current
// build.
function ExtensionSection() {
  const { status, version } = useExtensionInstalled();
  const installed = status === 'installed';
  const outdated = installed && version && version !== EXTENSION_VERSION;

  return (
    <SettingsSection
      title="Chrome extension"
      description="Look up any LinkedIn profile against DataPit as you browse."
      footer={
        <Button variant="primary" icon={Download} href={EXTENSION_DOWNLOAD_URL} download>
          {installed ? 'Download update' : 'Download extension'} · v{EXTENSION_VERSION}
        </Button>
      }
    >
      {installed && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            outdated
              ? 'border-amber-500/30 bg-amber-500/10 text-text'
              : 'border-emerald-500/30 bg-emerald-500/10 text-text'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
          {outdated ? (
            <span>
              Connected — but you're on <strong>v{version}</strong>. Download v{EXTENSION_VERSION} below and reload
              it in <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-xs">chrome://extensions</code>.
            </span>
          ) : (
            <span>
              Extension connected{version ? ` (v${version})` : ''} — you're on the latest version.
            </span>
          )}
        </div>
      )}

      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-text-muted">
        <li>Create an API key above and copy it.</li>
        <li>
          Download the extension (button below) and unzip it. In{' '}
          <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-xs">chrome://extensions</code>, turn
          on <strong className="text-text">Developer mode</strong>, then <strong className="text-text">Load unpacked</strong>{' '}
          and pick the <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-xs">datapit-extension</code> folder.
          (To update later: download again, unzip over the old folder, and hit <strong className="text-text">↻ reload</strong> on the card.)
        </li>
        <li>Click the extension icon, paste the key, and open any LinkedIn profile.</li>
      </ol>
      <p className="mt-3 text-sm text-text-muted">
        Found profiles reveal their email and phone for <strong className="text-text">4 credits</strong> —
        contacts your workspace already revealed are free. Profiles we don't have yet are queued for our
        data team automatically.
      </p>
    </SettingsSection>
  );
}
