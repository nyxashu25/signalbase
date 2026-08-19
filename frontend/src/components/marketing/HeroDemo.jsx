import { useEffect, useRef, useState } from 'react';

// A looping, scripted product demo: sign in -> open People -> reveal a
// contact -> watch the credit balance tick down -> fade to the DataPit
// mark + CTA -> loop. Every screen shown here is a faithful (hand-built,
// not a photo) reproduction of the real app UI and real seed data.
const PHASES = [
  { name: 'login', ms: 1800 },
  { name: 'login-click', ms: 450 },
  { name: 'people', ms: 1300 },
  { name: 'move-to-reveal', ms: 900 },
  { name: 'click-reveal', ms: 500 },
  { name: 'revealed', ms: 2400 },
  { name: 'fade-out', ms: 600 },
  { name: 'logo', ms: 2800 },
  { name: 'fade-back', ms: 500 },
];

const CURSOR_POS = {
  login: { left: '76%', top: '66%' },
  'login-click': { left: '76%', top: '66%' },
  people: { left: '50%', top: '18%' },
  'move-to-reveal': { left: '84%', top: '44%' },
  'click-reveal': { left: '84%', top: '44%' },
  revealed: { left: '84%', top: '44%' },
};

export function HeroDemo({ className = '' }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion.current) {
      setPhaseIndex(5); // land on "revealed" and stay there
      return;
    }

    let timer;
    let i = 0;
    const step = () => {
      setPhaseIndex(i);
      timer = setTimeout(() => {
        i = (i + 1) % PHASES.length;
        step();
      }, PHASES[i].ms);
    };
    step();
    return () => clearTimeout(timer);
  }, []);

  const phase = PHASES[phaseIndex].name;
  const showApp = phase !== 'logo' && phase !== 'fade-back';
  const showLogin = phase === 'login' || phase === 'login-click';
  const showPeople = !showLogin && showApp;
  const revealed = phase === 'revealed' || phase === 'fade-out';
  const clicking = phase === 'login-click' || phase === 'click-reveal';
  const cursorPos = CURSOR_POS[phase] ?? CURSOR_POS.revealed;
  const cursorVisible = showApp;
  const panelFaded = phase === 'fade-out' || phase === 'logo' || phase === 'fade-back';

  return (
    <div
      className={`relative h-[380px] overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-dp-md ${className}`}
    >
      {/* App screen */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: panelFaded ? 0 : 1 }}
      >
        <div className="flex items-center gap-2 border-b border-white/10 bg-ink-950 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-ink-300">
            app.datapit.io/{showLogin ? 'login' : 'people'}
          </span>
        </div>

        {/* Login screen */}
        <div
          className="absolute inset-x-0 top-[46px] bottom-0 flex items-center justify-center transition-opacity duration-500"
          style={{ opacity: showLogin ? 1 : 0, pointerEvents: 'none' }}
        >
          <div className="w-[230px] rounded-lg border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold text-white">Sign in to your workspace</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="h-8 rounded-md border border-white/10 bg-ink-950 px-2.5 py-2 text-[11px] text-ink-500">
                demo@datapit.io
              </div>
              <div className="h-8 rounded-md border border-white/10 bg-ink-950 px-2.5 py-2 text-[11px] text-ink-500">
                &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
              </div>
              <div
                className={`mt-1 flex h-8 items-center justify-center rounded-md bg-gradient-action text-[11px] font-bold text-white transition-transform ${
                  clicking && showLogin ? 'scale-95' : 'scale-100'
                }`}
              >
                Sign in
              </div>
            </div>
          </div>
        </div>

        {/* People screen */}
        <div
          className="absolute inset-x-0 top-[46px] bottom-0 p-4 transition-opacity duration-500"
          style={{ opacity: showPeople ? 1 : 0, pointerEvents: 'none' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-white">122 people</span>
            <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold tabular-nums text-mauve-magic">
              {revealed ? '99' : '100'} credits
              {revealed && <FloatingMinusOne />}
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-300">
                <th className="pb-2 font-bold">Name</th>
                <th className="pb-2 font-bold">Company</th>
                <th className="pb-2 font-bold">Email</th>
              </tr>
            </thead>
            <tbody>
              <PersonRow
                name="Avery Bennett"
                title="Head of Marketing"
                company="Drift Labs"
                email="avery.bennett@driftlabs.com"
                state="revealed"
              />
              <PersonRow
                name="Avery Kowalski"
                title="VP of Sales"
                company="Atlas Labs"
                email="avery.kowalski@atlaslabs.com"
                state={revealed ? 'revealed' : phase === 'click-reveal' ? 'revealing' : 'masked'}
              />
              <PersonRow
                name="Casey Novak"
                title="Head of Marketing"
                company="Halo Labs"
                state="masked"
              />
              <PersonRow
                name="Casey Ortiz"
                title="Sales Development Manager"
                company="Nova Labs"
                email="casey.ortiz@novalabs.com"
                state="revealed"
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Cursor */}
      <div
        className="pointer-events-none absolute z-10 transition-all duration-700 ease-out"
        style={{
          left: cursorPos.left,
          top: cursorPos.top,
          opacity: cursorVisible ? 1 : 0,
          transform: `translate(-4px, -2px) scale(${clicking ? 0.85 : 1})`,
        }}
      >
        <Cursor />
        {clicking && <span className="absolute -inset-2 animate-ping rounded-full bg-white/30" />}
      </div>

      {/* Logo / CTA screen */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 transition-opacity duration-700"
        style={{ opacity: phase === 'logo' ? 1 : 0, pointerEvents: 'none' }}
      >
        <img src="/logos/datapit-mark-white.svg" alt="" className="h-14 w-14" />
        <p className="text-lg font-extrabold tracking-tight text-white">Start For Free</p>
      </div>
    </div>
  );
}

function PersonRow({ name, title, company, email, state }) {
  return (
    <tr className="border-t border-white/5">
      <td className="py-2.5 pr-2">
        <p className="font-semibold text-white">{name}</p>
        <p className="text-[10px] text-ink-300">{title}</p>
      </td>
      <td className="py-2.5 pr-2 text-ink-300">{company}</td>
      <td className="py-2.5">
        {state === 'revealed' && <span className="text-white">{email}</span>}
        {state === 'masked' && (
          <span className="rounded-md border border-white/15 px-2 py-1 text-[10px] font-bold text-mauve-magic">
            Reveal
          </span>
        )}
        {state === 'revealing' && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-mauve-magic border-t-transparent" />
        )}
      </td>
    </tr>
  );
}

function FloatingMinusOne() {
  return (
    <span className="relative">
      <span className="animate-[float-up_1.4s_ease-out_1] text-emerald-400">&minus;1</span>
    </span>
  );
}

function Cursor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1">
      <path d="M4 2l14 8-6 1.5L14 20l-3-6.5L4 16V2z" />
    </svg>
  );
}
