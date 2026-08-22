import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, Plus } from 'lucide-react';
import { useListTicketsQuery } from '../api/ticketsApi.js';
import { Pagination } from '../components/Pagination.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';

const PAGE_SIZE = 25;

const TABS = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'UNANSWERED', label: 'Unanswered' },
  { key: 'ANSWERED', label: 'Answered' },
  { key: 'CLOSED', label: 'Closed' },
];

const TYPE_LABELS = { SUPPORT: 'Support', SALES: 'Sales' };

export const TICKET_STATUS_TONE = { UNANSWERED: 'warning', ANSWERED: 'success', CLOSED: 'neutral' };
export const TICKET_STATUS_LABELS = {
  UNANSWERED: 'Awaiting reply',
  ANSWERED: 'Answered',
  CLOSED: 'Closed',
};

export function Tickets() {
  const [status, setStatus] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListTicketsQuery({ status, page, pageSize: PAGE_SIZE });

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Questions for support or sales — our team replies right here on the ticket."
        actions={
          <Button variant="hero" icon={Plus} to="/app/tickets/new">
            New ticket
          </Button>
        }
        tabs={TABS}
        activeTab={status}
        onTabChange={(key) => {
          setStatus(key);
          setPage(1);
        }}
      />

      <TableFrame>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thClass}>Subject</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Last update</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows rows={4} columns={4} />}
            {data?.results.map((t) => (
              <tr key={t.id} className={trClass}>
                <td className={tdClass}>
                  <Link
                    to={`/app/tickets/${t.id}`}
                    className="font-semibold hover:text-primary hover:underline"
                  >
                    {t.subject}
                  </Link>
                </td>
                <td className={tdMutedClass}>{TYPE_LABELS[t.type]}</td>
                <td className="px-4 py-3">
                  <StatusPill tone={TICKET_STATUS_TONE[t.status]} dot>
                    {TICKET_STATUS_LABELS[t.status]}
                  </StatusPill>
                </td>
                <td className={tdMutedClass}>{new Date(t.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {data && data.results.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    compact
                    icon={LifeBuoy}
                    title="No tickets here"
                    actions={
                      status === 'ACTIVE' || status === 'UNANSWERED' ? (
                        <Button variant="primary" icon={Plus} to="/app/tickets/new">
                          Raise a ticket
                        </Button>
                      ) : null
                    }
                  >
                    {status === 'CLOSED'
                      ? 'Closed tickets will show up here.'
                      : 'Stuck on something, or want to talk about your plan? Raise a ticket and we’ll reply on it.'}
                  </EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {data && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        )}
      </TableFrame>
    </div>
  );
}
