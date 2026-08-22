import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import {
  useGetTicketQuery,
  useGetTicketSubjectsQuery,
  useReplyToTicketMutation,
} from '../api/ticketsApi.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Card } from '../components/ui/Card.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { LetterAvatar } from '../components/ui/LetterAvatar.jsx';
import { TICKET_STATUS_TONE, TICKET_STATUS_LABELS } from './Tickets.jsx';

const TYPE_LABELS = { SUPPORT: 'Support', SALES: 'Sales' };

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

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-7 w-72" />
        <Card className="mt-6 p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </Card>
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="max-w-3xl">
        <PageHeader backTo="/app/tickets" backLabel="Tickets" title="Ticket" />
        <Banner tone="danger" title="Ticket not found" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        backTo="/app/tickets"
        backLabel="Tickets"
        title={ticket.subject}
        subtitle={`${TYPE_LABELS[ticket.type]} ticket`}
        actions={
          <StatusPill tone={TICKET_STATUS_TONE[ticket.status]} dot className="text-xs">
            {TICKET_STATUS_LABELS[ticket.status]}
          </StatusPill>
        }
      />

      <div className="flex flex-col gap-3">
        {ticket.messages.map((m) => {
          const isAdmin = m.authorType === 'ADMIN';
          return (
            <Card
              key={m.id}
              className={`p-4 ${isAdmin ? 'border-primary/30 bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <LetterAvatar name={isAdmin ? 'DataPit' : m.authorName} size="sm" />
                <span className="text-xs font-bold text-text">
                  {isAdmin ? `${m.authorName} · DataPit` : m.authorName}
                </span>
                <span className="ml-auto text-xs text-text-muted">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2.5 whitespace-pre-wrap text-sm text-text">{m.body}</p>
            </Card>
          );
        })}
      </div>

      {ticket.status === 'CLOSED' ? (
        <Banner tone="info" className="mt-6" action="New ticket" actionTo="/app/tickets/new">
          This ticket is closed. Raise a new ticket if you need further help.
        </Banner>
      ) : (
        <form onSubmit={handleReply} className="mt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
              Reply
            </span>
            <span
              className={`text-xs tabular-nums ${overLimit ? 'text-red-600' : 'text-text-muted'}`}
            >
              {wordCount}/{maxWords} words
            </span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Write a reply…"
            className={`rounded-md border bg-surface-elevated px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus/25 ${
              overLimit ? 'border-red-500' : 'border-border focus:border-focus'
            }`}
          />
          {error && <Banner tone="danger">{error}</Banner>}
          <div>
            <Button type="submit" variant="primary" icon={Send} loading={replying} disabled={!canReply}>
              Send reply
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
