export function ContactRow({ contact }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 text-sm font-medium text-slate-900">
        {contact.firstName} {contact.lastName}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{contact.title ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{contact.company?.name ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{contact.department ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        {contact.email ? (
          <span className={contact.revealed ? 'text-slate-900' : 'font-mono text-slate-400'}>
            {contact.email}
          </span>
        ) : (
          <span className="text-slate-300">Not found yet</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {contact.email && !contact.revealed && (
          <button
            type="button"
            disabled
            title="Email reveal spends a credit — ships in Phase 03"
            className="cursor-not-allowed rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-400"
          >
            Reveal
          </button>
        )}
      </td>
    </tr>
  );
}
