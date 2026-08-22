import { useState } from 'react';
import { Mail, Copy, Check, BadgeCheck, Phone } from 'lucide-react';
import { AddToListButton } from './AddToListButton.jsx';
import { LinkedInIcon } from './LinkedInIcon.jsx';
import { useGetCreditCostsQuery } from '../api/billingApi.js';
import { Button } from './ui/Button.jsx';
import { LetterAvatar } from './ui/LetterAvatar.jsx';
import { Tooltip } from './ui/Tooltip.jsx';
import { tdClass, tdMutedClass, trClass } from './ui/Card.jsx';

export const CONTACT_COLUMNS = [
  { key: 'name', label: 'Name', locked: true },
  { key: 'title', label: 'Job title' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'company', label: 'Company' },
  { key: 'department', label: 'Department' },
  { key: 'email', label: 'Email', locked: true },
  { key: 'phone', label: 'Phone' },
];
const ALL_COLUMNS = CONTACT_COLUMNS.map((c) => c.key);

/**
 * One people-search result. The reveal is a real, iconed button with its
 * credit cost on it (docs/UX-ROADMAP.md §2.4) — the monetized action should
 * look like one. `selectable`/`selected`/`onSelectChange` add the bulk-select
 * checkbox used by the search table; the CompanyDetail contacts table
 * leaves them off. `columns` (keys from CONTACT_COLUMNS) drives the column
 * picker — the header in the page must render the same set. `trailingAction`
 * slots an extra control after the row's buttons (ListDetail's remove ×).
 */
export function ContactRow({
  contact,
  onReveal,
  selectable = false,
  selected = false,
  onSelectChange,
  columns = ALL_COLUMNS,
  trailingAction = null,
}) {
  const show = (key) => columns.includes(key);
  const [status, setStatus] = useState('idle'); // idle | revealing | error
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null); // 'email' | 'phone' | null
  const { data: costs } = useGetCreditCostsQuery();
  const fullName = `${contact.firstName} ${contact.lastName}`;

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

  async function copy(kind, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable — nothing to do, the value is visible anyway
    }
  }

  return (
    <tr className={`${trClass} ${selected ? 'bg-primary/5' : ''}`}>
      {selectable && (
        <td className="w-10 px-3 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange?.(contact.id, e.target.checked)}
            aria-label={`Select ${fullName}`}
            className="h-4 w-4 rounded-sm border-border text-primary focus:ring-focus"
          />
        </td>
      )}
      <td className={`${tdClass} py-2.5`}>
        <span className="flex items-center gap-2.5 whitespace-nowrap">
          <LetterAvatar name={fullName} size="md" />
          <span className="block max-w-[200px] truncate font-semibold" title={fullName}>
            {fullName}
          </span>
        </span>
      </td>
      {show('title') && (
        <td className={`${tdMutedClass} whitespace-nowrap`}>
          <span className="block max-w-[220px] truncate" title={contact.title ?? undefined}>
            {contact.title ?? '—'}
          </span>
        </td>
      )}
      {show('linkedin') && (
        <td className="px-3 py-3">
          {contact.linkedinUrl ? (
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${fullName}'s LinkedIn profile`}
              className="inline-flex transition-opacity hover:opacity-80"
            >
              <LinkedInIcon className="h-5 w-5" />
            </a>
          ) : (
            <span className="text-sm text-text-muted/50">—</span>
          )}
        </td>
      )}
      {show('company') && (
        <td className={`${tdMutedClass} whitespace-nowrap`}>
          {contact.company?.name ? (
            <span className="flex items-center gap-2">
              <LetterAvatar name={contact.company.name} size="sm" square />
              <span className="block max-w-[180px] truncate" title={contact.company.name}>
                {contact.company.name}
              </span>
            </span>
          ) : (
            '—'
          )}
        </td>
      )}
      {show('department') && (
        <td className={`${tdMutedClass} whitespace-nowrap`}>{contact.department ?? '—'}</td>
      )}
      <td className="whitespace-nowrap px-4 py-3 text-sm">
        {contact.revealed ? (
          <span className="flex items-center gap-1.5">
            <span className="text-text">{contact.email}</span>
            {contact.emailVerified && (
              <Tooltip content="Verified deliverable">
                <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Verified" />
              </Tooltip>
            )}
            <Tooltip content={copied === 'email' ? 'Copied' : 'Copy email'}>
              <button
                type="button"
                onClick={() => copy('email', contact.email)}
                aria-label="Copy email"
                className="rounded-sm p-0.5 text-text-muted hover:text-text"
              >
                {copied === 'email' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </Tooltip>
          </span>
        ) : contact.email ? (
          <span className="font-mono text-xs text-text-muted">{contact.email}</span>
        ) : (
          <span className="text-text-muted/70">Not found yet</span>
        )}
        {status === 'error' && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </td>
      {show('phone') && (
        <td className="whitespace-nowrap px-4 py-3 text-sm">
          {contact.revealed && contact.phone ? (
            <span className="flex items-center gap-1.5">
              <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="text-text hover:underline">
                {contact.phone}
              </a>
              <Tooltip content={copied === 'phone' ? 'Copied' : 'Copy phone'}>
                <button
                  type="button"
                  onClick={() => copy('phone', contact.phone)}
                  aria-label="Copy phone"
                  className="rounded-sm p-0.5 text-text-muted hover:text-text"
                >
                  {copied === 'phone' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              </Tooltip>
            </span>
          ) : !contact.revealed && contact.phone ? (
            <span className="font-mono text-xs text-text-muted" title="Revealed with the email">
              {contact.phone}
            </span>
          ) : (
            <span className="text-text-muted/50">—</span>
          )}
        </td>
      )}
      <td className="whitespace-nowrap px-4 py-2">
        <div className="flex items-center justify-end gap-2">
          {!contact.revealed && (
            <Tooltip
              content={`Spends ${costs?.REVEAL ?? '…'} credits — unlocks this contact's email${contact.phone ? ' and phone number' : ''}`}
            >
              <Button
                variant="primary"
                size="sm"
                icon={Mail}
                onClick={handleReveal}
                loading={status === 'revealing'}
              >
                {status === 'revealing' ? 'Revealing…' : 'Access email'}
                {costs?.REVEAL !== undefined && status !== 'revealing' && (
                  <span className="ml-0.5 rounded-sm bg-white/20 px-1 text-[10px] font-bold tabular-nums">
                    {costs.REVEAL} cr
                  </span>
                )}
              </Button>
            </Tooltip>
          )}
          <AddToListButton type="CONTACTS" contactId={contact.id} label="List" />
          {trailingAction}
        </div>
      </td>
    </tr>
  );
}
