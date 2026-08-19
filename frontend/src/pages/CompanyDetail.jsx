import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { searchApi, useGetCompanyDetailQuery } from '../api/searchApi.js';
import { useRevealContactMutation } from '../api/contactsApi.js';
import { useGetCreditCostsQuery } from '../api/billingApi.js';
import { AddToListButton } from '../components/AddToListButton.jsx';

function headcountLabel(min, max) {
  if (!min && !max) return null;
  if (min && max) return `${min}–${max} employees`;
  return `${min ?? max}+ employees`;
}

export function CompanyDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { data: company, isLoading, isError, error } = useGetCompanyDetailQuery(id);
  const [revealContact] = useRevealContactMutation();
  const { data: costs } = useGetCreditCostsQuery();

  async function handleReveal(contactId) {
    const result = await revealContact({ contactId, idempotencyKey: crypto.randomUUID() }).unwrap();

    dispatch(
      searchApi.util.updateQueryData('getCompanyDetail', id, (draft) => {
        const contact = draft.contacts.find((c) => c.id === contactId);
        if (contact) {
          contact.email = result.email;
          contact.emailVerified = result.emailVerified;
          contact.revealed = true;
        }
      }),
    );
  }

  if (isError) {
    if (error?.status === 402) {
      return (
        <p className="text-sm text-red-600">
          Not enough credits to view this company —{' '}
          <Link to="/app/billing/add-credits" className="underline">
            add more credits
          </Link>{' '}
          to continue.
        </p>
      );
    }
    return <p className="text-sm text-red-600">Company not found.</p>;
  }
  if (isLoading || !company) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  const headcount = headcountLabel(company.headcountMin, company.headcountMax);

  return (
    <div className="max-w-4xl">
      <Link to="/app/companies" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to companies
      </Link>

      {company.viewCost > 0 && (
        <p className="mt-2 text-xs text-text-muted">
          Viewing this profile used {company.viewCost} credits — revisiting it later is free.
        </p>
      )}

      <div className="mt-3 flex items-start justify-between gap-4 rounded-lg border border-border bg-surface-elevated p-5">
        <div>
          <h1 className="text-xl font-semibold text-text">{company.name}</h1>
          <a
            href={`https://${company.domain}`}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block text-sm text-primary hover:underline"
          >
            {company.domain}
          </a>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
            {company.industry && <span>{company.industry}</span>}
            {company.location && <span>{company.location}</span>}
            {headcount && <span>{headcount}</span>}
            {company.linkedinUrl && (
              <a href={company.linkedinUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                LinkedIn
              </a>
            )}
          </div>

          {company.techStack?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {company.techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-text-muted"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>

        <AddToListButton type="COMPANIES" companyId={company.id} />
      </div>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-text-muted">
        Contacts &middot; {company.contacts.length}
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {company.contacts.map((contact) => (
              <ContactDetailRow
                key={contact.id}
                contact={contact}
                onReveal={handleReveal}
                revealCost={costs?.REVEAL}
              />
            ))}
            {company.contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                  No contacts on file for this company yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactDetailRow({ contact, onReveal, revealCost }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  async function handleReveal() {
    setStatus('revealing');
    setError(null);
    try {
      await onReveal(contact.id);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Reveal failed');
    }
  }

  return (
    <tr className="border-b border-border hover:bg-surface">
      <td className="px-4 py-3 text-sm font-medium text-text">
        {contact.firstName} {contact.lastName}
      </td>
      <td className="px-4 py-3 text-sm text-text-muted">{contact.title ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-text-muted">{contact.department ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        {contact.revealed ? (
          <span className="text-text">{contact.email}</span>
        ) : contact.email ? (
          <span className="font-mono text-text-muted">{contact.email}</span>
        ) : (
          <span className="text-ink-300">Not found yet</span>
        )}
        {status === 'error' && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {!contact.revealed && (
            <button
              type="button"
              onClick={handleReveal}
              disabled={status === 'revealing'}
              title={`Spends ${revealCost ?? '…'} credits — finds and unlocks this contact's email`}
              className="rounded-md border border-border px-2 py-1 text-xs text-text-muted hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'revealing' ? 'Revealing…' : 'Reveal'}
            </button>
          )}
          <AddToListButton type="CONTACTS" contactId={contact.id} />
        </div>
      </td>
    </tr>
  );
}
