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

function renderConnected(me) {
  $('who').textContent = `${me.user.name} · ${me.user.email}`;
  $('workspace').textContent = `${me.workspace.name} — ${me.workspace.plan} plan`;
  $('balance').textContent = me.balance;
  $('cost').textContent = `Reveals cost ${me.revealCost} credits (already-revealed contacts are free).`;
  show('connected');
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
