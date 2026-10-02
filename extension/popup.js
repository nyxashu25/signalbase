// DataPit extension popup — connect/disconnect an API key and show status.

const $ = (id) => document.getElementById(id);

function send(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) =>
      resolve(response || { ok: false, error: 'No response' }),
    );
  });
}

function show(state) {
  for (const id of ['connect', 'connected', 'loading']) {
    $(id).classList.toggle('hidden', id !== state);
  }
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Sites with their own on-page DataPit card (content.js, apps.js).
const APP_HOSTS = /(^|\.)(linkedin\.com|mail\.google\.com|calendar\.google\.com|hubspot\.com|lightning\.force\.com|my\.salesforce\.com)$/i;
const OWN_HOSTS = /^(datapit\.io|localhost|127\.0\.0\.1)$/i;

// activeTab: opening this popup grants access to the current tab's URL —
// nothing is read until the user clicks the icon, and only the hostname
// leaves the browser.
function activeTab() {
  return new Promise((resolve) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs?.[0] || null));
    } catch {
      resolve(null);
    }
  });
}

function siteMessage(html) {
  $('site-body').innerHTML = html;
  $('site').classList.remove('hidden');
}

async function siteLookup() {
  const tab = await activeTab();
  let host = null;
  try {
    const url = new URL(tab?.url || '');
    if (/^https?:$/.test(url.protocol)) host = url.hostname.replace(/^www\./, '');
  } catch {
    /* chrome://, file://, the new-tab page… */
  }
  if (!host || OWN_HOSTS.test(host)) return;
  if (APP_HOSTS.test(host)) {
    siteMessage('<div class="muted" style="margin-top:6px">The DataPit card is on the page, at the bottom right.</div>');
    return;
  }
  siteMessage(`<div class="muted" style="margin-top:6px">Looking up ${esc(host)}…</div>`);
  const res = await send({ type: 'company', domain: host });
  if (!res.ok) {
    const message = res.status === 422 ? 'This page has no company website to look up.' : res.error || 'Lookup failed.';
    siteMessage(`<div class="error">${esc(message)}</div>`);
    return;
  }
  if (res.data.status === 'not_found') {
    siteMessage(`<div class="muted" style="margin-top:6px">${esc(host)} isn’t in DataPit yet.</div>`);
    return;
  }
  renderCompany(res.data);
}

function personHtml(c) {
  const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  const sub = [c.title, c.seniority].filter(Boolean).join(' · ');
  const action = c.revealed
    ? `<span class="value" data-copy>${esc(c.email || '—')}</span>${c.phone ? ` <span class="value" data-copy>${esc(c.phone)}</span>` : ''}`
    : `<button class="ghost" data-reveal="${esc(c.id)}">Reveal · ${c.cost} cr</button>`;
  return `<div class="person">
    <div class="name">${esc(name)}</div>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
    ${action}
  </div>`;
}

function renderCompany(data) {
  const co = data.company;
  const meta = [co.industry, co.size && `${co.size} employees`, co.location].filter(Boolean).join(' · ');
  const more = data.total - data.contacts.length;
  siteMessage(`
    <div class="co">${esc(co.name)}</div>
    ${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
    <div class="meta">${data.total} ${data.total === 1 ? 'person' : 'people'} in DataPit</div>
    <div class="people">${data.contacts.map(personHtml).join('')}</div>
    ${more > 0 ? `<div class="muted" style="margin-top:6px">${more} more — search ${esc(co.name)} in DataPit to see everyone.</div>` : ''}
  `);
  wireSite(data);
}

function wireSite(data) {
  $('site-body').querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', () => navigator.clipboard?.writeText(el.textContent));
  });
  $('site-body').querySelectorAll('[data-reveal]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.getAttribute('data-reveal');
      button.disabled = true;
      button.textContent = 'Revealing…';
      const res = await send({ type: 'reveal', contactId: id });
      if (!res.ok) {
        button.disabled = false;
        button.textContent = res.status === 402 ? 'Not enough credits' : 'Try again';
        return;
      }
      const contact = data.contacts.find((c) => c.id === id);
      Object.assign(contact, { revealed: true, email: res.data.email, phone: res.data.phone, cost: 0 });
      renderCompany(data);
      refreshBalance();
    });
  });
}

async function refreshBalance() {
  const res = await send({ type: 'status' });
  if (res.ok) $('balance').textContent = res.me.balance;
}

function renderConnected(me) {
  $('who').textContent = `${me.user.name} · ${me.user.email}`;
  $('workspace').textContent = `${me.workspace.name} — ${me.workspace.plan} plan`;
  $('balance').textContent = me.balance;
  $('cost').textContent = `Reveals cost ${me.revealCost} credits (already-revealed contacts are free).`;
  show('connected');
  siteLookup();
}

async function refresh() {
  show('loading');
  const res = await send({ type: 'status' });
  if (res.ok) {
    renderConnected(res.me);
  } else {
    show('connect');
    if (res.error && res.error !== 'NOT_CONNECTED') {
      $('connect-error').textContent = res.error;
      $('connect-error').classList.remove('hidden');
    }
  }
}

$('save').addEventListener('click', async () => {
  const key = $('key').value.trim();
  if (!key) return;
  $('save').disabled = true;
  $('save').textContent = 'Connecting…';
  $('connect-error').classList.add('hidden');
  const res = await send({ type: 'saveKey', key });
  $('save').disabled = false;
  $('save').textContent = 'Connect';
  if (res.ok) {
    renderConnected(res.me);
  } else {
    $('connect-error').textContent = res.error || 'Could not connect.';
    $('connect-error').classList.remove('hidden');
  }
});

$('key').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('save').click();
});

$('disconnect').addEventListener('click', async () => {
  await send({ type: 'clearKey' });
  $('key').value = '';
  show('connect');
});

refresh();
