# Detection & the Web Store

Since **v0.4.0** the extension has **no `key` field** in its manifest, and no
pinned extension id. This is deliberate:

- The Chrome Web Store **rejects** the `key` field ("key field is not allowed
  in manifest"), so a keyless manifest is what uploads cleanly. The store
  assigns the published extension its own id.
- Detection no longer depends on the id. `announce.js` (a content script that
  runs on `datapit.io` and `localhost:5173`) marks the page —
  `document.documentElement[data-datapit-extension] = <version>` plus a
  `datapit-extension-ready` event — and the app reads that
  (`frontend/src/hooks/useExtensionInstalled.js`). So the same one build is
  detected however it was installed: load-unpacked (any path/id) or the Web
  Store (store id).

## One build for everything

`scripts/build-extension-zip.py` produces a single
`frontend/public/downloads/datapit-extension.zip`. That same file is:

- the load-unpacked download served from the Dashboard / Settings, and
- the zip you upload to the Chrome Web Store.

No keyed/keyless variants, no private key to keep. (The old
`ext_private.pem` from the pinned-id era is no longer used and can be
discarded.)

## When published to the Web Store

Because detection is id-independent, **nothing needs to change in the app**
when the store assigns its id — announce.js will mark the page the same way.
The only optional follow-up is to point the Dashboard's primary button at a
one-click `https://chromewebstore.google.com/detail/<published-id>` "Add to
Chrome" link instead of the load-unpacked download.
