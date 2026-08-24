// DataPit extension — background service worker.
//
// The only place that talks to the DataPit API. Content scripts and the
// popup message this worker instead of fetching themselves: background
// fetches to hosts in host_permissions bypass CORS, and it keeps the API
// key out of page-context code entirely (LinkedIn's scripts can never see
// it — chrome.storage + this worker are extension-private).

const DEFAULT_API_BASE = 'https://datapit.io/api/v1';

async function getConfig() {
  const { apiKey, apiBase } = await chrome.storage.local.get(['apiKey', 'apiBase']);
  return { apiKey: apiKey || null, apiBase: apiBase || DEFAULT_API_BASE };
}

async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const { apiKey, apiBase } = await getConfig();
  if (!apiKey) return { ok: false, status: 0, error: 'NOT_CONNECTED' };

  let res;
  try {
    res = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: 'NETWORK' };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body (shouldn't happen) */
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data?.error?.message || `Request failed (${res.status})`,
    };
  }
  return { ok: true, status: res.status, data };
}

// One handler per message type; every response goes back as a plain object
// (never a thrown error — content scripts can't catch those cleanly).
const handlers = {
  // Popup: save/clear the API key. Validated by calling /extension/me so a
  // typo'd key is rejected at paste time, not on the first profile visit.
  async saveKey({ key }) {
    await chrome.storage.local.set({ apiKey: key });
    const me = await api('/extension/me');
    if (!me.ok) {
      await chrome.storage.local.remove('apiKey');
      return { ok: false, error: me.status === 401 ? 'That key was rejected — paste it exactly as shown in Settings → API & Extension.' : me.error };
    }
    return { ok: true, me: me.data };
  },

  async clearKey() {
    await chrome.storage.local.remove('apiKey');
    return { ok: true };
  },

  async status() {
    const { apiKey, apiBase } = await getConfig();
    if (!apiKey) return { ok: false, error: 'NOT_CONNECTED', apiBase };
    const me = await api('/extension/me');
    return me.ok ? { ok: true, me: me.data, apiBase } : { ...me, apiBase };
  },

  // Content script: classify the profile being viewed.
  async observe({ payload }) {
    return api('/extension/observe', { method: 'POST', body: payload });
  },

  // Content script: the 4-credit reveal. crypto.randomUUID() per click —
  // the server's idempotency layer dedups accidental double-sends of the
  // SAME click via this key, while a deliberate second click on an
  // already-revealed contact short-circuits free server-side anyway.
  async reveal({ contactId }) {
    return api(`/extension/contacts/${contactId}/reveal`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  },

  async setApiBase({ apiBase }) {
    await chrome.storage.local.set({ apiBase: apiBase || DEFAULT_API_BASE });
    return { ok: true };
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) {
    sendResponse({ ok: false, error: `Unknown message type: ${message?.type}` });
    return false;
  }
  handler(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
  return true; // keep the message channel open for the async response
});

// External messages — from the DataPit web app itself (see
// manifest.json's externally_connectable, scoped to datapit.io / localhost
// dev only). This is how the Dashboard's "Install extension" card detects
// that installation actually succeeded, without polling anything. The only
// thing exposed here is "am I installed, and what version" — nothing that
// reads or changes extension state.
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message?.type === 'ping') {
    sendResponse({ installed: true, version: chrome.runtime.getManifest().version });
  } else {
    sendResponse({ installed: false });
  }
  return false;
});
