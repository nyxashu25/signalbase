import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateSequenceMutation } from '../api/sequencesApi.js';

let stepKeySeq = 0;
function withKey(step) {
  return { ...step, _key: stepKeySeq++ };
}

export function SequenceBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([
    withKey({ type: 'EMAIL', subject: '', body: '' }),
  ]);
  const [error, setError] = useState(null);
  const [createSequence, { isLoading }] = useCreateSequenceMutation();

  function addStep(type) {
    setSteps((s) => [
      ...s,
      withKey(type === 'EMAIL' ? { type: 'EMAIL', subject: '', body: '' } : { type: 'WAIT', waitDays: 3 }),
    ]);
  }

  function updateStep(key, patch) {
    setSteps((s) => s.map((step) => (step._key === key ? { ...step, ...patch } : step)));
  }

  function removeStep(key) {
    setSteps((s) => s.filter((step) => step._key !== key));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Give the sequence a name.');
    if (steps.length === 0) return setError('Add at least one step.');
    for (const step of steps) {
      if (step.type === 'EMAIL' && (!step.subject.trim() || !step.body.trim())) {
        return setError('Every email step needs a subject and body.');
      }
      if (step.type === 'WAIT' && (!step.waitDays || step.waitDays < 1)) {
        return setError('Every wait step needs a positive number of days.');
      }
    }

    try {
      const payload = {
        name: name.trim(),
        steps: steps.map(({ _key, ...step }) => step),
      };
      const result = await createSequence(payload).unwrap();
      navigate(`/app/sequences/${result.sequence.id}`, { replace: true });
    } catch (err) {
      setError(err.data?.error?.message || 'Could not create sequence');
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to="/app/sequences" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to sequences
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-text">New sequence</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Sequence name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 outbound — Marketing leaders"
            className="h-10 rounded-md border border-border bg-surface-elevated px-3 text-sm text-text outline-none focus:border-focus"
          />
        </label>

        <div className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={step._key} className="rounded-lg border border-border bg-surface-elevated p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-primary">
                  Step {i + 1} &middot; {step.type === 'EMAIL' ? 'Email' : 'Wait'}
                </span>
                <button
                  type="button"
                  onClick={() => removeStep(step._key)}
                  className="text-xs font-medium text-text-muted hover:text-red-600"
                >
                  Remove
                </button>
              </div>

              {step.type === 'EMAIL' ? (
                <div className="mt-3 flex flex-col gap-2.5">
                  <input
                    type="text"
                    value={step.subject}
                    onChange={(e) => updateStep(step._key, { subject: e.target.value })}
                    placeholder="Subject"
                    className="h-9 rounded-md border border-border bg-surface-elevated px-3 text-sm text-text outline-none focus:border-focus"
                  />
                  <textarea
                    value={step.body}
                    onChange={(e) => updateStep(step._key, { body: e.target.value })}
                    placeholder="Email body"
                    rows={3}
                    className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-focus"
                  />
                </div>
              ) : (
                <label className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                  Wait
                  <input
                    type="number"
                    min={1}
                    value={step.waitDays}
                    onChange={(e) => updateStep(step._key, { waitDays: Number(e.target.value) })}
                    className="h-9 w-20 rounded-md border border-border bg-surface-elevated px-2 text-sm text-text outline-none focus:border-focus"
                  />
                  days before the next step
                </label>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addStep('EMAIL')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:border-primary/40 hover:text-primary"
          >
            + Email step
          </button>
          <button
            type="button"
            onClick={() => addStep('WAIT')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:border-primary/40 hover:text-primary"
          >
            + Wait step
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-fit rounded-md bg-gradient-action px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:opacity-50"
        >
          {isLoading ? 'Creating…' : 'Create sequence'}
        </button>
      </form>
    </div>
  );
}
