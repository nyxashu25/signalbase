import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dp-theme';

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

// 'system' never touches the DOM — the CSS prefers-color-scheme query
// (index.css) already reacts to OS changes live with no JS involved.
// Only an explicit override needs a [data-theme] attribute.
function applyTheme(mode) {
  if (mode === 'light' || mode === 'dark') {
    document.documentElement.setAttribute('data-theme', mode);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function useTheme() {
  const [mode, setMode] = useState(readStored);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const setThemeMode = useCallback((next) => {
    setMode(next);
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private-browsing or storage disabled — in-memory state still works for this tab.
    }
  }, []);

  return [mode, setThemeMode];
}
