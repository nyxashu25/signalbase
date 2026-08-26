import { useState } from 'react';
import { CheckCircle2, Loader2, KeyRound, Puzzle } from 'lucide-react';
import { Banner } from '../ui/Banner.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import {
  useExtensionInstalled,
  EXTENSION_DOWNLOAD_URL,
  EXTENSION_STORE_URL,
} from '../../hooks/useExtensionInstalled.js';

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
 * extension. Now that it's on the Chrome Web Store, the primary path is a
 * one-click "Add to Chrome" that opens the listing; the manual .zip stays as
 * a fallback (other Chromium browsers / dev). Detection is id-independent
 * (announce.js marks the page — see useExtensionInstalled), so it flips to
 * connected the moment the user returns after installing, store id and all.
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
          action="Add to Chrome"
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
                <Button
                  variant="primary"
                  size="sm"
                  icon={Puzzle}
                  href={EXTENSION_STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Add to Chrome
                </Button>{' '}
                — opens the Chrome Web Store in a new tab.
              </Step>
              <Step n={2}>
                On the store page, click <strong className="text-text">Add to Chrome</strong>, then
                confirm.
              </Step>
              <Step n={3}>Come back to this tab — we'll detect it automatically.</Step>
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
              Not on Chrome, or installing manually?{' '}
              <a className="font-semibold text-primary hover:underline" href={EXTENSION_DOWNLOAD_URL} download>
                Download the .zip
              </a>{' '}
              and load it unpacked from <code className="font-mono">chrome://extensions</code>.
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
