import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Sparkles, Send, MailOpen, MousePointerClick, Reply, AlertOctagon, Users } from 'lucide-react';
import { useListSequencesQuery, useGetSequencesAnalyticsQuery } from '../api/sequencesApi.js';
import { useGetBillingSummaryQuery } from '../api/billingApi.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Card, TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonRows, Skeleton } from '../components/ui/Skeleton.jsx';
import { InfoHint } from '../components/ui/Tooltip.jsx';
import { Illustration } from '../components/ui/illustrations.jsx';

const STATUS_TONE = { DRAFT: 'neutral', ACTIVE: 'success', PAUSED: 'warning', ARCHIVED: 'neutral' };
const STATUS_LABEL = { DRAFT: 'Draft', ACTIVE: 'Active', PAUSED: 'Paused', ARCHIVED: 'Archived' };

const VIEWS = ['all', 'analytics'];

export function Sequences() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('view');
  const view = VIEWS.includes(requested) ? requested : 'all';
  const { data: sequences, isLoading } = useListSequencesQuery();
  const { data: summary } = useGetBillingSummaryQuery();
  const isFreePlan = summary?.plan === 'FREE';
  const isEmpty = sequences && sequences.length === 0;

  function setView(next) {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('view');
    else params.set('view', next);
    setSearchParams(params, { replace: true });
  }

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
        tabs={[
          { key: 'all', label: 'All sequences', count: sequences?.length },
          { key: 'analytics', label: 'Analytics' },
        ]}
        activeTab={view}
        onTabChange={setView}
      />

      {isFreePlan && (
        <Banner tone="info" className="mb-4" action="See plans" actionTo="/app/billing">
          Sequences aren&rsquo;t available on the Free plan. Sequences built before a downgrade
          still show below; upgrade your workspace to build or enroll into new ones.
        </Banner>
      )}

      {view === 'analytics' ? (
        <SequencesAnalytics />
      ) : isEmpty ? (
        <Card>
          <EmptyState
            illustration={<Illustration.Sequences />}
            title="Create your first sequence"
            actions={
              isFreePlan ? (
                <Button variant="primary" icon={Sparkles} to="/app/billing">
                  Upgrade to unlock sequences
                </Button>
              ) : (
                <>
                  <Button variant="primary" icon={Plus} to="/app/sequences/new">
                    Create sequence
                  </Button>
                  <Button variant="secondary" icon={Users} to="/app/lists">
                    Build a list first
                  </Button>
                </>
              )
            }
            learnMore={
              <>
                Each enrollment costs credits —{' '}
                <Link to="/app/help#sequences" className="font-semibold text-primary hover:underline">
                  how sequences work
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

const KPIS = [
  { key: 'SENT', label: 'Sent', icon: Send, hint: 'Emails handed to the sending provider across every sequence.' },
  { key: 'OPENED', label: 'Opened', icon: MailOpen, rate: 'openRate', hint: 'Unique open events. Rate is opens ÷ sent.' },
  { key: 'CLICKED', label: 'Clicked', icon: MousePointerClick, rate: 'clickRate', hint: 'Link clicks inside sent emails. Rate is clicks ÷ sent.' },
  { key: 'REPLIED', label: 'Replied', icon: Reply, rate: 'replyRate', hint: 'Replies detected by the sending provider. Rate is replies ÷ sent.' },
  { key: 'BOUNCED', label: 'Bounced', icon: AlertOctagon, rate: 'bounceRate', hint: 'Hard and soft bounces. Bounced addresses are suppressed automatically.' },
];

function pct(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function SequencesAnalytics() {
  const { data: analytics, isLoading } = useGetSequencesAnalyticsQuery();

  if (isLoading || !analytics) {
    return (
      <div aria-busy="true">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {KPIS.map((k) => (
            <Card key={k.key} className="p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-8 w-14" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const nothingSent = analytics.totals.SENT === 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {KPIS.map(({ key, label, icon: Icon, rate, hint }) => (
          <Card key={key} className="p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
              <InfoHint content={hint} />
            </div>
            <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-text">
              {analytics.totals[key] ?? 0}
            </p>
            {rate && (
              <p className="mt-0.5 text-xs tabular-nums text-text-muted">{pct(analytics.rates[rate])} of sent</p>
            )}
          </Card>
        ))}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        {analytics.enrollments.total} {analytics.enrollments.total === 1 ? 'contact' : 'contacts'} enrolled
        across all sequences · {analytics.enrollments.active} active right now.
      </p>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-text">Per sequence</h2>
        <TableFrame>
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className={thClass}>Sequence</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Enrolled</th>
                <th className={`${thClass} text-right`}>Sent</th>
                <th className={`${thClass} text-right`}>Opened</th>
                <th className={`${thClass} text-right`}>Clicked</th>
                <th className={`${thClass} text-right`}>Replied</th>
                <th className={`${thClass} text-right`}>Bounced</th>
              </tr>
            </thead>
            <tbody>
              {analytics.sequences.map((s) => (
                <tr key={s.id} className={trClass}>
                  <td className={tdClass}>
                    <Link to={`/app/sequences/${s.id}`} className="font-semibold hover:text-primary hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONE[s.status]} dot>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </StatusPill>
                  </td>
                  {['enrolled', 'SENT', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED'].map((k) => (
                    <td key={k} className={`${tdMutedClass} text-right tabular-nums`}>
                      {s[k] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
              {analytics.sequences.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState compact illustration={<Illustration.Activity />} title="Nothing to measure yet">
                      Create a sequence, activate it and enroll a contact — every send, open, click and reply
                      lands here.
                    </EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableFrame>
        {nothingSent && analytics.sequences.length > 0 && (
          <p className="mt-3 text-xs text-text-muted">
            No emails have gone out yet — rates fill in once the first step sends.
          </p>
        )}
      </div>
    </div>
  );
}
