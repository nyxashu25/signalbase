import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useGetSequenceQuery,
  useGetSequenceAnalyticsQuery,
  useActivateSequenceMutation,
  useEnrollContactMutation,
  usePauseEnrollmentMutation,
  useResumeEnrollmentMutation,
  useUnenrollContactMutation,
} from '../api/sequencesApi.js';
import { useListListsQuery, useGetListQuery } from '../api/listsApi.js';
import { useGetCreditCostsQuery } from '../api/billingApi.js';

const ENROLLMENT_STATUS_STYLES = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-600',
  PAUSED: 'bg-amber-500/15 text-amber-600',
  COMPLETED: 'bg-primary/15 text-primary',
  UNENROLLED: 'bg-surface text-text-muted',
};

export function SequenceDetail() {
  const { id } = useParams();
  const { data: sequence, isLoading } = useGetSequenceQuery(id);
  const [activateSequence, { isLoading: activating }] = useActivateSequenceMutation();

  if (isLoading || !sequence) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  return (
    <div className="max-w-3xl">
      <Link to="/app/sequences" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to sequences
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{sequence.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {sequence.status} &middot; {sequence.enrollments.length} enrolled
          </p>
        </div>
        {sequence.status === 'DRAFT' && (
          <button
            type="button"
            disabled={activating}
            onClick={() => activateSequence(sequence.id)}
            className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] disabled:opacity-50"
          >
            {activating ? 'Activating…' : 'Activate'}
          </button>
        )}
      </div>

      <StepTimeline steps={sequence.steps} />

      {sequence.status !== 'DRAFT' && <SequenceAnalytics sequenceId={sequence.id} />}

      {sequence.status === 'ACTIVE' && <EnrollFromList sequenceId={sequence.id} />}

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-text-muted">Enrollments</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Step</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sequence.enrollments.map((enrollment) => (
              <EnrollmentRow key={enrollment.id} sequenceId={sequence.id} enrollment={enrollment} />
            ))}
            {sequence.enrollments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  {sequence.status === 'DRAFT'
                    ? 'Activate this sequence to start enrolling contacts.'
                    : 'No one enrolled yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepTimeline({ steps }) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-surface-elevated p-5">
      <div className="flex flex-col">
        {steps.map((step, i) => (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-action text-xs font-bold text-white">
                {i + 1}
              </span>
              {i < steps.length - 1 && <span className="my-1 h-8 w-px bg-border" />}
            </div>
            <div className="pb-6">
              {step.type === 'EMAIL' ? (
                <>
                  <p className="text-sm font-semibold text-text">{step.subject}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{step.body}</p>
                </>
              ) : (
                <p className="text-sm font-semibold text-text">Wait {step.waitDays} days</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPct(rate) {
  return `${Math.round(rate * 1000) / 10}%`;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}

function SequenceAnalytics({ sequenceId }) {
  const { data: analytics, isLoading } = useGetSequenceAnalyticsQuery(sequenceId);

  if (isLoading || !analytics) return null;
  const { totals, rates, perStep, enrollmentFunnel } = analytics;

  if (totals.SENT === 0) {
    return (
      <div className="mt-6 rounded-lg border border-border bg-surface-elevated p-4 text-sm text-text-muted">
        No emails sent yet — analytics will appear once the first step goes out.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">Analytics</h2>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Sent" value={totals.SENT} />
        <StatCard label="Open rate" value={formatPct(rates.openRate)} />
        <StatCard label="Click rate" value={formatPct(rates.clickRate)} />
        <StatCard label="Reply rate" value={formatPct(rates.replyRate)} />
        <StatCard label="Bounce rate" value={formatPct(rates.bounceRate)} />
      </div>

      <p className="mt-3 text-xs text-text-muted">
        {enrollmentFunnel.total} enrolled &middot; {enrollmentFunnel.active} active &middot;{' '}
        {enrollmentFunnel.paused} paused &middot; {enrollmentFunnel.completed} completed &middot;{' '}
        {enrollmentFunnel.unenrolled} unenrolled
      </p>

      {perStep.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3">Step</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3">Clicked</th>
                <th className="px-4 py-3">Replied</th>
                <th className="px-4 py-3">Bounced</th>
              </tr>
            </thead>
            <tbody>
              {perStep.map((step) => (
                <tr key={step.stepIndex} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-text">{step.subject}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-text-muted">{step.SENT}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                    {step.OPENED} {step.SENT > 0 && `(${formatPct(step.OPENED / step.SENT)})`}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                    {step.CLICKED} {step.SENT > 0 && `(${formatPct(step.CLICKED / step.SENT)})`}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                    {step.REPLIED} {step.SENT > 0 && `(${formatPct(step.REPLIED / step.SENT)})`}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                    {step.BOUNCED} {step.SENT > 0 && `(${formatPct(step.BOUNCED / step.SENT)})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EnrollFromList({ sequenceId }) {
  const { data: lists } = useListListsQuery();
  const [selectedListId, setSelectedListId] = useState('');
  const { data: list } = useGetListQuery(selectedListId, { skip: !selectedListId });
  const [enrollContact, { isLoading: enrolling }] = useEnrollContactMutation();
  const { data: costs } = useGetCreditCostsQuery();
  const [feedback, setFeedback] = useState(null);

  const contactLists = (lists ?? []).filter((l) => l.type === 'CONTACTS');

  async function handleEnrollList() {
    if (!list) return;
    setFeedback(null);
    let enrolled = 0;
    let skipped = 0;
    let outOfCredits = false;
    for (const item of list.items) {
      try {
        await enrollContact({ sequenceId, contactId: item.contactId }).unwrap();
        enrolled++;
      } catch (err) {
        if (err.status === 402) {
          // The balance won't recover mid-loop — every remaining contact
          // would fail the same way, so stop instead of burning requests.
          outOfCredits = true;
          break;
        }
        skipped++; // already enrolled, or no email on file — not fatal to the batch
      }
    }
    const parts = [`Enrolled ${enrolled} contact${enrolled === 1 ? '' : 's'}`];
    if (skipped) parts.push(`${skipped} skipped`);
    if (outOfCredits) parts.push('stopped — out of credits');
    setFeedback(`${parts.join(', ')}.`);
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-elevated p-4">
      <span className="text-sm font-medium text-text">Enroll from a list</span>
      <select
        value={selectedListId}
        onChange={(e) => setSelectedListId(e.target.value)}
        className="h-9 rounded-md border border-border bg-surface-elevated px-2.5 text-sm text-text outline-none focus:border-focus"
      >
        <option value="">Choose a list…</option>
        {contactLists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} ({l._count?.items ?? 0})
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!selectedListId || enrolling}
        onClick={handleEnrollList}
        title={costs ? `Spends ${costs.SEQUENCE_ENROLLMENT} credits per contact` : undefined}
        className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {enrolling ? 'Enrolling…' : 'Enroll all'}
      </button>
      {feedback && <span className="text-xs text-text-muted">{feedback}</span>}
    </div>
  );
}

function EnrollmentRow({ sequenceId, enrollment }) {
  const [pause] = usePauseEnrollmentMutation();
  const [resume] = useResumeEnrollmentMutation();
  const [unenroll] = useUnenrollContactMutation();

  return (
    <tr className="border-b border-border hover:bg-surface">
      <td className="px-4 py-3 text-sm">
        <p className="font-medium text-text">
          {enrollment.contact.firstName} {enrollment.contact.lastName}
        </p>
        <p className="text-xs text-text-muted">{enrollment.contact.company?.name ?? '—'}</p>
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${ENROLLMENT_STATUS_STYLES[enrollment.status]}`}
        >
          {enrollment.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-text-muted">{enrollment.currentStepIndex + 1}</td>
      <td className="px-4 py-3 text-right">
        {enrollment.status === 'ACTIVE' && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => pause({ sequenceId, enrollmentId: enrollment.id })}
              className="text-xs font-medium text-text-muted hover:text-primary"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={() => unenroll({ sequenceId, enrollmentId: enrollment.id })}
              className="text-xs font-medium text-text-muted hover:text-red-600"
            >
              Unenroll
            </button>
          </div>
        )}
        {enrollment.status === 'PAUSED' && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => resume({ sequenceId, enrollmentId: enrollment.id })}
              className="text-xs font-medium text-text-muted hover:text-primary"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => unenroll({ sequenceId, enrollmentId: enrollment.id })}
              className="text-xs font-medium text-text-muted hover:text-red-600"
            >
              Unenroll
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
