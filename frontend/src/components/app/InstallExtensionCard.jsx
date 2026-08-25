import { useState } from 'react';
import { Download, Copy, Check, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { Banner } from '../ui/Banner.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { useExtensionInstalled, EXTENSION_DOWNLOAD_URL } from '../../hooks/useExtensionInstalled.js';

const ZIP_URL = EXTENSION_DOWNLOAD_URL;

function CopyableCommand({ value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable — the text is right there to select
    }
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-2 py-1">
      <code className="font-mono text-xs text-text">{value}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${value}`}
        className="rounded-sm p-0.5 text-text-muted hover:text-text"
      >
        {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
      </button>
    </span>
  );
}

function Step({ n, children }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
        {n}
      </span>
      <span className="text-sm text-text-muted">{children}</span>
    </li>
  );
}

/**
 * Dashboard promo (banner) + install walkthrough (modal) for the Chrome
 * extension. Chrome has no API for a webpage to silently install an
 * unpacked extension — the closest thing to "one click" is: download the
 * zip, walk through chrome://extensions -> Load unpacked, and detect the
 * moment it connects (useExtensionInstalled, via the extension's pinned id
 * and externally_connectable). Not on the Chrome Web Store yet, so this is
 * genuinely the fastest path today; see extension/README.md.
 */
export function InstallExtensionCard() {
  const [open, setOpen] = useState(false);
  const { status, version, recheck } = useExtensionInstalled({ pollMs: open ? 2000 : undefined });

  // No point flashing the banner during the initial "checking" tick, and
  // once connected there's nothing left to promote. Note this only hides
  // the BANNER — if the modal is open and mid-flow when the extension
  // connects, it must keep rendering below so the success state is seen
  // instead of the whole thing vanishing out from under the user.
  if (status === 'checking') return null;

  return (
    <>
      {status !== 'installed' && (
        <Banner
          tone="info"
          title="Install the DataPit Chrome extension"
          action="Install extension"
          onAction={() => setOpen(true)}
          dismissible
          dismissKey="install-extension"
          className="mb-5"
        >
          Look up any LinkedIn profile without leaving the page — reveal an email and phone for 4
          credits, right from your browser.
        </Banner>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Install the DataPit extension">
        {status === 'installed' ? (
          <InstalledState version={version} onDone={() => setOpen(false)} />
        ) : (
          <div className="flex flex-col gap-4">
            <ol className="flex flex-col gap-3">
              <Step n={1}>
                <Button variant="secondary" size="sm" icon={Download} href={ZIP_URL} download>
                  Download the extension
                </Button>{' '}
                and unzip it.
              </Step>
              <Step n={2}>
                Open a new tab, go to <CopyableCommand value="chrome://extensions" /> (Chrome blocks
                links to this page, so paste it in yourself).
              </Step>
              <Step n={3}>Turn on <strong className="text-text">Developer mode</strong> (top right).</Step>
              <Step n={4}>
                Click <strong className="text-text">Load unpacked</strong> and select the unzipped{' '}
                <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-xs">datapit-extension</code>{' '}
                folder.
              </Step>
            </ol>

            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                Waiting for the extension…
              </span>
              <Button variant="ghost" size="sm" onClick={recheck}>
                Check again
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              This updates automatically the moment Chrome loads it — no need to reload this page.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

function InstalledState({ version, onDone }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
        <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-bold text-text">Extension connected{version ? ` — v${version}` : ''}</p>
        <p className="mt-1 text-sm text-text-muted">
          Next, create an API key so the extension can act as you and spend this workspace's
          credits.
        </p>
      </div>
      <div className="mt-1 flex gap-2">
        <Button variant="primary" size="sm" icon={KeyRound} to="/app/settings/api" onClick={onDone}>
          Create an API key
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}
