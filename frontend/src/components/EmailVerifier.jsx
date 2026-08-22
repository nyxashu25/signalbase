import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { useVerifyEmailMutation } from '../api/toolsApi.js';
import { Card } from './ui/Card.jsx';
import { Button } from './ui/Button.jsx';
import { StatusPill } from './ui/StatusPill.jsx';
import { Banner } from './ui/Banner.jsx';

const RESULT_TONE = { deliverable: 'success', undeliverable: 'danger', unknown: 'warning' };

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
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <MailCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-bold text-text">Email verifier</p>
      </div>
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
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-3 text-sm text-text outline-none focus:border-focus focus:ring-2 focus:ring-focus/25"
        />
        <Button type="submit" variant="primary" loading={isLoading} disabled={!email.trim()}>
          {isLoading ? 'Checking…' : 'Verify'}
        </Button>
      </form>
      {error && (
        <Banner tone="danger" className="mt-3">
          {error.data?.error?.message || 'Could not check that email. Please try again.'}
        </Banner>
      )}
      {result && (
        <div className="mt-3 flex items-center gap-2">
          <StatusPill tone={RESULT_TONE[resultKind(result)]} dot>
            {resultLabel(result)}
          </StatusPill>
          <span className="truncate text-xs text-text-muted">{result.email}</span>
        </div>
      )}
    </Card>
  );
}
