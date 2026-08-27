// DataPit extension — content script for linkedin.com.
//
// Injected on every LinkedIn page (LinkedIn is a SPA — a profile is usually
// reached by in-page navigation, where a /in/*-only content_script match
// would never fire). On profile pages it mounts a floating DataPit launcher
// that is ALWAYS visible, auto-runs the lookup, and shows an explicit
// verdict — "Found in DataPit" with a reveal button, or "Not in DataPit —
// queued" — plus a manual "Search this profile" button so the user is never
// staring at a page wondering whether anything happened.
//
// Data captured is EXACTLY these five things and nothing else (product
// decision 2026-08-25 — no page text, no DOM dumps): the person's name,
// the profile URL, their job title, the current company's name, and their
// location. The parser is best-effort with a tab-title fallback.

(() => {
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

  function meta(selector) {
    return document.querySelector(selector)?.getAttribute('content')?.trim() || null;
  }

  // The top-card <section> around the name — most fields live here, and
  // scoping to it keeps the class-independent heuristics from wandering
  // into the Experience/Activity sections lower down.
  function topCard(h1) {
    if (!h1) return document.querySelector('main') || document.body;
    return h1.closest('section') || h1.parentElement?.parentElement || document.querySelector('main') || document.body;
  }

  // Locations have no digits ("San Francisco Bay Area", "London, England");
  // connection/follower counts always do ("500+ connections"). That single
  // heuristic is locale-independent, unlike LinkedIn's class names.
  function looksLikeLocation(s) {
    if (!s || s.length > 120) return false;
    if (/\d/.test(s)) return false;
    if (/·|@|http/i.test(s)) return false;
    return true;
  }

  // Collect labeled direct-text leaves ("tag.class [aria] = text") under a
  // root — the raw material for reading unfamiliar markup.
  function textRows(root, limit) {
    const rows = [];
    if (!root) return rows;
    for (const el of root.querySelectorAll('*')) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'path') continue;
      const direct = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.replace(/\s+/g, ' ').trim())
        .join(' ')
        .trim();
      if (!direct || direct.length > 120) continue;
      const cls = (el.getAttribute('class') || '').split(/\s+/).slice(0, 3).join('.');
      const aria = el.getAttribute('aria-label');
      rows.push(`${tag}${cls ? '.' + cls : ''}${aria ? ` [aria="${aria.slice(0, 40)}"]` : ''} = ${JSON.stringify(direct)}`);
      if (rows.length >= limit) break;
    }
    return rows;
  }

  // Diagnostic: when a field can't be parsed, dump the page's structure so
  // the exact markup can be read from a single console paste. Scoped to the
  // name's section first; if that's thin (card not rendered, or a layout we
  // can't scope), it falls back to the whole document so it can never come
  // back empty. Runs at most once per page load.
  let dumpedOnce = false;
  function dumpCandidates(h1) {
    if (dumpedOnce) return;
    dumpedOnce = true;
    const main = document.querySelector('main');
    const env = [
      `url = ${location.href}`,
      `title = ${JSON.stringify(document.title)}`,
      `main present = ${Boolean(main)}`,
      `h1 count = ${document.querySelectorAll('h1').length}`,
      `section count = ${document.querySelectorAll('section').length}`,
    ];
    const scope = h1 ? (h1.closest('section') || h1.parentElement?.parentElement) : null;
    let rows = textRows(scope, 40);
    let source = 'name section';
    // Thin scoped result -> the card probably wasn't where we looked (or
    // wasn't rendered): dump main, then the whole body.
    if (rows.length < 3) { rows = textRows(main, 60); source = 'main'; }
    if (rows.length < 3) { rows = textRows(document.body, 60); source = 'body'; }
    console.info(
      '[DataPit] Some fields did not parse. Please copy everything below this line and send it to support:\n' +
      '----- DataPit top-card dump -----\n' +
      env.join('\n') +
      `\nsource = ${source}\n` +
      rows.join('\n') +
      '\n----- end dump -----',
    );
  }

  function parseProfile() {
    const fromTitle = parseTitleTag();
    const h1 = document.querySelector('main h1') || document.querySelector('h1');
    const card = topCard(h1);
    const name = text(h1) || fromTitle.name || meta('meta[property="profile:first_name"]') || null;

    // --- job title (headline) ---
    // Layered: known classes -> the div right after the name -> the first
    // "text-body-medium"-ish block in the card -> og:title/description ->
    // the tab title. Any one of these surviving is enough.
    let jobTitle =
      text(card.querySelector('.text-body-medium.break-words')) ||
      text(card.querySelector('[data-generated-suggestion-target]')) ||
      text(card.querySelector('[class*="text-body-medium"]'));
    if (!jobTitle && h1) {
      // Structurally, the headline is the FIRST text-bearing block after the
      // name's container — take it as-is (don't filter by "looks like a
      // location": a headline has no digits and would trip that test too).
      let el = h1.parentElement?.nextElementSibling;
      for (let i = 0; el && i < 4 && !jobTitle; i++, el = el.nextElementSibling) {
        const t = text(el);
        if (t && t.length <= 220 && t !== name) jobTitle = t;
      }
    }
    jobTitle = jobTitle || fromTitle.jobTitle || null;

    // --- location ---
    // Known class first, then the first no-digit place-like line in the card
    // that isn't the name or the headline (works with any/no class names).
    let location_ = text(card.querySelector('.text-body-small.inline.t-black--light.break-words'));
    if (!location_) {
      for (const el of card.querySelectorAll('span, div')) {
        const t = text(el);
        if (t && t !== name && t !== jobTitle && looksLikeLocation(t)) { location_ = t; break; }
      }
    }

    // --- current company ---
    // aria-label (English) -> a company link in the top card -> the logo
    // image's alt in the current-company button -> og:title/tab-title tail.
    let companyName = null;
    const companyBtn = card.querySelector(
      'button[aria-label^="Current company"], a[aria-label^="Current company"]',
    );
    if (companyBtn) {
      const m = (companyBtn.getAttribute('aria-label') || '').match(/^Current company:?\s*([^.]+)/i);
      companyName = (m && m[1].trim()) || null;
    }
    if (!companyName) {
      const companyLink = card.querySelector('a[href*="/company/"]');
      companyName = text(companyLink) || companyLink?.querySelector('img[alt]')?.getAttribute('alt')?.trim() || null;
    }
    if (!companyName) {
      const logo = card.querySelector('button img[alt], a[href*="/company/"] img[alt]');
      const alt = logo?.getAttribute('alt')?.trim();
      // Skip the person's own avatar ("Jane Doe" / "... profile photo").
      if (alt && alt !== name && !/profile photo|photo de|foto de/i.test(alt)) companyName = alt;
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
    };
    // console.info (not debug) so it shows in DevTools -> Console at the
    // default level — a still-missing field can then be diagnosed against
    // the real markup without guesswork.
    console.info('[DataPit] parsed profile ->', JSON.stringify(payload));
    if (!jobTitle || !location_ || !companyName) dumpCandidates(h1);
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

    // On auto-lookup right after navigation the profile card may not be
    // rendered yet — LinkedIn is a heavy SPA and firing too early means we
    // parse a skeleton (name from the tab title, everything else blank).
    // Wait until the top card actually has content — a name heading AND
    // several other text lines — or a generous timeout. Never block the
    // lookup itself past that (matching is by URL; parsed fields are gravy).
    if (auto) {
      for (let i = 0; i < 24 && lastSlug === slug; i++) {
        const main = document.querySelector('main');
        const hasName = Boolean(document.querySelector('main h1, h1')?.textContent.trim());
        // A rendered card has several text lines; an unrendered skeleton
        // (the empty-dump case) has ~none. 3 cleanly separates them.
        const contentful = main ? textRows(main, 4).length >= 3 : false;
        if (hasName && contentful) break;
        await new Promise((r) => setTimeout(r, 400)); // up to ~9.6s
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

  // ---- Cyberpunk visual system --------------------------------------
  // Neon cyan primary + hot-magenta secondary on a deep blue-black ground.
  // Chamfered corners (clip-path), hairline neon edges with outer glow, a
  // faint scanline wash, and a corner-bracket targeting reticle on the
  // launcher. Every class hook the JS below relies on is preserved.
  const STYLES = `
    :host { all: initial; }
    @keyframes dp-spin { to { transform: rotate(360deg); } }
    @keyframes dp-pulse {
      0%,100% { opacity:.9; transform:scale(1); }
      50% { opacity:.35; transform:scale(1.18); }
    }
    @keyframes dp-led { 0%,100% { opacity:1; } 50% { opacity:.25; } }
    @keyframes dp-sheen { from { transform:translateX(-120%); } to { transform:translateX(320%); } }
    @keyframes dp-boot { from { opacity:0; transform:translateY(8px) scale(.98); } to { opacity:1; transform:none; } }

    .wrap {
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483646;
      font: 13px/1.45 "Segoe UI", Roboto, -apple-system, sans-serif;
      display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
      --cyan:#22d3ee; --cyan-hi:#67e8f9; --mag:#ff2a6d; --violet:#a855f7;
      --ok:#00ffa3; --warn:#fbbf24; --danger:#ff5c7a;
      --ink:#e8f6ff; --muted:#7f8bb0; --panel:#0a0d18; --line:rgba(34,211,238,.35);
    }

    /* ---- launcher: chamfered reticle with a pulsing neon ring ---- */
    .launcher {
      position: relative; width: 50px; height: 50px; border: 0; cursor: pointer;
      background:
        radial-gradient(120% 120% at 28% 22%, rgba(103,232,249,.35), transparent 55%),
        linear-gradient(145deg,#0d1424,#0a0f1c);
      color: var(--cyan-hi); font-weight: 800; font-size: 19px; letter-spacing:.04em;
      display: flex; align-items: center; justify-content: center;
      clip-path: polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);
      box-shadow: 0 0 0 1px rgba(34,211,238,.55) inset, 0 6px 22px rgba(34,211,238,.35),
        0 0 16px rgba(255,42,109,.25);
      text-shadow: 0 0 10px rgba(34,211,238,.7);
      transition: transform .12s ease, box-shadow .2s ease;
    }
    .launcher::before { /* corner-bracket reticle */
      content:''; position:absolute; inset:5px; pointer-events:none;
      background:
        linear-gradient(var(--cyan),var(--cyan)) left top/9px 1.5px no-repeat,
        linear-gradient(var(--cyan),var(--cyan)) left top/1.5px 9px no-repeat,
        linear-gradient(var(--mag),var(--mag)) right bottom/9px 1.5px no-repeat,
        linear-gradient(var(--mag),var(--mag)) right bottom/1.5px 9px no-repeat;
      opacity:.85;
    }
    .launcher::after { /* pulsing halo */
      content:''; position:absolute; inset:-3px; z-index:-1;
      clip-path: polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);
      background: linear-gradient(145deg,var(--cyan),var(--mag));
      filter: blur(7px); opacity:.5; animation: dp-pulse 2.6s ease-in-out infinite;
    }
    .launcher:hover { transform: translateY(-1px) scale(1.06);
      box-shadow: 0 0 0 1px var(--cyan) inset, 0 8px 26px rgba(34,211,238,.5), 0 0 22px rgba(255,42,109,.4); }

    /* ---- card ---- */
    .card {
      position: relative; width: 328px; padding: 15px 17px 14px;
      background:
        radial-gradient(140% 90% at 100% 0%, rgba(255,42,109,.10), transparent 45%),
        radial-gradient(120% 90% at 0% 0%, rgba(34,211,238,.12), transparent 45%),
        var(--panel);
      color: var(--ink); overflow: hidden;
      clip-path: polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);
      box-shadow: 0 0 0 1px var(--line) inset, 0 18px 50px rgba(0,0,0,.6),
        0 0 24px rgba(34,211,238,.14);
      animation: dp-boot .28s ease both;
    }
    .card::before { /* top neon rail */
      content:''; position:absolute; top:0; left:14px; right:0; height:2px;
      background: linear-gradient(90deg,var(--cyan),var(--violet) 55%,var(--mag));
      box-shadow: 0 0 10px rgba(34,211,238,.7);
    }
    .card::after { /* scanline wash */
      content:''; position:absolute; inset:0; pointer-events:none; opacity:.5;
      background: repeating-linear-gradient(0deg, rgba(120,220,255,.04) 0 1px, transparent 1px 3px);
      mix-blend-mode: screen;
    }
    .card.hidden { display: none; }

    .brand { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .led { width:7px; height:7px; border-radius:50%; background:var(--ok);
      box-shadow:0 0 8px var(--ok); animation: dp-led 1.8s ease-in-out infinite; flex:none; }
    .brand b { font: 800 12px/1 ui-monospace, "Cascadia Code", Consolas, monospace;
      letter-spacing:.22em; text-transform:uppercase;
      background: linear-gradient(90deg,var(--cyan),var(--mag)); -webkit-background-clip:text; background-clip:text; color:transparent; }
    .brand .tag { font: 700 9px/1 ui-monospace, Consolas, monospace; letter-spacing:.18em;
      text-transform:uppercase; color:var(--muted); padding:2px 6px;
      border:1px solid rgba(127,139,176,.3); border-radius:3px; }
    .brand .sp { flex:1; }
    .close { cursor:pointer; border:1px solid rgba(127,139,176,.25); background:rgba(255,255,255,.02);
      color:var(--muted); font:700 13px/1 ui-monospace,Consolas,monospace; line-height:1; width:22px; height:22px;
      border-radius:3px; display:flex; align-items:center; justify-content:center; }
    .close:hover { color:var(--ink); border-color:var(--cyan); box-shadow:0 0 8px rgba(34,211,238,.4); }

    .title { font-weight:700; font-size:15px; color:#fff; letter-spacing:.01em; text-shadow:0 0 12px rgba(34,211,238,.18); }
    .muted { color:var(--muted); font-size:12px; }
    .row { margin-top:9px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .value { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size:12px; color:var(--cyan-hi);
      background: rgba(34,211,238,.07); border:1px solid rgba(34,211,238,.28); border-left:2px solid var(--cyan);
      border-radius:4px; padding:4px 8px; word-break:break-all; transition: box-shadow .15s ease, background .15s ease; }
    .value:hover { background: rgba(34,211,238,.12); box-shadow:0 0 12px rgba(34,211,238,.25); }

    .btn { position:relative; cursor:pointer; border:0; padding:9px 14px; overflow:hidden;
      font:800 11px/1 ui-monospace, Consolas, monospace; letter-spacing:.1em; text-transform:uppercase;
      color:#04121a; background: linear-gradient(120deg,var(--cyan),var(--cyan-hi));
      clip-path: polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);
      box-shadow: 0 0 16px rgba(34,211,238,.35); transition: box-shadow .18s ease, transform .1s ease; }
    .btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 0 22px rgba(34,211,238,.6); }
    .btn::after { content:''; position:absolute; top:0; left:0; width:40%; height:100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
      transform: translateX(-120%); animation: dp-sheen 3.4s ease-in-out infinite; }
    .btn:disabled { opacity:.5; cursor:default; box-shadow:none; }
    .btn:disabled::after { display:none; }
    .btn.ghost { color:var(--cyan-hi); background: rgba(34,211,238,.06); box-shadow: 0 0 0 1px rgba(34,211,238,.35) inset; }
    .btn.ghost:hover:not(:disabled) { box-shadow: 0 0 0 1px var(--cyan) inset, 0 0 14px rgba(34,211,238,.4); }
    .btn.ghost::after { display:none; }

    .pill { display:inline-flex; align-items:center; gap:5px; border-radius:3px; padding:3px 8px;
      font:800 10px/1 ui-monospace,Consolas,monospace; letter-spacing:.1em; text-transform:uppercase; }
    .pill.ok   { color:var(--ok);     border:1px solid rgba(0,255,163,.45);  background:rgba(0,255,163,.08);  box-shadow:0 0 12px rgba(0,255,163,.2); }
    .pill.info { color:var(--cyan-hi);border:1px solid rgba(34,211,238,.5);  background:rgba(34,211,238,.08); box-shadow:0 0 12px rgba(34,211,238,.18); }
    .pill.warn { color:var(--warn);   border:1px solid rgba(251,191,36,.5);  background:rgba(251,191,36,.08); }
    .note { margin-top:9px; font-size:12px; color:var(--danger); padding-left:9px; border-left:2px solid var(--danger); }
    .footer { margin-top:13px; padding-top:11px; border-top:1px solid rgba(34,211,238,.14);
      display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .footer .muted { font-family: ui-monospace, Consolas, monospace; font-size:10.5px; letter-spacing:.06em; }
    .spin { display:inline-block; width:15px; height:15px; border:2px solid rgba(34,211,238,.2);
      border-top-color:var(--cyan); border-right-color:var(--mag); border-radius:50%; animation: dp-spin .8s linear infinite;
      box-shadow:0 0 10px rgba(34,211,238,.3); }
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
          <span class="led"></span>
          <b>DataPit</b>
          <span class="tag">LINK//SCAN</span>
          <span class="sp"></span>
          <button class="close" title="Minimize" aria-label="Minimize DataPit panel">×</button>
        </div>
        <div class="body"></div>
        <div class="footer">
          <span class="muted" data-cost>REVEAL · 4 CR</span>
          <button class="btn ghost" data-search>Scan profile</button>
        </div>
      </div>
      <button class="launcher" title="DataPit — look up this profile" aria-label="Open DataPit">◈</button>
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
