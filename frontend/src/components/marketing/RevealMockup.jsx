export function RevealMockup({ className = '' }) {
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
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-action text-sm font-bold text-white">
            JP
          </div>
          <div>
            <p className="text-sm font-bold text-white">Jordan Price</p>
            <p className="text-xs text-ink-300">
              Director of Revenue Operations &middot; Beacon Labs
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-300">Email</p>
          <p className="mt-1 font-mono text-sm text-white">jordan.price@beaconlabs.com</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
              Verified
            </span>
            <span className="text-[11px] font-bold text-mauve-magic">−1 credit</span>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-ink-500">
          Revealed by you &middot; now visible to your whole workspace
        </p>
      </div>
    </div>
  );
}
