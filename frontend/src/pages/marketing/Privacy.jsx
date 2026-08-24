import { useState } from 'react';
import { usePrivacyOptOutMutation } from '../../api/privacyApi.js';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { LegalDoc, LegalSection } from '../../components/marketing/LegalDoc.jsx';

export function Privacy() {
  return (
    <div className="min-h-screen bg-bg">
      <MarketingNav />
      <LegalDoc title="Privacy Policy" updated="August 19, 2026">
        <LegalSection title="1. What we collect">
          <p>
            When you create a workspace, we collect your name, email address, and a hashed copy of
            your password — never the password itself. When you use search and reveal, we record
            which contacts your workspace has revealed and when, so we can enforce workspace-wide
            reveal sharing and bill credits accurately.
          </p>
        </LegalSection>
        <LegalSection title="2. How we use it">
          <p>
            Account data is used to authenticate you, run the credit ledger, and operate the product
            features you've enrolled in — search, reveal, lists, and sequences. We do not sell your
            workspace's data to third parties.
          </p>
        </LegalSection>
        <LegalSection title="3. Contact and company data">
          <p>
            The contact and company records searchable in DataPit are sourced and enriched
            independently of any one workspace — they are not private to you. A data subject can
            request removal of their information at any time; once processed, that record is
            permanently excluded from search and reveal for every workspace, not just the one that
            requested it.
          </p>
        </LegalSection>
        <LegalSection title="4. Data retention">
          <p>
            Account and billing records are retained for as long as your workspace is active, and
            for a reasonable period afterward to satisfy legal and accounting obligations. You can
            request deletion of your account data at any time.
          </p>
        </LegalSection>
        <LegalSection title="5. Security">
          <p>
            Passwords are hashed with argon2id. Access tokens are short-lived; refresh sessions are
            stored server-side and rotated on every use, so a stolen token has a narrow window of
            use. Credit balances move through an atomic, auditable ledger.
          </p>
        </LegalSection>
        <LegalSection title="6. Your rights">
          <p>
            Depending on where you're located, you may have rights to access, correct, export, or
            delete your personal data. For your DataPit account, contact us and we'll act on a
            verified request. If your details appear as a <em>contact record</em> in our database,
            use the form below — no account needed.
          </p>
        </LegalSection>
        <LegalSection title="7. Remove my data (GDPR/CCPA opt-out)">
          <p>
            Enter the email address that appears in our contact database. We immediately redact any
            matching records for every workspace and permanently block that address from future
            reveals — this cannot be undone.
          </p>
          <OptOutForm />
        </LegalSection>
      </LegalDoc>
      <MarketingFooter />
    </div>
  );
}

function OptOutForm() {
  const [form, setForm] = useState({ email: '', reason: '' });
  const [optOut, { isLoading, isSuccess, error }] = usePrivacyOptOutMutation();

  async function handleSubmit(e) {
    e.preventDefault();
    await optOut({ email: form.email, ...(form.reason ? { reason: form.reason } : {}) });
  }

  if (isSuccess) {
    return (
      <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
        Done — any records matching <strong>{form.email}</strong> have been redacted and the address
        is permanently excluded from future reveals.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Your email address
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="you@company.com"
          className="h-[46px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Reason (optional)
        <input
          type="text"
          maxLength={500}
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          className="h-[46px] rounded-md border border-border bg-surface-elevated px-3.5 text-sm text-text outline-none focus:border-focus focus:shadow-[0_0_0_3px_rgba(197,82,255,0.18)]"
        />
      </label>
      {error && (
        <p className="text-sm text-red-600">
          {error.status === 429
            ? 'Too many requests from this connection — please try again in an hour.'
            : error.data?.error?.message || 'Something went wrong. Please try again.'}
        </p>
      )}
      <button
        type="submit"
        disabled={isLoading || !form.email}
        className="self-start rounded-md bg-gradient-action px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Submitting…' : 'Remove my data'}
      </button>
    </form>
  );
}
