import { cn } from './cn.js';

// Deterministic hue from the name so the same company/person always gets
// the same tile — no external favicon/logo service, zero third-party
// requests per row (docs/UX-ROADMAP.md §3.4). Saturation/lightness are
// pinned so every tile stays readable against both themes.
const PALETTE = [
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-orange-500/15 text-orange-700 dark:text-orange-300',
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-14 w-14 text-lg',
};

export function LetterAvatar({ name = '', size = 'md', square = false, className }) {
  const tone = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-bold leading-none',
        square ? 'rounded-sm' : 'rounded-full',
        SIZES[size],
        tone,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
