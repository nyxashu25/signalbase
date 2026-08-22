import { cn } from './cn.js';

/**
 * Small on-brand line illustrations for empty states (docs/UX-ROADMAP.md
 * §4.1) — one per object type, drawn with `currentColor` so they take the
 * theme's text colour, with the accent applied to a single element via
 * `text-primary`. Pass one as `<EmptyState illustration={<Illustration.Lists />}>`.
 * Kept deliberately spare: a frame, the object, one accent — not a scene.
 */
function Frame({ children, className, label }) {
  return (
    <svg
      viewBox="0 0 160 104"
      width="160"
      height="104"
      role="img"
      aria-label={label}
      className={cn('mb-4 text-text-muted/70', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const tile = 'fill-surface-sunken stroke-border';
const accent = 'text-primary';

function People() {
  return (
    <Frame label="People illustration">
      <rect x="22" y="18" width="116" height="68" rx="8" className={tile} />
      <circle cx="52" cy="46" r="10" />
      <path d="M34 76c2-10 9-16 18-16s16 6 18 16" />
      <path d="M78 40h44M78 52h32M78 64h38" />
      <circle cx="124" cy="26" r="9" className={cn(accent, 'fill-primary/10')} stroke="currentColor" />
      <path d="M120.5 26l2.5 2.5 4.5-5" className={accent} />
    </Frame>
  );
}

function Companies() {
  return (
    <Frame label="Companies illustration">
      <path d="M24 86h112" />
      <rect x="36" y="34" width="36" height="52" rx="3" className={tile} />
      <rect x="80" y="18" width="44" height="68" rx="3" className={tile} />
      <path d="M44 44h6M44 54h6M44 64h6M44 74h6M58 44h6M58 54h6M58 64h6M58 74h6" />
      <path d="M90 30h8M90 42h8M90 54h8M90 66h8M106 30h8M106 42h8M106 54h8M106 66h8" />
      <path d="M96 86v-10h12v10" className={accent} />
      <circle cx="130" cy="24" r="5" className={cn(accent, 'fill-primary/10')} />
    </Frame>
  );
}

function Lists() {
  return (
    <Frame label="Lists illustration">
      <rect x="30" y="16" width="100" height="72" rx="8" className={tile} />
      <rect x="42" y="30" width="10" height="10" rx="2" className={cn(accent, 'fill-primary/10')} />
      <path d="M44.5 35l2.5 2.5 4-4.5" className={accent} />
      <path d="M60 35h50" />
      <rect x="42" y="48" width="10" height="10" rx="2" />
      <path d="M60 53h38" />
      <rect x="42" y="66" width="10" height="10" rx="2" />
      <path d="M60 71h44" />
    </Frame>
  );
}

function Sequences() {
  return (
    <Frame label="Sequences illustration">
      <rect x="18" y="36" width="30" height="22" rx="5" className={tile} />
      <rect x="65" y="36" width="30" height="22" rx="5" className={tile} />
      <rect x="112" y="36" width="30" height="22" rx="5" className={tile} />
      <path d="M48 47h17M95 47h17" />
      <path d="M61 43l4 4-4 4M108 43l4 4-4 4" />
      <path d="M25 47l4-3 4 3v6h-8z" className={accent} />
      <path d="M72 44h16M72 50h10" />
      <circle cx="127" cy="47" r="5" />
      <path d="M127 44v3l2 2" />
      <path d="M33 72c30 14 64 14 94 0" strokeDasharray="3 4" />
    </Frame>
  );
}

function Tickets() {
  return (
    <Frame label="Tickets illustration">
      <path d="M38 26h60a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H60l-12 10V62h-10a6 6 0 0 1-6-6V32a6 6 0 0 1 6-6z" className={tile} />
      <path d="M48 40h40M48 50h26" />
      <path d="M90 46h28a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6h-6v9l-11-9H90a6 6 0 0 1-6-6V52" className={cn(accent, 'fill-primary/10')} />
      <path d="M96 60h20M96 68h12" className={accent} />
    </Frame>
  );
}

function Billing() {
  return (
    <Frame label="Billing illustration">
      <rect x="28" y="28" width="104" height="54" rx="8" className={tile} />
      <path d="M28 44h104" />
      <rect x="40" y="58" width="26" height="10" rx="2" />
      <circle cx="112" cy="64" r="8" className={cn(accent, 'fill-primary/10')} />
      <path d="M112 60v8M109 64h6" className={accent} />
      <path d="M84 18l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" className={accent} />
    </Frame>
  );
}

function Search() {
  return (
    <Frame label="Search illustration">
      <circle cx="70" cy="48" r="24" className={tile} />
      <path d="M88 66l22 22" strokeWidth="4" />
      <path d="M58 44a12 12 0 0 1 12-10" className={accent} />
      <path d="M118 26h16M126 18v16" />
      <path d="M30 80h14" />
    </Frame>
  );
}

function Activity() {
  return (
    <Frame label="Activity illustration">
      <rect x="24" y="22" width="112" height="60" rx="8" className={tile} />
      <path d="M36 64l16-14 14 10 18-22 14 12 14-18" />
      <circle cx="84" cy="38" r="4" className={cn(accent, 'fill-primary/10')} />
      <path d="M36 74h88" strokeDasharray="3 4" />
    </Frame>
  );
}

function Plug() {
  return (
    <Frame label="Integrations illustration">
      <rect x="30" y="40" width="44" height="28" rx="6" className={tile} />
      <path d="M74 48h10M74 60h10" />
      <rect x="84" y="34" width="46" height="40" rx="8" className={cn(accent, 'fill-primary/10')} />
      <path d="M96 46h22M96 54h16M96 62h10" className={accent} />
      <path d="M20 54h10" />
    </Frame>
  );
}

function Shield() {
  return (
    <Frame label="Security illustration">
      <path d="M80 18l38 12v22c0 20-16 34-38 42-22-8-38-22-38-42V30z" className={tile} />
      <path d="M64 54l11 10 22-24" className={accent} strokeWidth="2.5" />
    </Frame>
  );
}

export const Illustration = {
  People,
  Companies,
  Lists,
  Sequences,
  Tickets,
  Billing,
  Search,
  Activity,
  Plug,
  Shield,
};
