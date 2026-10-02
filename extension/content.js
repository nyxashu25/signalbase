// DataPit extension — content script for linkedin.com.
//
// Injected on every LinkedIn page (LinkedIn is a SPA — a profile is usually
// reached by in-page navigation, where a /in/*-only content_script match
// would never fire). On a profile (/in/…) or a Sales Navigator lead
// (/sales/lead/…, /sales/people/…) it mounts the floating DataPit launcher
// (ui.js), auto-runs the lookup, and shows an explicit verdict — "Found in
// DataPit" with a reveal button, or "Not in DataPit" — plus a manual "Scan"
// button so the user is never left wondering whether anything happened.
//
// Data captured is EXACTLY these five things and nothing else (product
// decision 2026-08-25 — no page text, no DOM dumps): the person's name,
// the profile URL, their job title, the current company's name, and their
// location. The parser is best-effort with a tab-title fallback.

(() => {
  const UI = globalThis.DataPitUI;
  const PROFILE_RE = /^https?:\/\/([^/]*\.)?linkedin\.com\/in\/([^/?#]+)/i;
  const SALES_RE = /^https?:\/\/([^/]*\.)?linkedin\.com\/sales\/(?:lead|people)\/([^/?#]+)/i;

  let lastKey = null; // page the card currently represents
  let lookedUpKey = null; // page the last completed lookup was for
  let ui = null; // ui.js mount() result, once mounted
  let collapsed = false; // user closed the card -> only the launcher shows
  let busy = false; // a lookup is in flight

  const log = (...args) => console.debug('[DataPit]', ...args);

  // ---------------------------------------------------------------------
  // SPA-aware URL watching. On a profile or lead: mount the UI and look the
  // person up once per page. Anywhere else on LinkedIn: hide everything.
  // ---------------------------------------------------------------------

  function decode(part) {
    try {
      return decodeURIComponent(part).toLowerCase();
    } catch {
      return part.toLowerCase();
    }
  }

  function currentPage() {
    const profile = location.href.match(PROFILE_RE);
    if (profile) {
      const slug = decode(profile[2]);
      return { kind: 'profile', key: `in:${slug}`, slug };
    }
    const lead = location.href.match(SALES_RE);
    if (lead) return { kind: 'sales', key: `sales:${lead[2].split(',')[0]}` };
    return null;
  }

  function tick() {
    const page = currentPage();
    if (!page) {
      lastKey = null;
      if (ui) ui.host.style.display = 'none';
      return;
    }
    if (!ui) mountUi();
    ui.host.style.display = '';
    if (page.key !== lastKey) {
      lastKey = page.key;
      collapsed = false;
      setCardVisible(true);
      lookUp(page, { auto: true });
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
  // Sales Navigator lead pages: the same five fields, read from the
  // data-anonymize hooks Sales Navigator puts on every person field (they
  // survive its class-name churn). The public /in/ URL is used when the page
  // renders one; otherwise the lead is matched by name and company.
  // ---------------------------------------------------------------------

  function parseSalesLead() {
    const pick = (selector) => text(document.querySelector(selector));
    const name = pick('[data-anonymize="person-name"]') || text(document.querySelector('main h1, h1'));
    const jobTitle = pick('[data-anonymize="job-title"]') || pick('[data-anonymize="headline"]');
    const companyName =
      pick('[data-anonymize="company-name"]') || text(document.querySelector('a[href*="/sales/company/"]'));
    const location_ = pick('[data-anonymize="location"]');
    const profileHref = Array.from(document.querySelectorAll('a[href*="/in/"]'))
      .map((a) => a.href)
      .find((href) => PROFILE_RE.test(href));
    const match = profileHref && profileHref.match(PROFILE_RE);
    const lead = {
      linkedinUrl: match ? `https://www.linkedin.com/in/${match[2]}` : null,
      name,
      jobTitle,
      location: location_,
      companyName,
    };
    console.info('[DataPit] parsed Sales Navigator lead ->', JSON.stringify(lead));
    return lead;
  }

  // Send only what was captured — a null field carries no information.
  function compact(payload) {
    const out = {};
    for (const [key, value] of Object.entries(payload)) if (value != null && value !== '') out[key] = value;
    return out;
  }

  // ---------------------------------------------------------------------
  // Lookups (via the background worker — see background.js).
  // ---------------------------------------------------------------------

  async function lookUp(page, { auto = false } = {}) {
    if (busy || !page) return;
    busy = true;
    renderLoading(page);

    // On auto-lookup right after navigation the page may not be rendered
    // yet — LinkedIn is a heavy SPA and firing too early means parsing a
    // skeleton. Wait until the page has a name heading AND several other
    // text lines, or a generous timeout. Never block past that (profile
    // matching is by URL; parsed fields are gravy).
    if (auto) {
      for (let i = 0; i < 24 && lastKey === page.key; i++) {
        const main = document.querySelector('main');
        const hasName = Boolean(document.querySelector('main h1, h1')?.textContent.trim());
        const contentful = main ? textRows(main, 4).length >= 3 : false;
        if (hasName && contentful) break;
        await new Promise((r) => setTimeout(r, 400)); // up to ~9.6s
      }
    }
    if (lastKey !== page.key) {
      busy = false;
      return; // navigated away while waiting
    }

    let res;
    let name;
    if (page.kind === 'profile') {
      const payload = parseProfile();
      name = payload.name;
      log('observe', payload.linkedinUrl);
      res = await UI.send({ type: 'observe', payload });
    } else {
      const lead = parseSalesLead();
      name = lead.name;
      if (lead.linkedinUrl) {
        res = await UI.send({ type: 'observe', payload: compact(lead) });
      } else if (lead.name) {
        res = await UI.send({ type: 'person', name: lead.name, companyName: lead.companyName });
        if (res.ok && res.data.status === 'not_found') res.data.queued = false;
      } else {
        res = { ok: false, error: 'Couldn’t read this lead yet — use “Scan” to try again.' };
      }
    }
    busy = false;
    if (lastKey !== page.key) return; // stale response — user moved on

    lookedUpKey = page.key;
    if (!res.ok) {
      if (res.error === 'NOT_CONNECTED') return renderSignedOut();
      return renderError(UI.errorText(res));
    }
    if (res.data.status === 'not_found') return renderNotFound(name, res.data.queued !== false);
    renderFound(res.data);
  }

  async function revealContact(contactId, button) {
    button.disabled = true;
    button.textContent = 'Revealing…';
    const res = await UI.send({ type: 'reveal', contactId });
    if (!res.ok) {
      button.disabled = false;
      button.textContent = 'Try again';
      renderErrorNote(UI.errorText(res) || 'Reveal failed.');
      return;
    }
    renderRevealed(res.data);
  }

  // ---------------------------------------------------------------------
  // UI (ui.js draws the launcher and card; this fills in the body).
  // ---------------------------------------------------------------------

  function mountUi() {
    ui = UI.mount({ tag: 'LINK//SCAN', refreshLabel: 'Scan', launcherTitle: 'DataPit — look up this person' });
    ui.launcher.addEventListener('click', () => {
      collapsed = false;
      setCardVisible(true);
      // Fresh page (or an earlier failure) -> run the lookup on open.
      if (lastKey && lookedUpKey !== lastKey) lookUp(currentPage());
    });
    ui.close.addEventListener('click', () => {
      collapsed = true;
      setCardVisible(false);
    });
    ui.refresh.addEventListener('click', () => {
      lookedUpKey = null;
      lookUp(currentPage());
    });
  }

  function setCardVisible(visible) {
    if (!ui) return;
    ui.setVisible(visible && !collapsed);
  }

  const esc = (s) => UI.esc(s);

  function renderLoading(page) {
    const what = page?.kind === 'sales' ? 'this lead' : 'this profile';
    ui.body.innerHTML = `<div class="row"><span class="spin"></span><span class="muted">Checking ${what} against DataPit…</span></div>`;
  }

  function renderSignedOut() {
    ui.body.innerHTML = UI.CONNECT_HTML;
  }

  function renderNotFound(name, queued) {
    ui.body.innerHTML = `
      <div class="row" style="margin-top:0"><span class="pill info">✗ Not in DataPit</span></div>
      <div class="title" style="margin-top:6px">${esc(name || 'This person')} isn’t in the database yet</div>
      <div class="muted" style="margin-top:4px">${
        queued
          ? 'It’s been queued for our data team — it’ll be sourced and added.'
          : 'Open their public LinkedIn profile to queue them for our data team.'
      }</div>
    `;
  }

  function renderFound(data) {
    const c = data.contact;
    const fullName = `${c.firstName} ${c.lastName}`.trim();
    const already = c.revealed;
    const label = c.hasPhone ? 'Reveal email &amp; phone' : 'Reveal email';
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
             <button class="btn" data-reveal>${label} · ${data.cost} credits</button>
           </div>`
      }
    `;
    const revealBtn = ui.body.querySelector('[data-reveal]');
    if (revealBtn) revealBtn.addEventListener('click', () => revealContact(c.id, revealBtn));
    UI.wireCopy(ui.body);
  }

  function renderRevealed(result) {
    ui.body.innerHTML = `
      <div class="row" style="margin-top:0"><span class="pill ok">${result.alreadyRevealed ? '✓ Already unlocked — free' : '✓ Revealed'}</span></div>
      <div class="row"><span class="value" data-copy>${esc(result.email || 'No email found')}</span></div>
      ${result.phone ? `<div class="row"><span class="value" data-copy>${esc(result.phone)}</span></div>` : `<div class="muted" style="margin-top:6px">No phone on file.</div>`}
      <div class="muted" style="margin-top:6px">${result.emailVerified ? 'Email verified ✓' : 'Email not verified'} · click a value to copy</div>
    `;
    UI.wireCopy(ui.body);
  }

  function renderError(message) {
    ui.body.innerHTML = `
      <div class="title">Hmm, that didn’t work</div>
      <div class="note">${esc(message)}</div>
      <div class="muted" style="margin-top:6px">Use “Scan” below to retry.</div>
    `;
    lookedUpKey = null; // let the launcher/scan button retry
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
  // Last in the file on purpose: tick() -> mountUi() needs everything above
  // defined first (a TDZ crash on direct page loads otherwise).
  setInterval(tick, 700);
  // Don't wait 700ms for the first paint on a direct page load.
  tick();
  log('content script loaded', location.href);
})();
