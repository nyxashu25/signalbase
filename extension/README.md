# DataPit Chrome extension

Looks up every LinkedIn profile you open against DataPit:

- **Found** → shows the match; *Reveal email & phone* costs **4 credits**
  (free if your workspace already revealed that contact).
- **Not found** → the profile is queued for the data team ("Pending
  peoples" in the admin control panel).
- **Found, but the job title changed** → the change is reported ("Childs
  found" in the admin control panel); everything else works as normal.

Plain Manifest V3, no build step — this folder loads as-is.

## Install (load unpacked)

1. In DataPit, go to **Settings → API & Extension**, create an API key and
   copy it (it's shown only once).
2. Open `chrome://extensions`, switch on **Developer mode** (top right).
3. Click **Load unpacked** and pick this `extension/` folder.
4. Click the DataPit icon in the toolbar, paste the key, **Connect**.
5. Open any `linkedin.com/in/…` profile — the DataPit card appears at the
   bottom-right.

## Local development

The extension talks to `https://datapit.io/api/v1` by default. To point it
at a local backend: right-click the extension icon → **Options** → set the
API base to `http://localhost:4000/api/v1`. (The dev origin is already in
`host_permissions`.)

## How it's wired

- `background.js` — the only code that talks to the API; holds the key in
  `chrome.storage.local` (never visible to LinkedIn page scripts).
- `content.js` — SPA-aware profile detection (URL watcher), a best-effort
  top-card parser, and the shadow-DOM result panel. Always ships the page's
  visible text (capped) as `domText`, so when LinkedIn's markup changes the
  pipeline degrades to "admin reads the text" instead of breaking.
- `popup.html/js` — connect/disconnect a key, see your credit balance.
- `options.html/js` — API base override for local dev.

## A note on LinkedIn's terms

Automated collection from LinkedIn is against their User Agreement, even at
human browsing speed. The extension only reads pages you yourself open, and
only talks to DataPit — but the account doing the browsing carries that
risk. Use judgement.
