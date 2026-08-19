import { useEffect, useRef, useState } from 'react';

// A looping, scripted product tour: sign in -> open People -> reveal a
// contact -> save it to a list -> browse Companies and filter by industry ->
// that same list enrolls into a sequence -> watch the credit ledger -> fade
// to the DataPit mark + CTA -> loop. Every screen here is a faithful
// (hand-built, not a photo) reproduction of the real app UI and real seed
// data — the list name ("Q3 outbound — Marketing leaders") is the same
// string across the People and Sequences screens on purpose, so the tour
// reads as one continuous workflow rather than four disconnected demos.
const PHASES = [
  { name: 'login', ms: 1800, screen: 'login' },
  { name: 'login-click', ms: 450, screen: 'login' },
  { name: 'people', ms: 1300, screen: 'people' },
  { name: 'move-to-reveal', ms: 900, screen: 'people' },
  { name: 'click-reveal', ms: 500, screen: 'people' },
  { name: 'revealed', ms: 1300, screen: 'people' },
  { name: 'move-to-list', ms: 700, screen: 'people' },
  { name: 'click-list', ms: 450, screen: 'people' },
  { name: 'added-to-list', ms: 1600, screen: 'people' },
  { name: 'to-companies', ms: 400, screen: null },
  { name: 'companies', ms: 1300, screen: 'companies' },
  { name: 'move-to-facet', ms: 800, screen: 'companies' },
  { name: 'click-facet', ms: 450, screen: 'companies' },
  { name: 'filtered', ms: 1700, screen: 'companies' },
  { name: 'to-sequences', ms: 400, screen: null },
  { name: 'sequences', ms: 1900, screen: 'sequences' },
  { name: 'to-credits', ms: 400, screen: null },
  { name: 'credits', ms: 1900, screen: 'credits' },
  { name: 'fade-out', ms: 600, screen: null },
  { name: 'logo', ms: 2800, screen: null },
  { name: 'fade-back', ms: 500, screen: null },
];

const CURSOR_POS = {
  login: { left: '76%', top: '70%' },
  'login-click': { left: '76%', top: '70%' },
  people: { left: '50%', top: '16%' },
  'move-to-reveal': { left: '85%', top: '43%' },
  'click-reveal': { left: '85%', top: '43%' },
  revealed: { left: '85%', top: '43%' },
  'move-to-list': { left: '94%', top: '43%' },
  'click-list': { left: '94%', top: '43%' },
  'added-to-list': { left: '94%', top: '43%' },
  companies: { left: '50%', top: '16%' },
  'move-to-facet': { left: '78%', top: '30%' },
  'click-facet': { left: '78%', top: '30%' },
  filtered: { left: '78%', top: '30%' },
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
  const screen = PHASES[phaseIndex].screen;
  const revealed =
    phase === 'revealed' ||
    phase === 'move-to-list' ||
    phase === 'click-list' ||
    phase === 'added-to-list';
  const addedToList = phase === 'added-to-list';
  const filtered = phase === 'filtered';
  const clicking =
    phase === 'login-click' ||
    phase === 'click-reveal' ||
    phase === 'click-list' ||
    phase === 'click-facet';
  const cursorPos = CURSOR_POS[phase] ?? CURSOR_POS.revealed;
  const cursorVisible = screen === 'login' || screen === 'people' || screen === 'companies';
  const panelFaded = screen === null && phase !== 'logo';
  const urlPath =
    screen === 'login'
      ? 'login'
      : screen === 'companies'
        ? 'companies'
        : screen === 'sequences'
          ? 'sequences'
          : screen === 'credits'
            ? 'billing'
            : 'people';

  return (
    <div className={`[perspective:1400px] ${className}`}>
      <div
        className="relative h-[460px] overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-[0_30px_80px_rgba(148,0,222,0.35)] animate-[ambient-tilt_9s_ease-in-out_infinite]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* App chrome + screens */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: panelFaded ? 0 : 1 }}
        >
          <div className="flex items-center gap-2 border-b border-white/10 bg-ink-950 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-ink-300">
              app.datapit.io/{urlPath}
            </span>
          </div>

          <ScreenFade active={screen === 'login'}>
            <div className="flex h-full items-center justify-center">
              <div className="w-[250px] rounded-lg border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold text-white">Sign in to your workspace</p>
                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="h-9 rounded-md border border-white/10 bg-ink-950 px-2.5 py-2.5 text-[11px] text-ink-500">
                    demo@datapit.io
                  </div>
                  <div className="h-9 rounded-md border border-white/10 bg-ink-950 px-2.5 py-2.5 text-[11px] text-ink-500">
                    &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
                  </div>
                  <div
                    className={`mt-1 flex h-9 items-center justify-center rounded-md bg-gradient-action text-[11px] font-bold text-white transition-transform ${
                      clicking && screen === 'login' ? 'scale-95' : 'scale-100'
                    }`}
                  >
                    Sign in
                  </div>
                </div>
              </div>
            </div>
          </ScreenFade>

          <ScreenFade active={screen === 'people'}>
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">122 people</span>
                <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold tabular-nums text-mauve-magic">
                  {revealed ? '98' : '100'} credits
                  {phase === 'revealed' && <FloatingMinusOne />}
                </span>
              </div>
              <table data-testid="hero-people-table" className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-ink-300">
                    <th className="pb-2 font-bold">Name</th>
                    <th className="pb-2 font-bold">Company</th>
                    <th className="pb-2 font-bold">Email</th>
                    <th className="pb-2 font-bold text-right">List</th>
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
                    state={
                      revealed ? 'revealed' : phase === 'click-reveal' ? 'revealing' : 'masked'
                    }
                    listState={addedToList ? 'added' : phase === 'click-list' ? 'adding' : 'idle'}
                    showListAction={revealed}
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
              {addedToList && (
                <p className="mt-3 animate-[float-up_1.8s_ease-out_1] text-[11px] font-semibold text-emerald-400">
                  Added to &ldquo;Q3 outbound &mdash; Marketing leaders&rdquo;
                </p>
              )}
            </div>
          </ScreenFade>

          <ScreenFade active={screen === 'companies'}>
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  {filtered ? '3' : '40'} companies
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors duration-300 ${
                    filtered
                      ? 'border-mauve-magic bg-primary/20 text-mauve-magic'
                      : 'border-white/15 text-ink-300'
                  }`}
                >
                  Industry: SaaS
                </span>
              </div>
              <table data-testid="hero-companies-table" className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-ink-300">
                    <th className="pb-2 font-bold">Company</th>
                    <th className="pb-2 font-bold">Industry</th>
                    <th className="pb-2 font-bold">Headcount</th>
                  </tr>
                </thead>
                <tbody>
                  <CompanyRow name="Drift Labs" industry="SaaS" headcount="51–200" />
                  <CompanyRow name="Atlas Labs" industry="SaaS" headcount="201–500" />
                  <CompanyRow
                    name="Halo Labs"
                    industry="Fintech"
                    headcount="11–50"
                    dim={filtered}
                  />
                  <CompanyRow name="Nova Labs" industry="SaaS" headcount="51–200" />
                </tbody>
              </table>
            </div>
          </ScreenFade>

          <ScreenFade active={screen === 'sequences'}>
            <div className="p-5">
              <p className="text-xs font-bold text-white">Q3 outbound &mdash; Marketing leaders</p>
              <p className="mt-0.5 text-[11px] text-ink-300">41 enrolled &middot; Active</p>
              <div className="mt-6 flex flex-col">
                {[
                  { label: 'Intro email', detail: 'Sent · 68% open rate' },
                  { label: 'Wait 3 days', detail: null },
                  { label: 'Follow-up', detail: 'Scheduled' },
                ].map((step, i) => (
                  <div key={step.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-action text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      {i < 2 && <span className="my-1 h-9 w-px bg-white/10" />}
                    </div>
                    <div className="pb-7">
                      <p className="text-xs font-semibold text-white">{step.label}</p>
                      {step.detail && <p className="text-[11px] text-ink-300">{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScreenFade>

          <ScreenFade active={screen === 'credits'}>
            <div className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-300">Balance</p>
              <p className="mt-1 text-4xl font-extrabold tabular-nums text-white">98 credits</p>
              <div className="mt-6 flex flex-col gap-2.5 border-t border-white/10 pt-4">
                {[
                  { label: 'Monthly grant', delta: '+100', tone: 'text-emerald-400' },
                  { label: 'Reveal · Avery Kowalski', delta: '−2', tone: 'text-ink-300' },
                ].map((e) => (
                  <div key={e.label} className="flex items-center justify-between text-xs">
                    <span className="text-ink-300">{e.label}</span>
                    <span className={`font-bold tabular-nums ${e.tone}`}>{e.delta}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScreenFade>
        </div>

        {/* Cursor + glow trail + click particles */}
        <div
          className="pointer-events-none absolute z-10 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-xl transition-all duration-[1100ms] ease-out"
          style={{
            left: cursorPos.left,
            top: cursorPos.top,
            opacity: cursorVisible ? 0.5 : 0,
            background: 'radial-gradient(circle, rgba(197,82,255,0.9), transparent 70%)',
          }}
        />
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
          {clicking && (
            <>
              <span className="absolute -inset-2 animate-ping rounded-full bg-white/30" />
              <ParticleBurst key={phase} />
            </>
          )}
        </div>

        {/* Logo / CTA screen */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-5 transition-opacity duration-700"
          style={{ opacity: phase === 'logo' ? 1 : 0, pointerEvents: 'none' }}
        >
          <img
            src="/logos/datapit-mark-white.svg"
            alt=""
            className="h-16 w-16"
            style={{ filter: 'drop-shadow(0 0 24px rgba(197,82,255,0.6))' }}
          />
          <p className="text-xl font-extrabold tracking-tight text-white">Start For Free</p>
        </div>
      </div>
    </div>
  );
}

function ScreenFade({ active, children }) {
  return (
    <div
      className="absolute inset-x-0 top-[46px] bottom-0 transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0, pointerEvents: 'none' }}
    >
      {children}
    </div>
  );
}

function PersonRow({
  name,
  title,
  company,
  email,
  state,
  listState = 'idle',
  showListAction = false,
}) {
  return (
    <tr className="border-t border-white/5">
      <td className="py-2.5 pr-2">
        <p className="font-semibold text-white">{name}</p>
        <p className="text-[10px] text-ink-300">{title}</p>
      </td>
      <td className="py-2.5 pr-2 text-ink-300">{company}</td>
      <td className="py-2.5 pr-2">
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
      <td className="py-2.5 text-right">
        {showListAction && (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold transition-all duration-300 ${
              listState === 'added'
                ? 'border-emerald-400/40 text-emerald-400'
                : 'border-white/15 text-mauve-magic'
            } ${listState === 'adding' ? 'scale-90' : 'scale-100'}`}
          >
            {listState === 'added' ? '✓ Added' : '+ List'}
          </span>
        )}
      </td>
    </tr>
  );
}

function CompanyRow({ name, industry, headcount, dim = false }) {
  return (
    <tr
      className="border-t border-white/5 transition-opacity duration-300"
      style={{ opacity: dim ? 0.3 : 1 }}
    >
      <td className="py-2.5 pr-2 font-semibold text-white">{name}</td>
      <td className="py-2.5 pr-2 text-ink-300">{industry}</td>
      <td className="py-2.5 tabular-nums text-ink-300">{headcount}</td>
    </tr>
  );
}

function FloatingMinusOne() {
  return <span className="animate-[float-up_1.4s_ease-out_1] text-emerald-400">&minus;2</span>;
}

const PARTICLE_VECTORS = [
  [18, -14],
  [-16, -16],
  [20, 10],
  [-18, 8],
  [4, -22],
  [-4, 20],
];

function ParticleBurst() {
  return (
    <>
      {PARTICLE_VECTORS.map(([dx, dy], i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-mauve-magic animate-[particle-burst_650ms_ease-out_forwards]"
          style={{ '--dx': `${dx}px`, '--dy': `${dy}px` }}
        />
      ))}
    </>
  );
}

function Cursor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1">
      <path d="M4 2l14 8-6 1.5L14 20l-3-6.5L4 16V2z" />
    </svg>
  );
}
