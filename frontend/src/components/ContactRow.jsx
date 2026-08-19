import { useState } from 'react';
import { AddToListButton } from './AddToListButton.jsx';

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
    <tr className="border-b border-border hover:bg-surface">
      <td className="px-4 py-3 text-sm font-medium text-text">
        {contact.firstName} {contact.lastName}
      </td>
      <td className="px-4 py-3 text-sm text-text-muted">{contact.title ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-text-muted">{contact.company?.name ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-text-muted">{contact.department ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        {contact.revealed ? (
          <span className="text-text">{contact.email}</span>
        ) : contact.email ? (
          <span className="font-mono text-text-muted">{contact.email}</span>
        ) : (
          <span className="text-ink-300">Not found yet</span>
        )}
        {status === 'error' && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {!contact.revealed && (
            <button
              type="button"
              onClick={handleReveal}
              disabled={status === 'revealing'}
              title="Spends 1 credit — finds and unlocks this contact's email"
              className="rounded-md border border-border px-2 py-1 text-xs text-text-muted hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'revealing' ? 'Revealing…' : 'Reveal'}
            </button>
          )}
          <AddToListButton type="CONTACTS" contactId={contact.id} />
        </div>
      </td>
    </tr>
  );
}
