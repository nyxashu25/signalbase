// Runs on the DataPit web app only. Announces the extension's presence and
// version to the page so the DataPit dashboard can detect it WITHOUT any
// fixed extension id — which is what lets the extension ship keyless (no
// "key" field in the manifest, so it uploads cleanly to the Chrome Web
// Store) and still be detected however it was installed (unpacked or store,
// whatever id Chrome assigns).
//
// Mechanism: set a data attribute on <html> (timing-robust — the page can
// read it at any point after this runs) AND dispatch an event (for a live
// flip the moment it loads). The page can also ask us to re-announce by
// dispatching "datapit-extension-query" (e.g. right after it mounts).
(() => {
  const VERSION = chrome.runtime.getManifest().version;

  function announce() {
    document.documentElement.setAttribute('data-datapit-extension', VERSION);
    window.dispatchEvent(new CustomEvent('datapit-extension-ready', { detail: { version: VERSION } }));
  }

  announce();
  // The app may add its listener / mount after we first fire — answer an
  // explicit query so it never misses us.
  window.addEventListener('datapit-extension-query', announce);
})();
