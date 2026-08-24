// DataPit extension — content script for linkedin.com.
//
// Injected on every LinkedIn page (LinkedIn is a SPA — a profile is usually
// reached by in-page navigation, where a /in/*-only content_script match
// would never fire), but does nothing until the URL is a profile page.
// Watches the URL, waits for the profile header to render, parses what it
// can, and always ships the page's visible text as a fallback so a LinkedIn
// markup change degrades to "the data team reads the text" instead of
// silently sending garbage.

(() => {
  const DOM_TEXT_CAP = 200_000;
  const PROFILE_RE = /^https?:\/\/([^/]*\.)?linkedin\.com\/in\/([^/?#]+)/i;

  let lastSlug = null;
  let panel = null; // { host, root, body } once created

  // ---------------------------------------------------------------------
  // SPA-aware profile detection: cheap URL poll + a scan retry loop that
  // waits for the header <h1> to exist before parsing.
  // ---------------------------------------------------------------------

  setInterval(() => {
    const match = location.href.match(PROFILE_RE);
    if (!match) {
      lastSlug = null;
      hidePanel();
      return;
    }
    const slug = decodeSlug(match[2]);
    if (slug === lastSlug) return;
    lastSlug = slug;
    waitForHeader(slug, 20); // ~10s of retries
  }, 700);

  function decodeSlug(raw) {
    try {
      return decodeURIComponent(raw).toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }

  function waitForHeader(slug, retriesLeft) {
    if (lastSlug !== slug) return; // navigated away meanwhile
    const h1 = document.querySelector('main h1, h1');
    if (h1 && h1.textContent.trim()) {
      observeProfile(slug);
    } else if (retriesLeft > 0) {
      setTimeout(() => waitForHeader(slug, retriesLeft - 1), 500);
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

  function parseProfile() {
    const name = text(document.querySelector('main h1, h1'));

    // Headline ("job title") — the text-body-medium div right under the
    // name in today's markup; fall back to the og:description-ish meta.
    const jobTitle =
      text(document.querySelector('main .text-body-medium.break-words')) ||
      text(document.querySelector('main [data-generated-suggestion-target]')) ||
      null;

    // Location — small muted line in the top card.
    const location =
      text(document.querySelector('main .text-body-small.inline.t-black--light.break-words')) ||
      null;

    // Current company — the top-card right-rail button carries an
    // aria-label like "Current company: Acme. Click to skip to experience
    // card"; fall back to its visible label.
    let companyName = null;
    const companyBtn = document.querySelector(
      'main button[aria-label^="Current company"], main a[aria-label^="Current company"]',
    );
    if (companyBtn) {
      const aria = companyBtn.getAttribute('aria-label') || '';
      const m = aria.match(/^Current company:?\s*([^.]+)/i);
      companyName = (m && m[1].trim()) || text(companyBtn) || null;
    }

    return {
      linkedinUrl: location_href_clean(),
      name,
      jobTitle,
      location,
      companyName,
      domText: (document.body?.innerText || '').slice(0, DOM_TEXT_CAP),
    };
  }

  function location_href_clean() {
    // Send the canonical /in/<slug> form — no query params or fragments.
    const match = location.href.match(PROFILE_RE);
    return match ? `https://www.linkedin.com/in/${match[2]}` : location.href;
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
        resolve({ ok: false, error: String(err?.message || err) });
      }
    });
  }

  async function observeProfile(slug) {
    showPanel();
    renderLoading();

    const payload = parseProfile();
    const res = await send({ type: 'observe', payload });
    if (lastSlug !== slug) return; // stale response — user moved on

    if (!res.ok) {
      if (res.error === 'NOT_CONNECTED') return renderSignedOut();
      if (res.status === 429) return renderError('Rate limit reached — try again in a bit.');
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
  // Panel UI — a shadow-DOM card so LinkedIn's CSS can't touch it.
  // ---------------------------------------------------------------------

  const STYLES = `
    .card {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
      width: 300px; padding: 14px 16px; border-radius: 12px;
      background: #16121f; color: #f4f2f8;
      font: 13px/1.45 -apple-system, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 8px 30px rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.12);
    }
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
    .btn { cursor:pointer; border:0; border-radius:8px; padding:7px 12px; font-weight:700; font-size:12px;
      background: linear-gradient(90deg,#7c3aed,#db2777); color:#fff; }
    .btn:disabled { opacity:.55; cursor:default; }
    .btn.ghost { background: rgba(255,255,255,.09); }
    .pill { display:inline-block; border-radius:99px; padding:2px 8px; font-size:11px; font-weight:700; }
    .pill.ok { background: rgba(52,211,153,.15); color:#34d399; }
    .pill.info { background: rgba(167,139,250,.18); color:#c4b5fd; }
    .pill.warn { background: rgba(251,191,36,.15); color:#fbbf24; }
    .note { margin-top:8px; font-size:12px; color:#fca5a5; }
    .spin { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.25);
      border-top-color:#a78bfa; border-radius:50%; animation: dp-spin .8s linear infinite; }
    @keyframes dp-spin { to { transform: rotate(360deg); } }
  `;

  function showPanel() {
    if (panel) {
      panel.host.style.display = '';
      return;
    }
    const host = document.createElement('div');
    host.id = 'datapit-panel-host';
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="brand">
        <b>DataPit</b>
        <button class="close" title="Hide" aria-label="Hide DataPit panel">✕</button>
      </div>
      <div class="body"></div>
    `;
    root.append(style, card);
    card.querySelector('.close').addEventListener('click', () => hidePanel());
    document.documentElement.appendChild(host);
    panel = { host, root, body: card.querySelector('.body') };
  }

  function hidePanel() {
    if (panel) panel.host.style.display = 'none';
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderLoading() {
    panel.body.innerHTML = `<div class="row"><span class="spin"></span><span class="muted">Checking DataPit…</span></div>`;
  }

  function renderSignedOut() {
    panel.body.innerHTML = `
      <div class="title">Connect DataPit</div>
      <div class="muted" style="margin-top:4px">Click the DataPit icon in your toolbar and paste an API key from Settings → API &amp; Extension.</div>
    `;
  }

  function renderNotFound(name) {
    panel.body.innerHTML = `
      <div class="title">${esc(name || 'This profile')} isn’t in DataPit yet</div>
      <div class="row"><span class="pill info">Queued for our data team</span></div>
      <div class="muted" style="margin-top:6px">We’ve recorded it — it’ll be sourced and added to the database.</div>
    `;
  }

  function renderFound(data) {
    const c = data.contact;
    const fullName = `${c.firstName} ${c.lastName}`.trim();
    const already = c.revealed;
    panel.body.innerHTML = `
      <div class="title">${esc(fullName)} <span class="pill ok">Found in DataPit</span></div>
      <div class="muted" style="margin-top:2px">${esc(c.title || '')}${c.company ? ` · ${esc(c.company.name)}` : ''}</div>
      ${data.titleChangeReported ? `<div class="row"><span class="pill warn">Title change reported</span></div>` : ''}
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
    const revealBtn = panel.body.querySelector('[data-reveal]');
    if (revealBtn) revealBtn.addEventListener('click', () => revealContact(c.id, revealBtn));
    wireCopy();
  }

  function renderRevealed(result) {
    panel.body.innerHTML = `
      <div class="title">Revealed <span class="pill ok">${result.alreadyRevealed ? 'Free — already unlocked' : 'Done'}</span></div>
      <div class="row"><span class="value" data-copy>${esc(result.email || 'No email found')}</span></div>
      ${result.phone ? `<div class="row"><span class="value" data-copy>${esc(result.phone)}</span></div>` : `<div class="muted" style="margin-top:6px">No phone on file.</div>`}
      <div class="muted" style="margin-top:6px">${result.emailVerified ? 'Email verified ✓' : 'Email unverified — pattern-matched'}</div>
    `;
    wireCopy();
  }

  function wireCopy() {
    panel.body.querySelectorAll('[data-copy]').forEach((el) => {
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
    panel.body.innerHTML = `
      <div class="title">Hmm, that didn’t work</div>
      <div class="note">${esc(message)}</div>
    `;
  }

  function renderErrorNote(message) {
    const existing = panel.body.querySelector('.note');
    if (existing) existing.remove();
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = message;
    panel.body.appendChild(note);
  }
})();
