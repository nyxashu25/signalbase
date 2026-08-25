// DataPit extension — content script for linkedin.com.
//
// Injected on every LinkedIn page (LinkedIn is a SPA — a profile is usually
// reached by in-page navigation, where a /in/*-only content_script match
// would never fire). On profile pages it mounts a floating DataPit launcher
// that is ALWAYS visible, auto-runs the lookup, and shows an explicit
// verdict — "Found in DataPit" with a reveal button, or "Not in DataPit —
// queued" — plus a manual "Search this profile" button so the user is never
// staring at a page wondering whether anything happened. The parser is
// best-effort and the page's visible text always ships as a fallback, so a
// LinkedIn markup change degrades to "the data team reads the text", never
// to silence.

(() => {
  const DOM_TEXT_CAP = 200_000;
  const PROFILE_RE = /^https?:\/\/([^/]*\.)?linkedin\.com\/in\/([^/?#]+)/i;

  let lastSlug = null; // slug the card currently represents
  let lookedUpSlug = null; // slug the last completed lookup was for
  let ui = null; // { host, launcher, card, body, footer } once mounted
  let collapsed = false; // user closed the card -> only the bubble shows
  let busy = false; // a lookup is in flight

  const log = (...args) => console.debug('[DataPit]', ...args);

  // ---------------------------------------------------------------------
  // SPA-aware URL watching. On a profile: mount UI, auto-look-up once per
  // slug. Off a profile: hide everything.
  // ---------------------------------------------------------------------

  function currentSlug() {
    const match = location.href.match(PROFILE_RE);
    if (!match) return null;
    try {
      return decodeURIComponent(match[2]).toLowerCase();
    } catch {
      return match[2].toLowerCase();
    }
  }

  function tick() {
    const slug = currentSlug();
    if (!slug) {
      lastSlug = null;
      if (ui) ui.host.style.display = 'none';
      return;
    }
    if (!ui) mountUi();
    ui.host.style.display = '';
    if (slug !== lastSlug) {
      lastSlug = slug;
      collapsed = false;
      setCardVisible(true);
      lookUp(slug, { auto: true });
    }
  }

  // ---------------------------------------------------------------------
  // Parser: layered best-effort selectors over the profile top card. Every
  // field may come back null — the backend treats them all as optional and
  // domText is the safety net.
  // ---------------------------------------------------------------------

  function text(el) {
    return el?.textContent?.replace(/\s+/g, ' ').trim() || null;
  }

  // The tab title is the most markup-rot-proof source LinkedIn has:
  // "(3) Jane Doe | LinkedIn" when logged in, and often
  // "Jane Doe - VP Engineering - Nova Systems | LinkedIn" — parse it as
  // the fallback for anything the DOM selectors missed.
  function parseTitleTag() {
    let t = document.title || '';
    t = t.replace(/^\(\d+\)\s*/, '').replace(/\s*[|·]\s*LinkedIn\s*$/i, '').trim();
    if (!t || /^linkedin$/i.test(t)) return {};
    const segments = t.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean);
    return {
      name: segments[0] || null,
      jobTitle: segments[1] || null,
      companyName: segments[2] || null,
    };
  }

  function parseProfile() {
    const fromTitle = parseTitleTag();

    const name = text(document.querySelector('main h1, h1')) || fromTitle.name || null;

    const jobTitle =
      text(document.querySelector('main .text-body-medium.break-words')) ||
      text(document.querySelector('main [data-generated-suggestion-target]')) ||
      fromTitle.jobTitle ||
      null;

    const location_ =
      text(document.querySelector('main .text-body-small.inline.t-black--light.break-words')) ||
      null;

    let companyName = null;
    const companyBtn = document.querySelector(
      'main button[aria-label^="Current company"], main a[aria-label^="Current company"]',
    );
    if (companyBtn) {
      const aria = companyBtn.getAttribute('aria-label') || '';
      const m = aria.match(/^Current company:?\s*([^.]+)/i);
      companyName = (m && m[1].trim()) || text(companyBtn) || null;
    }
    companyName = companyName || fromTitle.companyName || null;

    const match = location.href.match(PROFILE_RE);
    const payload = {
      // Canonical /in/<slug> form — no query params or fragments.
      linkedinUrl: match ? `https://www.linkedin.com/in/${match[2]}` : location.href,
      name,
      jobTitle,
      location: location_,
      companyName,
      domText: (document.body?.innerText || '').slice(0, DOM_TEXT_CAP),
    };
    // Send only what was actually captured — a null field carries no
    // information, and older backends rejected nulls outright.
    for (const key of Object.keys(payload)) {
      if (payload[key] == null || payload[key] === '') delete payload[key];
    }
    return payload;
  }

  // ---------------------------------------------------------------------
  // Backend calls (via the background worker — see background.js).
  // ---------------------------------------------------------------------

  function send(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { ok: false, error: 'No response' });
          }
        });
      } catch (err) {
        // "Extension context invalidated" — the extension was reloaded
        // under this page; only a page refresh reconnects it.
        resolve({ ok: false, error: 'RELOADED', detail: String(err?.message || err) });
      }
    });
  }

  async function lookUp(slug, { auto = false } = {}) {
    if (busy) return;
    busy = true;
    renderLoading();

    // On auto-lookup right after navigation the profile header may not be
    // rendered yet — give it a few beats so the parser has something to
    // read, but never block the lookup on it (matching is by URL; parsed
    // fields are gravy).
    if (auto) {
      for (let i = 0; i < 10 && lastSlug === slug; i++) {
        const h1 = document.querySelector('main h1, h1');
        if (h1 && h1.textContent.trim()) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (lastSlug !== slug) {
      busy = false;
      return; // navigated away while waiting
    }

    const payload = parseProfile();
    log('observe', payload.linkedinUrl);
    const res = await send({ type: 'observe', payload });
    busy = false;
    if (lastSlug !== slug) return; // stale response — user moved on

    lookedUpSlug = slug;
    if (!res.ok) {
      if (res.error === 'NOT_CONNECTED') return renderSignedOut();
      if (res.error === 'RELOADED') {
        return renderError('DataPit was updated — refresh this page to reconnect.');
      }
      if (res.status === 429) return renderError('Rate limit reached — try again in a minute.');
      return renderError(res.error || 'Something went wrong.');
    }

    if (res.data.status === 'not_found') return renderNotFound(payload.name);
    renderFound(res.data);
  }

  async function revealContact(contactId, button) {
    button.disabled = true;
    button.textContent = 'Revealing…';
    const res = await send({ type: 'reveal', contactId });
    if (!res.ok) {
      button.disabled = false;
      button.textContent = 'Try again';
      if (res.status === 402) {
        renderErrorNote('Not enough credits — top up from Billing in DataPit.');
      } else {
        renderErrorNote(res.error || 'Reveal failed.');
      }
      return;
    }
    renderRevealed(res.data);
  }

  // ---------------------------------------------------------------------
  // UI — a shadow-DOM launcher bubble + card so LinkedIn's CSS can't touch
  // it. The bubble is ALWAYS visible on profile pages; the card opens over
  // it and collapses back to it.
  // ---------------------------------------------------------------------

  const STYLES = `
    :host { all: initial; }
    .wrap {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
      font: 13px/1.45 -apple-system, "Segoe UI", Roboto, sans-serif;
      display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
    }
    .launcher {
      width: 46px; height: 46px; border-radius: 50%; border: 0; cursor: pointer;
      background: linear-gradient(135deg,#7c3aed,#db2777); color: #fff;
      font-weight: 800; font-size: 18px;
      box-shadow: 0 6px 20px rgba(124,58,237,.5);
      display: flex; align-items: center; justify-content: center;
    }
    .launcher:hover { transform: scale(1.06); }
    .card {
      width: 320px; padding: 14px 16px; border-radius: 12px;
      background: #16121f; color: #f4f2f8;
      box-shadow: 0 8px 30px rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.12);
    }
    .card.hidden { display: none; }
    .brand { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .brand b { font-size: 12px; letter-spacing:.04em; text-transform:uppercase;
      background: linear-gradient(90deg,#a78bfa,#f472b6); -webkit-background-clip:text; background-clip:text; color:transparent; }
    .close { cursor:pointer; border:0; background:none; color:#8b8698; font-size:15px; line-height:1; padding:2px 4px; }
    .close:hover { color:#fff; }
    .title { font-weight:600; font-size:14px; color:#fff; }
    .muted { color:#a49fb3; font-size:12px; }
    .row { margin-top:8px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .value { font-family: ui-monospace, Consolas, monospace; font-size:12px; color:#e9e6f0;
      background: rgba(255,255,255,.07); border-radius:6px; padding:3px 7px; word-break:break-all; }
    .btn { cursor:pointer; border:0; border-radius:8px; padding:8px 13px; font-weight:700; font-size:12px;
      background: linear-gradient(90deg,#7c3aed,#db2777); color:#fff; }
    .btn:disabled { opacity:.55; cursor:default; }
    .btn.ghost { background: rgba(255,255,255,.09); }
    .pill { display:inline-block; border-radius:99px; padding:2px 8px; font-size:11px; font-weight:700; }
    .pill.ok { background: rgba(52,211,153,.15); color:#34d399; }
    .pill.info { background: rgba(167,139,250,.18); color:#c4b5fd; }
    .pill.warn { background: rgba(251,191,36,.15); color:#fbbf24; }
    .note { margin-top:8px; font-size:12px; color:#fca5a5; }
    .footer { margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,.08);
      display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .spin { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.25);
      border-top-color:#a78bfa; border-radius:50%; animation: dp-spin .8s linear infinite; }
    @keyframes dp-spin { to { transform: rotate(360deg); } }
  `;

  function mountUi() {
    const host = document.createElement('div');
    host.id = 'datapit-panel-host';
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLES;

    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.innerHTML = `
      <div class="card hidden">
        <div class="brand">
          <b>DataPit</b>
          <button class="close" title="Minimize" aria-label="Minimize DataPit panel">—</button>
        </div>
        <div class="body"></div>
        <div class="footer">
          <span class="muted" data-cost>Reveals cost 4 credits</span>
          <button class="btn ghost" data-search>Search this profile</button>
        </div>
      </div>
      <button class="launcher" title="DataPit — look up this profile" aria-label="Open DataPit">D</button>
    `;
    root.append(style, wrap);

    const card = wrap.querySelector('.card');
    const launcher = wrap.querySelector('.launcher');
    launcher.addEventListener('click', () => {
      collapsed = false;
      setCardVisible(true);
      // Fresh slug (or an earlier failure) -> run the lookup on open.
      if (lastSlug && lookedUpSlug !== lastSlug) lookUp(lastSlug);
    });
    card.querySelector('.close').addEventListener('click', () => {
      collapsed = true;
      setCardVisible(false);
    });
    card.querySelector('[data-search]').addEventListener('click', () => {
      if (lastSlug) {
        lookedUpSlug = null;
        lookUp(lastSlug);
      }
    });

    document.documentElement.appendChild(host);
    ui = { host, launcher, card, body: card.querySelector('.body') };
  }

  function setCardVisible(visible) {
    if (!ui) return;
    ui.card.classList.toggle('hidden', !visible || collapsed);
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderLoading() {
    ui.body.innerHTML = `<div class="row"><span class="spin"></span><span class="muted">Checking this profile against DataPit…</span></div>`;
  }

  function renderSignedOut() {
    ui.body.innerHTML = `
      <div class="title">Connect DataPit</div>
      <div class="muted" style="margin-top:4px">Click the DataPit icon in your toolbar and paste an API key from Settings → API &amp; Extension.</div>
    `;
  }

  function renderNotFound(name) {
    ui.body.innerHTML = `
      <div class="row" style="margin-top:0"><span class="pill info">✗ Not in DataPit</span></div>
      <div class="title" style="margin-top:6px">${esc(name || 'This profile')} isn’t in the database yet</div>
      <div class="muted" style="margin-top:4px">It’s been queued for our data team — it’ll be sourced and added.</div>
    `;
  }

  function renderFound(data) {
    const c = data.contact;
    const fullName = `${c.firstName} ${c.lastName}`.trim();
    const already = c.revealed;
    ui.body.innerHTML = `
      <div class="row" style="margin-top:0"><span class="pill ok">✓ Found in DataPit</span>
        ${data.titleChangeReported ? `<span class="pill warn">Title change reported</span>` : ''}</div>
      <div class="title" style="margin-top:6px">${esc(fullName)}</div>
      <div class="muted" style="margin-top:2px">${esc(c.title || '')}${c.company ? ` · ${esc(c.company.name)}` : ''}</div>
      ${already
        ? `<div class="row"><span class="value" data-copy>${esc(c.email || '—')}</span></div>
           ${c.phone ? `<div class="row"><span class="value" data-copy>${esc(c.phone)}</span></div>` : ''}
           <div class="muted" style="margin-top:6px">Already revealed by your workspace — free.</div>`
        : `<div class="row">
             <button class="btn" data-reveal>Reveal email &amp; phone · ${data.cost} credits</button>
           </div>
           ${c.hasPhone ? '' : `<div class="muted" style="margin-top:6px">No phone on file for this contact.</div>`}`
      }
    `;
    const revealBtn = ui.body.querySelector('[data-reveal]');
    if (revealBtn) revealBtn.addEventListener('click', () => revealContact(c.id, revealBtn));
    wireCopy();
  }

  function renderRevealed(result) {
    ui.body.innerHTML = `
      <div class="row" style="margin-top:0"><span class="pill ok">${result.alreadyRevealed ? '✓ Already unlocked — free' : '✓ Revealed'}</span></div>
      <div class="row"><span class="value" data-copy>${esc(result.email || 'No email found')}</span></div>
      ${result.phone ? `<div class="row"><span class="value" data-copy>${esc(result.phone)}</span></div>` : `<div class="muted" style="margin-top:6px">No phone on file.</div>`}
      <div class="muted" style="margin-top:6px">${result.emailVerified ? 'Email verified ✓' : 'Email unverified — pattern-matched'} · click a value to copy</div>
    `;
    wireCopy();
  }

  function wireCopy() {
    ui.body.querySelectorAll('[data-copy]').forEach((el) => {
      el.style.cursor = 'pointer';
      el.title = 'Click to copy';
      el.addEventListener('click', () => {
        navigator.clipboard?.writeText(el.textContent).then(() => {
          const original = el.textContent;
          el.textContent = 'Copied ✓';
          setTimeout(() => { el.textContent = original; }, 900);
        });
      });
    });
  }

  function renderError(message) {
    ui.body.innerHTML = `
      <div class="title">Hmm, that didn’t work</div>
      <div class="note">${esc(message)}</div>
      <div class="muted" style="margin-top:6px">Use “Search this profile” below to retry.</div>
    `;
    lookedUpSlug = null; // let the launcher/search button retry
  }

  function renderErrorNote(message) {
    const existing = ui.body.querySelector('.note');
    if (existing) existing.remove();
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = message;
    ui.body.appendChild(note);
  }

  // -- start ------------------------------------------------------------
  // Last in the file on purpose: tick() -> mountUi() touches consts
  // (STYLES) that only exist once the whole module body has run — calling
  // it any earlier is a TDZ crash on direct profile loads (caught by the
  // jsdom harness).
  setInterval(tick, 700);
  // Don't wait 700ms for the first paint on a direct profile load.
  tick();
  log('content script loaded', location.href);
})();
