import { Link } from 'react-router-dom';
import { Plus, Send, Sparkles } from 'lucide-react';
import { useListSequencesQuery } from '../api/sequencesApi.js';
import { useGetBillingSummaryQuery } from '../api/billingApi.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Card, TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';

const STATUS_TONE = { DRAFT: 'neutral', ACTIVE: 'success', PAUSED: 'warning', ARCHIVED: 'neutral' };
const STATUS_LABEL = { DRAFT: 'Draft', ACTIVE: 'Active', PAUSED: 'Paused', ARCHIVED: 'Archived' };

export function Sequences() {
  const { data: sequences, isLoading } = useListSequencesQuery();
  const { data: summary } = useGetBillingSummaryQuery();
  const isFreePlan = summary?.plan === 'FREE';
  const isEmpty = sequences && sequences.length === 0;

  return (
    <div>
      <PageHeader
        title="Sequences"
        subtitle={sequences ? `${sequences.length} total` : undefined}
        description="Multi-step outreach cadences with wait steps. Enroll a list in one click and track opens as they come in."
        actions={
          isFreePlan ? (
            <Button variant="primary" icon={Sparkles} to="/app/billing">
              Upgrade to unlock
            </Button>
          ) : (
            <Button variant="hero" icon={Plus} to="/app/sequences/new">
              Create sequence
            </Button>
          )
        }
      />

      {isFreePlan && (
        <Banner
          tone="info"
          className="mb-4"
          action="See plans"
          actionTo="/app/billing"
        >
          Sequences aren&rsquo;t available on the Free plan. Sequences built before a downgrade
          still show below; upgrade your workspace to build or enroll into new ones.
        </Banner>
      )}

      {isEmpty ? (
        <Card>
          <EmptyState
            icon={Send}
            title="Create your first sequence"
            actions={
              isFreePlan ? (
                <Button variant="primary" icon={Sparkles} to="/app/billing">
                  Upgrade to unlock sequences
                </Button>
              ) : (
                <Button variant="primary" icon={Plus} to="/app/sequences/new">
                  Create sequence
                </Button>
              )
            }
            learnMore={
              <>
                Need people to enroll first?{' '}
                <Link to="/app/lists" className="font-semibold text-primary hover:underline">
                  Build a list
                </Link>
                .
              </>
            }
          >
            Automate a cadence of emails and wait steps, enroll a list, and watch replies land in
            your inbox.
          </EmptyState>
        </Card>
      ) : (
        <TableFrame>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Steps</th>
                <th className={thClass}>Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows rows={5} columns={4} />}
              {sequences?.map((seq) => (
                <tr key={seq.id} className={trClass}>
                  <td className={tdClass}>
                    <Link
                      to={`/app/sequences/${seq.id}`}
                      className="font-semibold hover:text-primary hover:underline"
                    >
                      {seq.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[seq.status]} dot>
                      {STATUS_LABEL[seq.status] ?? seq.status}
                    </StatusPill>
                  </td>
                  <td className={`${tdMutedClass} tabular-nums`}>{seq._count?.steps ?? 0}</td>
                  <td className={`${tdMutedClass} tabular-nums`}>
                    {seq._count?.enrollments ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      )}
    </div>
  );
}
