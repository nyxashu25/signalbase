import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useGetTicketQuery,
  useGetTicketSubjectsQuery,
  useReplyToTicketMutation,
} from '../api/ticketsApi.js';

const TYPE_LABELS = { SUPPORT: 'Support', SALES: 'Sales' };

const STATUS_STYLES = {
  UNANSWERED: 'bg-amber-500/15 text-amber-600',
  ANSWERED: 'bg-emerald-500/15 text-emerald-600',
  CLOSED: 'bg-surface text-text-muted',
};

const STATUS_LABELS = {
  UNANSWERED: 'Awaiting reply',
  ANSWERED: 'Answered',
  CLOSED: 'Closed',
};

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function TicketDetail() {
  const { id } = useParams();
  const { data: ticket, isLoading } = useGetTicketQuery(id);
  const { data: subjectsData } = useGetTicketSubjectsQuery();
  const [replyToTicket, { isLoading: replying }] = useReplyToTicketMutation();

  const [body, setBody] = useState('');
  const [error, setError] = useState(null);

  const maxWords = subjectsData?.maxWords ?? 200;
  const wordCount = countWords(body);
  const overLimit = wordCount > maxWords;
  const canReply = body.trim() && !overLimit;

  async function handleReply(e) {
    e.preventDefault();
    if (!canReply) return;
    setError(null);
    try {
      await replyToTicket({ id, body: body.trim() }).unwrap();
      setBody('');
    } catch (err) {
      setError(err.data?.error?.message || 'Could not send your reply. Please try again.');
    }
  }

  if (isLoading) return <p className="text-sm text-text-muted">Loading…</p>;
  if (!ticket) return <p className="text-sm text-text-muted">Ticket not found.</p>;

  return (
    <div className="max-w-2xl">
      <Link to="/app/tickets" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to tickets
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">{ticket.subject}</h1>
          <p className="mt-1 text-xs font-medium text-text-muted">{TYPE_LABELS[ticket.type]} ticket</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[ticket.status]}`}>
          {STATUS_LABELS[ticket.status]}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg border p-4 ${
              m.authorType === 'ADMIN'
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-surface-elevated'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text">
                {m.authorType === 'ADMIN' ? `${m.authorName} · DataPit` : m.authorName}
              </span>
              <span className="text-xs text-text-muted">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text">{m.body}</p>
          </div>
        ))}
      </div>

      {ticket.status === 'CLOSED' ? (
        <p className="mt-6 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-muted">
          This ticket is closed. Raise a new ticket if you need further help.
        </p>
      ) : (
        <form onSubmit={handleReply} className="mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-text-muted">Reply</span>
            <span className={`text-xs tabular-nums ${overLimit ? 'text-red-600' : 'text-text-muted'}`}>
              {wordCount}/{maxWords} words
            </span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Write a reply…"
            className={`rounded-md border bg-surface px-3 py-2 text-sm text-text focus:outline-none ${
              overLimit ? 'border-red-500' : 'border-border focus:border-focus'
            }`}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={!canReply || replying}
            className="self-start rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {replying ? 'Sending…' : 'Send reply'}
          </button>
        </form>
      )}
    </div>
  );
}
