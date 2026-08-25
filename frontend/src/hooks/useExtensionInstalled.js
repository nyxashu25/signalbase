import { useCallback, useEffect, useState } from 'react';

// Pinned by extension/manifest.json's "key" field — see
// extension/EXTENSION_ID.md for what that means and why it can't change
// without breaking this detector for existing installs.
const EXTENSION_ID = 'cdfkakmanagglkhamigfaoallhiigdla';

// The version currently shipped in the download (extension/manifest.json).
// Keep this in step with a version bump so the UI can tell an installed
// user their copy is out of date. The download itself is served at
// EXTENSION_DOWNLOAD_URL (Vite copies frontend/public/ verbatim).
export const EXTENSION_VERSION = '0.3.3';
export const EXTENSION_DOWNLOAD_URL = '/downloads/datapit-extension.zip';

/**
 * Chrome (and other Chromium browsers) expose `chrome.runtime.sendMessage`
 * to any web page for messaging a specific extension id — no permission
 * needed on the page side, as long as the extension's own
 * `externally_connectable` allowlists this origin (it allowlists
 * datapit.io + localhost:5173). This is the only reliable way to detect an
 * unpacked extension: Chrome deliberately has no API for "is extension X
 * installed" beyond asking the extension itself to respond.
 *
 * `pollMs` re-checks on an interval (pass it only while something is
 * actively waiting for the install to complete — e.g. the install modal is
 * open — never as a background 24/7 poll).
 */
export function useExtensionInstalled({ pollMs } = {}) {
  const [status, setStatus] = useState('checking'); // checking | installed | not-installed | unsupported
  const [version, setVersion] = useState(null);

  const check = useCallback(() => {
    const runtime = typeof window !== 'undefined' ? window.chrome?.runtime : undefined;
    if (!runtime?.sendMessage) {
      setStatus('unsupported');
      return;
    }
    try {
      runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
        // Reading lastError (even just to ignore it) is required — Chrome
        // logs an "Unchecked runtime.lastError" console warning otherwise,
        // which is exactly the expected outcome when nothing is listening
        // (i.e. the extension isn't installed).
        const notInstalled = Boolean(runtime.lastError) || !response?.installed;
        if (notInstalled) {
          setStatus('not-installed');
          return;
        }
        setVersion(response.version ?? null);
        setStatus('installed');
      });
    } catch {
      setStatus('not-installed');
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (!pollMs) return undefined;
    const id = setInterval(check, pollMs);
    return () => clearInterval(id);
  }, [check, pollMs]);

  return { status, version, recheck: check };
}
