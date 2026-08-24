const DEFAULT_API_BASE = 'https://datapit.io/api/v1';
const input = document.getElementById('apiBase');
const saved = document.getElementById('saved');

chrome.storage.local.get('apiBase').then(({ apiBase }) => {
  input.value = apiBase || DEFAULT_API_BASE;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.runtime.sendMessage(
    { type: 'setApiBase', apiBase: input.value.trim() || DEFAULT_API_BASE },
    () => {
      saved.hidden = false;
      setTimeout(() => (saved.hidden = true), 1500);
    },
  );
});
