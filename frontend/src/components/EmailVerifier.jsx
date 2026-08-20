import { useState } from 'react';
import { useVerifyEmailMutation } from '../api/toolsApi.js';

const RESULT_STYLES = {
  deliverable: 'bg-emerald-500/15 text-emerald-600',
  undeliverable: 'bg-red-500/15 text-red-600',
  unknown: 'bg-amber-500/15 text-amber-600',
};

function resultKind(result) {
  if (!result.checked) return 'unknown';
  return result.verified ? 'deliverable' : 'undeliverable';
}

function resultLabel(result) {
  if (!result.checked) return 'Could not verify — no provider configured';
  return result.verified ? 'Deliverable' : `Not deliverable (${result.reason})`;
}

export function EmailVerifier() {
  const [email, setEmail] = useState('');
  const [verifyEmail, { isLoading, error }] = useVerifyEmailMutation();
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setResult(null);
    try {
      const data = await verifyEmail(email.trim()).unwrap();
      setResult(data);
    } catch {
      // error state below already reflects the failure
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Email verifier</p>
      <p className="mt-1 text-xs text-text-muted">
        Check whether any email address is deliverable — free, not tied to a contact record.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          className="h-10 flex-1 rounded-md border border-border bg-surface-elevated px-3 text-sm text-text outline-none focus:border-focus"
        />
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="rounded-md bg-gradient-action px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Checking…' : 'Verify'}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-xs text-red-600">
          {error.data?.error?.message || 'Could not check that email. Please try again.'}
        </p>
      )}
      {result && (
        <div className="mt-3 flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${RESULT_STYLES[resultKind(result)]}`}
          >
            {resultLabel(result)}
          </span>
          <span className="truncate text-xs text-text-muted">{result.email}</span>
        </div>
      )}
    </div>
  );
}
