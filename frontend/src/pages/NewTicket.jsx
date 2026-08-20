import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGetTicketSubjectsQuery, useCreateTicketMutation } from '../api/ticketsApi.js';

const TYPES = [
  { key: 'SUPPORT', label: 'Support' },
  { key: 'SALES', label: 'Sales' },
];

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function NewTicket() {
  const navigate = useNavigate();
  const { data: subjectsData } = useGetTicketSubjectsQuery();
  const [createTicket, { isLoading }] = useCreateTicketMutation();

  const [type, setType] = useState('SUPPORT');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);

  const maxWords = subjectsData?.maxWords ?? 200;
  const subjectOptions = subjectsData?.subjects?.[type] ?? [];
  const wordCount = countWords(body);
  const overLimit = wordCount > maxWords;
  const canSubmit = subject && body.trim() && !overLimit;

  function handleTypeChange(nextType) {
    setType(nextType);
    setSubject('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      const ticket = await createTicket({ type, subject, body: body.trim() }).unwrap();
      navigate(`/app/tickets/${ticket.id}`);
    } catch (err) {
      setError(err.data?.error?.message || 'Could not raise the ticket. Please try again.');
    }
  }

  return (
    <div className="max-w-xl">
      <Link to="/app/tickets" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to tickets
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-text">New ticket</h1>
      <p className="mt-1 text-sm text-text-muted">
        Pick what this is about and describe it in a short paragraph — our team replies right here on
        the ticket.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-text-muted">Type</span>
          <div className="mt-2 inline-flex rounded-md border border-border p-0.5">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTypeChange(t.key)}
                className={`rounded px-4 py-1.5 text-sm font-bold ${
                  type === t.key ? 'bg-gradient-action text-white' : 'text-text-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-text-muted">Subject</span>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-focus focus:outline-none"
          >
            <option value="" disabled>
              Select a subject…
            </option>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-text-muted">
              Describe your {type === 'SUPPORT' ? 'issue' : 'request'}
            </span>
            <span className={`text-xs tabular-nums ${overLimit ? 'text-red-600' : 'text-text-muted'}`}>
              {wordCount}/{maxWords} words
            </span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={6}
            placeholder="A few sentences is plenty — we'll follow up here with any questions."
            className={`rounded-md border bg-surface px-3 py-2 text-sm text-text focus:outline-none ${
              overLimit ? 'border-red-500' : 'border-border focus:border-focus'
            }`}
          />
          {overLimit && (
            <span className="text-xs text-red-600">Please trim this to {maxWords} words or fewer.</span>
          )}
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit || isLoading}
          className="self-start rounded-md bg-gradient-action px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Raising ticket…' : 'Raise ticket'}
        </button>
      </form>
    </div>
  );
}
