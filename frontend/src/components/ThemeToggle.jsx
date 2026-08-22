import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme.js';

const NEXT_MODE = { system: 'light', light: 'dark', dark: 'system' };
const LABEL = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' };
const ICON = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle({ className = '' }) {
  const [mode, setMode] = useTheme();
  const Icon = ICON[mode];

  return (
    <button
      type="button"
      onClick={() => setMode(NEXT_MODE[mode])}
      aria-label={`${LABEL[mode]} — click to switch to ${LABEL[NEXT_MODE[mode]].toLowerCase()}`}
      title={LABEL[mode]}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text ${className}`}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}
