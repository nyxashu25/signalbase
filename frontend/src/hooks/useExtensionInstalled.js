import { useCallback, useEffect, useState } from 'react';

// The version currently shipped in the download (extension/manifest.json).
// Keep this in step with a version bump so the UI can tell an installed user
// their copy is out of date. The download is served at EXTENSION_DOWNLOAD_URL
// (Vite copies frontend/public/ verbatim).
export const EXTENSION_VERSION = '0.5.0';
export const EXTENSION_DOWNLOAD_URL = '/downloads/datapit-extension.zip';

// Live Chrome Web Store listing — the one-click "Add to Chrome" path for
// end users. The .zip download above stays as a manual fallback (other
// Chromium browsers, or loading unpacked for development).
export const EXTENSION_STORE_URL =
  'https://chromewebstore.google.com/detail/datapit-%E2%80%94-linkedin-lookup/mgkohbpdpfgdfnlbipfkhnjadbncdgnj';

// How the extension announces itself: its content script (announce.js) sets
// this attribute on <html> and fires this event. Detection is therefore
// id-independent — it works however the extension was installed (unpacked or
// Web Store), which is what lets the extension ship keyless. Must match the
// names in extension/announce.js.
const MARK_ATTR = 'data-datapit-extension';
const READY_EVENT = 'datapit-extension-ready';
const QUERY_EVENT = 'datapit-extension-query';

function readMark() {
  if (typeof document === 'undefined') return null;
  return document.documentElement.getAttribute(MARK_ATTR);
}

/**
 * Detects the DataPit browser extension and its version. The extension's
 * announce.js marks the page (attribute + event); this reads the attribute
 * (timing-robust) and also listens for the event (instant flip when the
 * extension loads after us). No fixed extension id involved.
 *
 * `pollMs` re-checks on an interval — pass it only while something is
 * actively waiting for an install to complete (e.g. the install modal is
 * open), never as a background poll.
 */
export function useExtensionInstalled({ pollMs } = {}) {
  const [status, setStatus] = useState('checking'); // checking | installed | not-installed
  const [version, setVersion] = useState(null);

  const check = useCallback(() => {
    const v = readMark();
    if (v) {
      setVersion(v);
      setStatus('installed');
      return;
    }
    // Ask the extension to (re-)announce in case its content script attached
    // after our first read; the READY_EVENT listener will flip us to
    // installed if it responds.
    window.dispatchEvent(new CustomEvent(QUERY_EVENT));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const onReady = (e) => {
      if (cancelled) return;
      setVersion(e.detail?.version ?? readMark());
      setStatus('installed');
    };
    window.addEventListener(READY_EVENT, onReady);

    // Give the content script a brief grace to announce before we conclude
    // it's absent — avoids a flash of the install prompt on a page where the
    // extension is present but hasn't marked the page yet.
    window.dispatchEvent(new CustomEvent(QUERY_EVENT));
    const settle = setTimeout(() => {
      if (cancelled) return;
      const v = readMark();
      if (v) {
        setVersion(v);
        setStatus('installed');
      } else {
        setStatus('not-installed');
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(settle);
      window.removeEventListener(READY_EVENT, onReady);
    };
  }, []);

  useEffect(() => {
    if (!pollMs) return undefined;
    const id = setInterval(check, pollMs);
    return () => clearInterval(id);
  }, [check, pollMs]);

  return { status, version, recheck: check };
}
