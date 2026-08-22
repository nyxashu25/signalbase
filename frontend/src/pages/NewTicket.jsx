import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetTicketSubjectsQuery, useCreateTicketMutation } from '../api/ticketsApi.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Card } from '../components/ui/Card.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';

const TYPES = [
  { value: 'SUPPORT', label: 'Support' },
  { value: 'SALES', label: 'Sales' },
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

  const labelClass = 'text-[11px] font-bold uppercase tracking-wide text-text-muted';
  const fieldClass =
    'rounded-md border bg-surface-elevated px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-focus/25';

  return (
    <div className="max-w-2xl">
      <PageHeader
        backTo="/app/tickets"
        backLabel="Tickets"
        title="New ticket"
        description="Pick what this is about and describe it in a short paragraph — our team replies right here on the ticket."
      />

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <span className={labelClass}>Type</span>
            <div className="mt-2">
              <SegmentedControl
                ariaLabel="Ticket type"
                size="md"
                value={type}
                onChange={handleTypeChange}
                options={TYPES}
              />
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Subject</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className={`${fieldClass} border-border focus:border-focus`}
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
              <span className={labelClass}>
                Describe your {type === 'SUPPORT' ? 'issue' : 'request'}
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
              required
              rows={6}
              placeholder="A few sentences is plenty — we'll follow up here with any questions."
              className={`${fieldClass} ${
                overLimit ? 'border-red-500' : 'border-border focus:border-focus'
              }`}
            />
            {overLimit && (
              <span className="text-xs text-red-600">
                Please trim this to {maxWords} words or fewer.
              </span>
            )}
          </label>

          {error && <Banner tone="danger">{error}</Banner>}

          <div>
            <Button type="submit" variant="primary" loading={isLoading} disabled={!canSubmit}>
              Raise ticket
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
