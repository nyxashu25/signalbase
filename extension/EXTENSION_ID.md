# Extension ID

`manifest.json`'s `key` field pins this extension's Chrome-assigned id to:

```
cdfkakmanagglkhamigfaoallhiigdla
```

Without a pinned `key`, Chrome derives the id from the absolute filesystem
path of the unpacked folder — unpredictable, and different per machine. A
pinned id is required for `externally_connectable` to work: the Dashboard's
"Install extension" detector (`frontend/src/hooks/useExtensionInstalled.js`)
pings this exact id via `chrome.runtime.sendMessage`, so it only ever needs
to change if `key` in `manifest.json` changes.

**Keep the `key` field in `manifest.json` untouched** — regenerating it
(e.g. by re-running the keygen below) changes the id and breaks detection
for anyone who already has the extension installed, until they reinstall.

## Two builds (`scripts/build-extension-zip.py`)

The `key` field is valid for load-unpacked but the **Chrome Web Store
rejects it** ("key field is not allowed in manifest"). So the build script
emits two zips:

- **`frontend/public/downloads/datapit-extension.zip`** — load-unpacked
  build, `key` kept. This is the Dashboard download; it always loads with
  the pinned id above, so the detector works. Served to end users.
- **`extension-build/datapit-extension-webstore.zip`** — Web Store upload,
  `key` (and `update_url`) stripped. **Not** served publicly (a keyless
  build loaded unpacked would get a random id the detector can't see);
  it exists only for the maintainer to upload to the store.

## When published to the Web Store

The store assigns the published extension **its own id** (not the pinned
`cdfkak…` one). After the first publish:

1. Copy the published id from the store dashboard / listing URL.
2. Add it to `useExtensionInstalled.js` — detect **both** ids (the pinned
   load-unpacked id AND the store id) so both install methods are
   recognized during the transition.
3. Point the Dashboard's primary "Add to Chrome" link at
   `https://chromewebstore.google.com/detail/<published-id>`.

## The private key

Generated once with:

```
openssl genrsa -out ext_private.pem 2048
openssl rsa -in ext_private.pem -pubout -outform DER -out ext_public.der
```

The private key is **not committed to this repo** (no reason for it to be —
`manifest.json`'s `key` field is the public key only, which is what Chrome
needs). It matters again only if this extension is later uploaded to the
Chrome Web Store *and* you want that published version to keep this same
id — Web Store's "keep the same ID" flow asks for it during the first
upload. If that's not something you care about, the private key can be
discarded; the Web Store will just assign its own id on publish, and the
Dashboard's detector would need updating to match at that point.
