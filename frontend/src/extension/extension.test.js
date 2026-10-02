/* eslint-env node */
// The Chrome extension's content scripts (extension/*.js), run in jsdom pages
// that mimic each surface. The scripts are plain IIFEs, so each test builds a
// page at the right URL, stubs chrome.runtime, and evaluates them in order —
// the same way Chrome injects them (see extension/manifest.json).
import { describe, it, expect, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const EXT = path.resolve(__dirname, '../../../extension');
const read = (file) => fs.readFileSync(path.join(EXT, file), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

let dom;
afterEach(() => dom?.window.close());

/** A page at `url` with `html`, the extension's scripts injected, and every runtime message recorded. */
function load(url, html, scripts, { title = '', reply = () => ({ ok: false, error: 'NOT_CONNECTED' }), test = false } = {}) {
  dom = new JSDOM(`<!doctype html><html><head><title>${title}</title></head><body>${html}</body></html>`, {
    url,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const messages = [];
  dom.window.chrome = {
    runtime: {
      lastError: null,
      sendMessage(message, callback) {
        messages.push(message);
        Promise.resolve(reply(message)).then((response) => callback(response));
      },
    },
  };
  if (test) dom.window.__DATAPIT_TEST__ = true;
  for (const file of scripts) dom.window.eval(read(file));
  return { window: dom.window, messages };
}

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const apps = (url, html, opts) => load(url, html, ['ui.js', 'apps.js'], { test: true, ...opts }).window.__DataPitApps;

describe('extension manifest', () => {
  it('injects the shared UI before each content script and covers all six surfaces', () => {
    const scripts = manifest.content_scripts;
    const linkedin = scripts.find((s) => s.js.includes('content.js'));
    const appScript = scripts.find((s) => s.js.includes('apps.js'));
    expect(linkedin.js).toEqual(['ui.js', 'content.js']);
    expect(appScript.js).toEqual(['ui.js', 'apps.js']);
    expect(appScript.matches).toEqual(
      expect.arrayContaining([
        'https://mail.google.com/*',
        'https://calendar.google.com/*',
        'https://app.hubspot.com/*',
        'https://*.lightning.force.com/*',
      ]),
    );
    // Company websites go through the popup with activeTab — no all-sites host permission.
    expect(manifest.permissions).toEqual(['storage', 'activeTab']);
    expect(manifest.host_permissions.some((h) => h.includes('<all_urls>') || h === '*://*/*')).toBe(false);
  });
});

describe('apps.js: addresses on the page', () => {
  it('Gmail: the open thread and drafts, minus your own and system addresses', () => {
    const t = apps(
      'https://mail.google.com/mail/u/0/#inbox/FMfcgzQXJWDcpkmZlklxcLtrbtwLwXHM',
      `<div role="main">
         <span email="Jane.Doe@Acme.com">Jane Doe</span>
         <span email="me@mycompany.com">me</span>
         <span email="no-reply@service.com">Service</span>
         <span email="jane.doe@acme.com">Jane again</span>
       </div>
       <div role="dialog"><div data-hovercard-id="sam@beta.io">Sam</div></div>`,
      { title: 'Inbox (3) - me@mycompany.com - Gmail' },
    );
    expect(t.adapter.id).toBe('gmail');
    expect(t.pageAddresses()).toEqual(['jane.doe@acme.com', 'sam@beta.io']);
  });

  it('Gmail: not the inbox list, whose rows also carry sender addresses', () => {
    const inbox = '<div role="main"><span email="x@y.com">X</span><span email="z@w.com">Z</span></div>';
    expect(apps('https://mail.google.com/mail/u/0/#inbox', inbox).pageAddresses()).toEqual([]);
    expect(apps('https://mail.google.com/mail/u/0/#inbox/p2', inbox).pageAddresses()).toEqual([]);
    // …but a draft open over the inbox still counts.
    const draft = `${inbox}<div role="dialog"><span email="new@lead.com">New</span></div>`;
    expect(apps('https://mail.google.com/mail/u/0/#inbox', draft).pageAddresses()).toEqual(['new@lead.com']);
  });

  it('Google Calendar: guests of the open event, minus calendar resources', () => {
    const t = apps(
      'https://calendar.google.com/calendar/u/0/r/week',
      `<div role="dialog">
         <div data-email="lee@gamma.com">Lee</div>
         <div data-email="room-1@resource.calendar.google.com">Room 1</div>
       </div>`,
    );
    expect(t.adapter.id).toBe('calendar');
    expect(t.pageAddresses()).toEqual(['lee@gamma.com']);
  });

  it('HubSpot: only on record pages, from mailto links and the email property text', () => {
    const html = `<main><a href="mailto:ana@delta.com?subject=Hi">ana@delta.com</a><p>Email: bo@delta.com</p></main>`;
    expect(apps('https://app.hubspot.com/contacts/123/objects/0-1/views/all/list', html).pageAddresses()).toEqual([]);
    const record = apps('https://app.hubspot.com/contacts/123/record/0-1/456', html);
    expect(record.adapter.id).toBe('hubspot');
    expect(record.pageAddresses()).toEqual(['ana@delta.com', 'bo@delta.com']);
  });

  it('Salesforce: mailto links inside Lightning web components (shadow DOM)', () => {
    const t = apps('https://acme.lightning.force.com/lightning/r/Contact/003xx/view', '<div id="field"></div>');
    const host = t.adapter && dom.window.document.getElementById('field');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<a href="mailto:kim@epsilon.org">kim@epsilon.org</a>';
    expect(t.adapter.id).toBe('salesforce');
    expect(t.pageAddresses()).toEqual(['kim@epsilon.org']);
  });
});

describe('content.js: Sales Navigator leads', () => {
  const lead = (extra = '') => `
    <main>
      <h1 data-anonymize="person-name">Jordan Bennett</h1>
      <span data-anonymize="job-title">VP Engineering</span>
      <a href="/sales/company/123" data-anonymize="company-name">Nova Systems</a>
      <span data-anonymize="location">Austin, Texas</span>
      <p>About</p><p>Experience</p>
      ${extra}
    </main>`;

  it('matches by name and company when the page has no public profile link', async () => {
    const { messages } = load('https://www.linkedin.com/sales/lead/ACwAAB123,NAME_SEARCH,x1', lead(), ['ui.js', 'content.js'], {
      reply: (m) => (m.type === 'person' ? { ok: true, data: { status: 'not_found' } } : { ok: false }),
    });
    await tick(50);
    expect(messages).toContainEqual({ type: 'person', name: 'Jordan Bennett', companyName: 'Nova Systems' });
  });

  it('uses the public /in/ profile when Sales Navigator renders one', async () => {
    const { messages } = load(
      'https://www.linkedin.com/sales/lead/ACwAAB123,NAME_SEARCH,x1',
      lead('<a href="https://www.linkedin.com/in/jordan-bennett">View LinkedIn profile</a>'),
      ['ui.js', 'content.js'],
      { reply: () => ({ ok: true, data: { status: 'not_found', queued: true } }) },
    );
    await tick(50);
    const observe = messages.find((m) => m.type === 'observe');
    expect(observe.payload).toMatchObject({
      linkedinUrl: 'https://www.linkedin.com/in/jordan-bennett',
      name: 'Jordan Bennett',
      jobTitle: 'VP Engineering',
      companyName: 'Nova Systems',
    });
  });

  it('still looks up regular /in/ profiles', async () => {
    const { messages } = load(
      'https://www.linkedin.com/in/jordan-bennett/',
      '<main><section><h1>Jordan Bennett</h1><div class="text-body-medium break-words">VP Engineering at Nova</div><p>Austin</p><p>500 connections</p></section></main>',
      ['ui.js', 'content.js'],
      { reply: () => ({ ok: true, data: { status: 'not_found', queued: true } }) },
    );
    await tick(50);
    expect(messages.find((m) => m.type === 'observe').payload.linkedinUrl).toBe(
      'https://www.linkedin.com/in/jordan-bennett',
    );
  });
});
