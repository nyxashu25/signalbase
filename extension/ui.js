// DataPit extension — shared in-page UI for every content script.
//
// Loaded before content.js (LinkedIn, Sales Navigator) and apps.js (Gmail,
// Google Calendar, HubSpot, Salesforce). Content scripts of one extension
// share an isolated world per page, so this exposes one DataPitUI object
// the page's own scripts can never see. Everything is drawn in a closed
// shadow root so the host site's CSS can't touch it.

(() => {
  if (globalThis.DataPitUI) return;

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
    /* ---- people list (Gmail, Calendar, CRMs, company sites) ---- */
    .people { margin-top:4px; display:flex; flex-direction:column; gap:8px; max-height:320px; overflow:auto; padding-right:2px; }
    .person { padding:9px 10px; border-radius:4px; background:rgba(34,211,238,.04);
      box-shadow:0 0 0 1px rgba(34,211,238,.16) inset; }
    .person .name { font-weight:700; color:#fff; }
    .person .sub { color:var(--muted); font-size:12px; margin-top:1px; }
    .person .addr { font-family: ui-monospace, Consolas, monospace; font-size:11px; color:var(--muted); word-break:break-all; }
    .person .row { margin-top:7px; }
    .person .btn { padding:7px 10px; font-size:10px; }
    .badge { position:absolute; top:3px; right:3px; min-width:18px; height:18px; padding:0 5px; border-radius:9px;
      background:var(--mag); color:#fff; font:800 10px/18px ui-monospace,Consolas,monospace; text-align:center;
      box-shadow:0 0 10px rgba(255,42,109,.6); }
    .badge.hidden { display:none; }
  `;

  /** Message the background worker (the only code that talks to the API). */
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

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /**
   * The floating launcher + card. Returns the elements the scripts fill in:
   * { host, launcher, badge, card, body, cost, refresh, setVisible(open) }.
   */
  function mount({ tag, refreshLabel, launcherTitle }) {
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
          <span class="tag">${esc(tag)}</span>
          <span class="sp"></span>
          <button class="close" title="Minimize" aria-label="Minimize DataPit panel">×</button>
        </div>
        <div class="body" aria-live="polite"></div>
        <div class="footer">
          <span class="muted" data-cost>REVEAL · 4 CR</span>
          <button class="btn ghost" data-refresh>${esc(refreshLabel)}</button>
        </div>
      </div>
      <button class="launcher" title="${esc(launcherTitle)}" aria-label="Open DataPit">◈<span class="badge hidden"></span></button>
    `;
    root.append(style, wrap);
    document.documentElement.appendChild(host);

    const card = wrap.querySelector('.card');
    const ui = {
      host,
      launcher: wrap.querySelector('.launcher'),
      badge: wrap.querySelector('.badge'),
      card,
      close: card.querySelector('.close'),
      body: card.querySelector('.body'),
      cost: card.querySelector('[data-cost]'),
      refresh: card.querySelector('[data-refresh]'),
      setVisible(open) {
        card.classList.toggle('hidden', !open);
      },
      setBadge(count) {
        ui.badge.textContent = count > 9 ? '9+' : String(count);
        ui.badge.classList.toggle('hidden', !count);
      },
    };
    return ui;
  }

  /** Click-to-copy on every [data-copy] value under root. */
  function wireCopy(root) {
    root.querySelectorAll('[data-copy]').forEach((el) => {
      el.style.cursor = 'pointer';
      el.title = 'Click to copy';
      el.addEventListener('click', () => {
        navigator.clipboard?.writeText(el.textContent).then(() => {
          const original = el.textContent;
          el.textContent = 'Copied ✓';
          setTimeout(() => {
            el.textContent = original;
          }, 900);
        });
      });
    });
  }

  /** The words for a failed request, the same on every surface. */
  function errorText(res) {
    if (res.error === 'NOT_CONNECTED') return null; // callers show the connect state
    if (res.error === 'RELOADED') return 'DataPit was updated — refresh this page to reconnect.';
    if (res.status === 429) return 'Rate limit reached — try again in a few minutes.';
    if (res.status === 402) return 'Not enough credits — top up from Billing in DataPit.';
    return res.error || 'Something went wrong.';
  }

  const CONNECT_HTML = `
    <div class="title">Connect DataPit</div>
    <div class="muted" style="margin-top:4px">Click the DataPit icon in your toolbar and paste an API key from Settings → API &amp; Extension.</div>
  `;

  globalThis.DataPitUI = { STYLES, send, esc, mount, wireCopy, errorText, CONNECT_HTML };
})();
