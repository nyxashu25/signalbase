# DataPit Chrome extension — DataPit — Contact Lookup

Free to install. Shows who is in DataPit on:

- **LinkedIn profiles** (`linkedin.com/in/…`) and **Sales Navigator leads**
  (`linkedin.com/sales/lead/…`): looked up automatically when the page opens.
  - **Found** → shows the match; *Reveal* costs **4 credits** (free if your
    workspace already revealed that contact).
  - **Not found** (profiles) → queued for the data team ("Pending peoples").
  - **Found, but the job title changed** → reported ("Childs found").
  - A Sales Navigator lead with no public profile link is matched by name and
    company, and isn't queued when missing.
- **Gmail, Google Calendar, HubSpot and Salesforce** (`apps.js`): the launcher
  counts the email addresses of the people in the open thread, draft, event
  or CRM record; opening the card looks them up (up to 10) and lists who is
  in DataPit, with a reveal for each. Only addresses are read, never message
  text.
- **Any company website**: click the toolbar icon — the popup looks up the
  site's domain (via `activeTab`) and lists the company and its people.

Plain Manifest V3, no build step — this folder loads as-is.

## Install (load unpacked)

Easiest path: log into DataPit and click **Install extension** on the
Dashboard — it downloads this as a zip, walks through the same steps below
in a modal, and detects the moment it connects (via `announce.js`, a content
script that marks the DataPit page — no fixed extension id needed; see
`EXTENSION_ID.md`).

Manually:

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
- `ui.js` — the shared shadow-DOM launcher and card every content script uses.
- `content.js` — LinkedIn: SPA-aware profile and Sales Navigator lead
  detection, the best-effort top-card parser (with a tab-title fallback).
- `apps.js` — Gmail, Google Calendar, HubSpot and Salesforce: per-app address
  collectors and the multi-person card.
- `popup.html/js` — connect/disconnect a key, see your credit balance, and
  look up the company behind the current website.
- `options.html/js` — API base override for local dev.

## What it captures

Exactly five fields per profile you open, nothing else: the person's
**name**, the **profile URL**, their **job title**, the **current
company's name**, and their **location**. No page text, no DOM dumps, no
browsing history — and it only ever runs on `linkedin.com/in/…` pages and
only talks to DataPit.

## A note on LinkedIn's terms

Automated collection from LinkedIn is against their User Agreement, even at
human browsing speed. The extension only reads pages you yourself open, and
only talks to DataPit — but the account doing the browsing carries that
risk. Use judgement.
