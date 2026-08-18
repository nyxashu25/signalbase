import { useState } from 'react';

export function ContactRow({ contact, onReveal }) {
  const [status, setStatus] = useState('idle'); // idle | revealing | error
  const [error, setError] = useState(null);

  async function handleReveal() {
    setStatus('revealing');
    setError(null);
    try {
      await onReveal(contact.id);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Reveal failed');
    }
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 text-sm font-medium text-slate-900">
        {contact.firstName} {contact.lastName}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{contact.title ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{contact.company?.name ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{contact.department ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        {contact.revealed ? (
          <span className="text-slate-900">{contact.email}</span>
        ) : contact.email ? (
          <span className="font-mono text-slate-400">{contact.email}</span>
        ) : (
          <span className="text-slate-300">Not found yet</span>
        )}
        {status === 'error' && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </td>
      <td className="px-4 py-3 text-right">
        {!contact.revealed && (
          <button
            type="button"
            onClick={handleReveal}
            disabled={status === 'revealing'}
            title="Spends 1 credit — finds and unlocks this contact's email"
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'revealing' ? 'Revealing…' : 'Reveal'}
          </button>
        )}
      </td>
    </tr>
  );
}
