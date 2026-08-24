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
