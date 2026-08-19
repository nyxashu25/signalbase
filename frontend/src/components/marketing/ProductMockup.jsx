// Real product UI, hand-built to match the actual People-search screen
// (src/pages/People.jsx / ContactRow.jsx) using real seed-data names —
// not a stock photo or a fabricated customer screenshot.
const ROWS = [
  {
    name: 'Avery Bennett',
    title: 'Head of Marketing',
    company: 'Drift Labs',
    email: 'avery.bennett@driftlabs.com',
    revealed: true,
  },
  {
    name: 'Avery Kowalski',
    title: 'VP of Sales',
    company: 'Atlas Labs',
    email: null,
    revealed: false,
  },
  {
    name: 'Casey Novak',
    title: 'Head of Marketing',
    company: 'Halo Labs',
    email: null,
    revealed: false,
  },
  {
    name: 'Casey Ortiz',
    title: 'Sales Development Manager',
    company: 'Nova Labs',
    email: 'casey.ortiz@novalabs.com',
    revealed: true,
  },
];

function mask(email) {
  const [user, domain] = email.split('@');
  return `${user[0]}${'*'.repeat(Math.max(user.length - 1, 3))}@${domain[0]}${'*'.repeat(Math.max(domain.length - 5, 3))}.com`;
}

export function ProductMockup({ className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-dp-md ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-ink-950 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-ink-300">
          app.datapit.io/people
        </span>
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-white">122 people</span>
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-mauve-magic">
            Live search
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
            {ROWS.map((r) => (
              <tr key={r.name} className="border-t border-white/5">
                <td className="py-2.5 pr-2">
                  <p className="font-semibold text-white">{r.name}</p>
                  <p className="text-[10px] text-ink-300">{r.title}</p>
                </td>
                <td className="py-2.5 pr-2 text-ink-300">{r.company}</td>
                <td className="py-2.5">
                  {r.revealed ? (
                    <span className="text-white">{r.email}</span>
                  ) : r.email ? (
                    <span className="font-mono text-ink-500">{mask(r.email)}</span>
                  ) : (
                    <button
                      type="button"
                      className="rounded-md border border-white/15 px-2 py-1 text-[10px] font-bold text-mauve-magic"
                    >
                      Reveal
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
