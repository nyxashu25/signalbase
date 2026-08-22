// Tiny classnames join — no dependency, no dedupe. Good enough for the
// variant maps in components/ui; not a replacement for tailwind-merge.
export function cn(...parts) {
  return parts.flat().filter(Boolean).join(' ');
}
