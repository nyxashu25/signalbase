// DataPit extension — content script for Gmail, Google Calendar, HubSpot and
// Salesforce.
//
// On each of these apps the launcher (ui.js) appears when the page shows
// people — an open email thread or draft, a calendar event, a CRM record —
// with a count of the addresses it can see. Nothing is sent anywhere until
// the user opens the card: then the visible addresses (and only the
// addresses — no message bodies, subjects or other page text) go to DataPit
// in one lookup, and the card lists who is in DataPit, with a reveal button
// for each.

(() => {
  const UI = globalThis.DataPitUI;
  const MAX_PEOPLE = 10;
  const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

  // Addresses that are never a person to look up.
  const SKIP_LOCAL = /^(no-?reply|do-?not-?reply|notifications?|mailer-daemon|postmaster|calendar-notification|bounce|invitations?)([+.-]|$)/i;
  const SKIP_DOMAIN = /(^|\.)(calendar\.google\.com|googlegroups\.com|docs\.google\.com)$/i;

  // Open shadow roots too: Salesforce Lightning renders record fields inside
  // web components.
  function deepQueryAll(root, selector, out = [], depth = 0) {
    out.push(...root.querySelectorAll(selector));
    if (depth < 6) {
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) deepQueryAll(el.shadowRoot, selector, out, depth + 1);
      }
    }
    return out;
  }

  const attrEmails = (root, selector, attr) =>
    Array.from(root.querySelectorAll(selector)).map((el) => el.getAttribute(attr) || '');

  const mailtoEmails = (elements) =>
    elements.map((a) => decodeURIComponent((a.getAttribute('href') || '').replace(/^mailto:/i, '').split('?')[0]));

  // ---------------------------------------------------------------------
  // One adapter per app: when to show the launcher, which addresses the page
  // shows, and whose own address to leave out.
  // ---------------------------------------------------------------------

  const ADAPTERS = [
    {
      id: 'gmail',
      tag: 'MAIL//SCAN',
      host: /^mail\.google\.com$/,
      // People in the open thread (sender and recipients carry an `email`
      // attribute) and in any open draft's recipient chips. The inbox list
      // marks senders the same way, so the main view counts only while a
      // thread is open (its id ends the URL hash: #inbox/FMfcgz…).
      collect() {
        const threadOpen = /^[A-Za-z0-9_-]{16,}$/.test(location.hash.split('/').pop() || '');
        const scopes = [threadOpen ? document.querySelector('[role="main"]') : null, ...document.querySelectorAll('[role="dialog"]')].filter(Boolean);
        return scopes.flatMap((scope) => [
          ...attrEmails(scope, '[email]', 'email'),
          ...attrEmails(scope, '[data-hovercard-id*="@"]', 'data-hovercard-id'),
        ]);
      },
      // Gmail's tab title carries the signed-in address: "Inbox (3) - jane@acme.com - Gmail".
      self() {
        return (document.title.match(EMAIL) || []).map((e) => e.toLowerCase());
      },
    },
    {
      id: 'calendar',
      tag: 'CAL//SCAN',
      host: /^calendar\.google\.com$/,
      // Guests of the event that's open (its details dialog, or the full
      // edit page).
      collect() {
        const scopes = [...document.querySelectorAll('[role="dialog"]')];
        if (/\/eventedit|\/r\/eventedit/.test(location.pathname)) scopes.push(document.querySelector('[role="main"]'));
        return scopes.filter(Boolean).flatMap((scope) => [
          ...attrEmails(scope, '[data-email]', 'data-email'),
          ...attrEmails(scope, '[data-hovercard-id*="@"]', 'data-hovercard-id'),
        ]);
      },
      self: () => [],
    },
    {
      id: 'hubspot',
      tag: 'CRM//SCAN',
      host: /^app(-[a-z0-9]+)?\.hubspot\.com$/,
      // Contact and company records.
      active: () => /\/(record|contacts\/\d+\/(contact|company))\//.test(location.pathname),
      collect() {
        const root = document.querySelector('main') || document.body;
        return [
          ...mailtoEmails(Array.from(root.querySelectorAll('a[href^="mailto:"]'))),
          ...visibleTextEmails(root),
        ];
      },
      self: () => [],
    },
    {
      id: 'salesforce',
      tag: 'CRM//SCAN',
      host: /(\.lightning\.force\.com|\.my\.salesforce\.com)$/,
      // Lead, contact, account and opportunity records.
      active: () => /\/lightning\/r\/(Lead|Contact|Account|Opportunity)\//i.test(location.pathname),
      collect: () => mailtoEmails(deepQueryAll(document, 'a[href^="mailto:"]')),
      self: () => [],
    },
  ];

  // CRM record pages also show addresses as plain text (HubSpot's email
  // property): read text, capped, never sent unless the user opens the card.
  function visibleTextEmails(root) {
    return pageText(root).slice(0, 20000).match(EMAIL) || [];
  }

  // The text nodes joined with spaces, so neighbouring fields never run
  // together. (Not innerText: that forces a layout on every poll.)
  function pageText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts = [];
    let length = 0;
    for (let node = walker.nextNode(); node && length < 20000; node = walker.nextNode()) {
      parts.push(node.nodeValue);
      length += node.nodeValue.length;
    }
    return parts.join(' ');
  }

  const adapter = ADAPTERS.find((a) => a.host.test(location.hostname));
  if (!adapter) return;

  let ui = null;
  let open = false;
  let selfEmails = new Set();
  let signature = '';
  let addresses = [];
  const results = new Map(); // email -> lookup result, for this tab session
  let pending = null; // in-flight lookup promise

  /** The distinct, lookup-worthy addresses on the page right now. */
  function pageAddresses() {
    if (adapter.active && !adapter.active()) return [];
    const own = new Set([...selfEmails, ...adapter.self()]);
    const seen = new Set();
    for (const raw of adapter.collect()) {
      const email = String(raw).trim().toLowerCase();
      const at = email.lastIndexOf('@');
      if (at < 1) continue;
      if (own.has(email) || SKIP_LOCAL.test(email.slice(0, at)) || SKIP_DOMAIN.test(email.slice(at + 1))) continue;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      seen.add(email);
    }
    return Array.from(seen);
  }

  function tick() {
    const found = pageAddresses();
    const next = found.join(',');
    if (!found.length) {
      signature = '';
      addresses = [];
      if (ui) ui.host.style.display = 'none';
      return;
    }
    if (!ui) mountUi();
    ui.host.style.display = '';
    ui.setBadge(found.length);
    if (next !== signature) {
      signature = next;
      addresses = found;
      if (open) lookUpAndRender();
    }
  }

  function mountUi() {
    ui = UI.mount({ tag: adapter.tag, refreshLabel: 'Refresh', launcherTitle: 'DataPit — look up the people on this page' });
    ui.launcher.addEventListener('click', () => {
      open = true;
      ui.setVisible(true);
      lookUpAndRender();
    });
    ui.close.addEventListener('click', () => {
      open = false;
      ui.setVisible(false);
    });
    ui.refresh.addEventListener('click', () => {
      for (const email of addresses) results.delete(email);
      lookUpAndRender();
    });
  }

  async function lookUpAndRender() {
    await loadSelf();
    const shown = addresses.slice(0, MAX_PEOPLE);
    const missing = shown.filter((email) => !results.has(email));
    if (missing.length) {
      if (!results.size) ui.body.innerHTML = `<div class="row"><span class="spin"></span><span class="muted">Checking ${shown.length} ${shown.length === 1 ? 'person' : 'people'} against DataPit…</span></div>`;
      pending = UI.send({ type: 'lookupEmails', emails: missing });
      const res = await pending;
      pending = null;
      if (!res.ok) {
        if (res.error === 'NOT_CONNECTED') {
          ui.body.innerHTML = UI.CONNECT_HTML;
          return;
        }
        ui.body.innerHTML = `<div class="title">Hmm, that didn’t work</div><div class="note">${UI.esc(UI.errorText(res))}</div>`;
        return;
      }
      for (const r of res.data.results) results.set(r.email, r);
      // An address the server dropped as malformed won't come back; remember it as not found.
      for (const email of missing) if (!results.has(email)) results.set(email, { email, status: 'not_found' });
    }
    render(shown, addresses.length - shown.length);
  }

  function personHtml(r) {
    const esc = UI.esc;
    if (r.status !== 'found') {
      return `<div class="person" data-email="${esc(r.email)}">
        <div class="addr">${esc(r.email)}</div>
        <div class="sub">Not in DataPit</div>
      </div>`;
    }
    const c = r.contact;
    const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || r.email;
    const sub = [c.title, c.company?.name].filter(Boolean).join(' · ');
    const body = c.revealed
      ? `<div class="row"><span class="value" data-copy>${esc(c.email || r.email)}</span></div>
         ${c.phone ? `<div class="row"><span class="value" data-copy>${esc(c.phone)}</span></div>` : ''}`
      : `<div class="row"><button class="btn" data-reveal="${esc(c.id)}">${c.hasPhone ? 'Reveal email &amp; phone' : 'Reveal'} · ${r.cost} cr</button></div>`;
    return `<div class="person" data-email="${esc(r.email)}">
      <div class="name">${esc(name)}</div>
      ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
      <div class="addr">${esc(r.email)}</div>
      ${body}
    </div>`;
  }

  function render(shown, hiddenCount) {
    const rows = shown.map((email) => results.get(email)).filter(Boolean);
    const found = rows.filter((r) => r.status === 'found').length;
    ui.body.innerHTML = `
      <div class="row" style="margin-top:0"><span class="pill ${found ? 'ok' : 'info'}">${found} of ${rows.length} in DataPit</span></div>
      <div class="people">${rows.map(personHtml).join('')}</div>
      ${hiddenCount > 0 ? `<div class="muted" style="margin-top:6px">${hiddenCount} more on this page not shown.</div>` : ''}
    `;
    ui.body.querySelectorAll('[data-reveal]').forEach((button) => {
      button.addEventListener('click', () => reveal(button));
    });
    UI.wireCopy(ui.body);
  }

  async function reveal(button) {
    const row = button.closest('.person');
    const email = row.getAttribute('data-email');
    button.disabled = true;
    button.textContent = 'Revealing…';
    const res = await UI.send({ type: 'reveal', contactId: button.getAttribute('data-reveal') });
    if (!res.ok) {
      button.disabled = false;
      button.textContent = 'Try again';
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = UI.errorText(res) || 'Reveal failed.';
      row.appendChild(note);
      return;
    }
    const prev = results.get(email);
    results.set(email, {
      ...prev,
      cost: 0,
      contact: { ...prev.contact, revealed: true, email: res.data.email, phone: res.data.phone },
    });
    render(addresses.slice(0, MAX_PEOPLE), addresses.length - Math.min(addresses.length, MAX_PEOPLE));
  }

  // The signed-in DataPit user's own address is never looked up. Asked for
  // once, when the card first opens — nothing is sent before that.
  let selfLoaded = false;
  async function loadSelf() {
    if (selfLoaded) return;
    selfLoaded = true;
    const res = await UI.send({ type: 'status' });
    if (res.ok && res.me?.user?.email) {
      selfEmails = new Set([res.me.user.email.toLowerCase()]);
      addresses = pageAddresses();
      signature = addresses.join(',');
    }
  }

  // Test hook (jsdom): expose the pure parts without running the poller.
  if (globalThis.__DATAPIT_TEST__) {
    globalThis.__DataPitApps = { adapter, pageAddresses, ADAPTERS };
    return;
  }

  // CRM pages are heavier to scan than Gmail and Calendar.
  setInterval(tick, adapter.id === 'hubspot' || adapter.id === 'salesforce' ? 3000 : 1500);
  tick();
})();
