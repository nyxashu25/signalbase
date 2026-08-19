import { useEffect, useRef, useState } from 'react';

const QUERY = 'Marketing';
const ROWS = [
  { name: 'Avery Bennett', title: 'Head of Marketing', company: 'Drift Labs', dept: 'Marketing' },
  { name: 'Avery Kowalski', title: 'VP of Sales', company: 'Atlas Labs', dept: 'Sales' },
  { name: 'Casey Novak', title: 'Head of Marketing', company: 'Halo Labs', dept: 'Marketing' },
  { name: 'Casey Ortiz', title: 'SDR Manager', company: 'Nova Labs', dept: 'Sales' },
];

// Steps: type the query letter by letter, hold on the filtered result,
// clear, hold empty, repeat.
function buildSteps() {
  const steps = [{ text: '', ms: 900 }];
  for (let i = 1; i <= QUERY.length; i++) steps.push({ text: QUERY.slice(0, i), ms: 90 });
  steps.push({ text: QUERY, ms: 1800 });
  steps.push({ text: '', ms: 1100 });
  return steps;
}
const STEPS = buildSteps();

export function AnimatedSearchMockup({ className = '' }) {
  const [stepIndex, setStepIndex] = useState(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) {
      setStepIndex(STEPS.length - 2); // filtered + held
      return;
    }
    let timer;
    let i = 0;
    const step = () => {
      setStepIndex(i);
      timer = setTimeout(() => {
        i = (i + 1) % STEPS.length;
        step();
      }, STEPS[i].ms);
    };
    step();
    return () => clearTimeout(timer);
  }, []);

  const query = STEPS[stepIndex].text;
  const filtered = query
    ? ROWS.filter((r) => r.dept.toLowerCase().startsWith(query.toLowerCase()))
    : ROWS;

  return (
    <div className={`[perspective:1400px] ${className}`}>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-dp-md animate-[ambient-tilt_10s_ease-in-out_infinite]">
        <div className="flex items-center gap-2 border-b border-white/10 bg-ink-950 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-ink-300">
            app.datapit.io/people
          </span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex h-8 items-center rounded-md border border-white/10 bg-white/5 px-3">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mr-2 shrink-0 text-ink-500"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-white">{query}</span>
            <span className="ml-0.5 h-3.5 w-px animate-pulse bg-mauve-magic" />
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-300">
                <th className="pb-2 font-bold">Name</th>
                <th className="pb-2 font-bold">Department</th>
                <th className="pb-2 font-bold">Company</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => {
                const match = filtered.includes(r);
                return (
                  <tr
                    key={r.name}
                    className="border-t border-white/5 transition-all duration-300"
                    style={{ opacity: match ? 1 : 0.25 }}
                  >
                    <td className="py-2.5 pr-2">
                      <p className="font-semibold text-white">{r.name}</p>
                      <p className="text-[10px] text-ink-300">{r.title}</p>
                    </td>
                    <td className="py-2.5 pr-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          match && query ? 'bg-primary/20 text-mauve-magic' : 'text-ink-300'
                        }`}
                      >
                        {r.dept}
                      </span>
                    </td>
                    <td className="py-2.5 text-ink-300">{r.company}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
