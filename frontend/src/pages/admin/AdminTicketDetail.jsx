import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useGetAdminTicketQuery,
  useReplyToAdminTicketMutation,
  useCloseAdminTicketMutation,
} from '../../api/adminDataApi.js';

const STATUS_STYLES = {
  UNANSWERED: 'bg-amber-500/15 text-amber-400',
  ANSWERED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-white/10 text-ink-300',
};

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const MAX_WORDS = 200;

export function AdminTicketDetail() {
  const { ticketId } = useParams();
  const { data: ticket, isLoading } = useGetAdminTicketQuery(ticketId);
  const [replyToTicket, { isLoading: replying }] = useReplyToAdminTicketMutation();
  const [closeTicket, { isLoading: closing }] = useCloseAdminTicketMutation();

  const [body, setBody] = useState('');
  const [error, setError] = useState(null);

  const wordCount = countWords(body);
  const overLimit = wordCount > MAX_WORDS;
  const canReply = body.trim() && !overLimit;

  async function handleReply(e) {
    e.preventDefault();
    if (!canReply) return;
    setError(null);
    try {
      await replyToTicket({ id: ticketId, body: body.trim() }).unwrap();
      setBody('');
    } catch (err) {
      setError(err.data?.error?.message || 'Could not send the reply. Please try again.');
    }
  }

  async function handleClose() {
    try {
      await closeTicket(ticketId).unwrap();
    } catch (err) {
      setError(err.data?.error?.message || 'Could not close the ticket.');
    }
  }

  if (isLoading) return <p className="text-sm text-ink-300">Loading…</p>;
  if (!ticket) return <p className="text-sm text-ink-300">Ticket not found.</p>;

  return (
    <div className="max-w-2xl">
      <Link to="/control/tickets" className="text-sm font-medium text-mauve-magic hover:underline">
        &larr; Back to tickets
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">{ticket.subject}</h1>
          <p className="mt-1 text-xs font-medium text-ink-300">
            {ticket.type} · {ticket.workspace?.name} · {ticket.createdBy?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[ticket.status]}`}>
            {ticket.status}
          </span>
          {ticket.status !== 'CLOSED' && (
            <button
              type="button"
              onClick={handleClose}
              disabled={closing}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-50"
            >
              {closing ? 'Closing…' : 'Close ticket'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg border p-4 ${
              m.authorType === 'ADMIN' ? 'border-mauve-magic/40 bg-mauve-magic/10' : 'border-white/10 bg-ink-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{m.authorName}</span>
              <span className="text-xs text-ink-300">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-100">{m.body}</p>
          </div>
        ))}
      </div>

      {ticket.status === 'CLOSED' ? (
        <p className="mt-6 rounded-md border border-white/10 bg-ink-900 px-4 py-3 text-sm text-ink-300">
          This ticket is closed.
        </p>
      ) : (
        <form onSubmit={handleReply} className="mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-300">Reply</span>
            <span className={`text-xs tabular-nums ${overLimit ? 'text-red-400' : 'text-ink-300'}`}>
              {wordCount}/{MAX_WORDS} words
            </span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Write a reply…"
            className={`rounded-md border bg-white/5 px-3 py-2 text-sm text-white outline-none ${
              overLimit ? 'border-red-500' : 'border-white/15 focus:border-neon-violet'
            }`}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={!canReply || replying}
            className="self-start rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {replying ? 'Sending…' : 'Send reply'}
          </button>
        </form>
      )}
    </div>
  );
}
