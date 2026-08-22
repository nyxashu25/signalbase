import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, MailOpen, ListChecks, Send, Coins, LifeBuoy, Building2, KeyRound } from 'lucide-react';
import { useGetCreditCostsQuery } from '../api/billingApi.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { cn } from '../components/ui/cn.js';

// In-app guide (docs/UX-ROADMAP.md §3.4 "Read the docs"). Every statement
// here describes something that exists — it's the user-facing digest of
// docs/FEATURES.md, not a roadmap. Credit prices come from the API so this
// page can't drift from what's actually charged.
const SECTIONS = [
  { id: 'search', label: 'Searching', icon: Search },
  { id: 'reveal', label: 'Revealing emails', icon: MailOpen },
  { id: 'lists', label: 'Lists & saved searches', icon: ListChecks },
  { id: 'companies', label: 'Company profiles', icon: Building2 },
  { id: 'sequences', label: 'Sequences', icon: Send },
  { id: 'credits', label: 'How credits work', icon: Coins },
  { id: 'account', label: 'Account & sign-in', icon: KeyRound },
  { id: 'support', label: 'Getting help', icon: LifeBuoy },
];

export function Help() {
  const { hash } = useLocation();
  const { data: costs } = useGetCreditCostsQuery();

  // Deep links like /app/help#credits land on the section.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const reveal = costs?.REVEAL ?? 2;
  const companyView = costs?.COMPANY_DETAIL_VIEW ?? 20;
  const csvExport = costs?.CSV_EXPORT ?? 20;
  const enrollment = costs?.SEQUENCE_ENROLLMENT ?? 250;

  return (
    <div>
      <PageHeader
        title="Help & guide"
        description="How DataPit works, in the order you’ll use it. Everything on this page is live in your workspace today."
        actions={
          <Button variant="secondary" icon={LifeBuoy} to="/app/tickets/new">
            Raise a ticket
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-4 lg:self-start">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover hover:text-text',
                    hash === `#${id}` && 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex max-w-3xl flex-col gap-4">
          <Section id="search" title="Searching" icon={Search}>
            <p>
              <strong>People</strong> and <strong>Companies</strong> search the same shared database. Use the filter
              rail on the left — job title and company name match on “contains”, the rest are checkboxes with live
              counts. Chips above the results show what’s applied; <em>Clear all</em> resets everything.
            </p>
            <ul>
              <li>Sort from the toolbar; change visible columns with <em>Columns</em>.</li>
              <li>Tick rows to act on many at once: add them to a list or reveal every email in one go.</li>
              <li>
                Press <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> anywhere to jump to a page or search people, companies, lists
                and sequences by name.
              </li>
            </ul>
          </Section>

          <Section id="reveal" title="Revealing emails" icon={MailOpen}>
            <p>
              Email addresses are masked until you click <strong>Access email</strong>. A reveal costs{' '}
              <strong>{reveal} credits</strong>, is charged once per contact per workspace, and is shared with everyone
              in your workspace — revealing the same contact again is free. Where we’ve been able to verify the
              address you’ll see a <em>Verified</em> badge; otherwise it’s our best pattern match for that company.
            </p>
            <p>
              The <strong>Tools</strong> tab on Home has a standalone verifier for checking any address you already
              have — no credits, no contact record.
            </p>
          </Section>

          <Section id="lists" title="Lists & saved searches" icon={ListChecks}>
            <p>
              A <strong>list</strong> is a named set of people or companies. Add from any search row, or select many
              and use the bulk bar. Open a list to remove items or export it as CSV (<strong>{csvExport} credits</strong>{' '}
              per export).
            </p>
            <p>
              A <strong>saved search</strong> stores the current filter set so you can rerun it in one click from
              the toolbar’s <em>Saved searches</em> menu. Both are shared across your workspace.
            </p>
          </Section>

          <Section id="companies" title="Company profiles" icon={Building2}>
            <p>
              Opening a company from search shows its profile — industry, size, location, tech stack — and every
              contact we have there. The first view costs <strong>{companyView} credits</strong>; after that it’s
              free for your whole workspace.
            </p>
          </Section>

          <Section id="sequences" title="Sequences" icon={Send}>
            <p>
              A sequence is a series of <em>email</em> and <em>wait</em> steps. Build it, activate it, then enroll
              revealed contacts — each enrollment costs <strong>{enrollment} credits</strong> and the first step sends
              on schedule. Pause or unenroll anyone from the sequence page; per-step opens, clicks, replies and
              bounces show in its analytics.
            </p>
            <p>
              Sequences are available on <strong>Basic and up</strong>. Anyone who unsubscribes or bounces is
              automatically suppressed from future sends in your workspace.
            </p>
          </Section>

          <Section id="credits" title="How credits work" icon={Coins}>
            <p>
              Credits are your workspace’s single currency. Each plan grants a fixed number every month; buy more
              any time from <em>Billing → Add credits</em>. Every movement — grants, spends, purchases, rewards — is
              one line on the Billing ledger.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Credits</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Reveal an email</td>
                  <td>{reveal}</td>
                </tr>
                <tr>
                  <td>Open a company profile (first time)</td>
                  <td>{companyView}</td>
                </tr>
                <tr>
                  <td>Export a CSV</td>
                  <td>{csvExport}</td>
                </tr>
                <tr>
                  <td>Enroll a contact in a sequence</td>
                  <td>{enrollment}</td>
                </tr>
                <tr>
                  <td>Searching, filtering, lists, saved searches, the email verifier</td>
                  <td>Free</td>
                </tr>
              </tbody>
            </table>
            <p>
              The <strong>Getting started</strong> checklist on Home pays out up to 75 bonus credits for trying the
              product — they land on the same ledger as <em>Onboarding reward</em>.
            </p>
          </Section>

          <Section id="account" title="Account & sign-in" icon={KeyRound}>
            <p>
              Sign in with your email and password or with Google. New email accounts must confirm their address
              via the link we send before they can sign in — if it hasn’t arrived, use <em>Resend verification</em>{' '}
              on the sign-in page. Your profile shows your role, plan and credit position.
            </p>
          </Section>

          <Section id="support" title="Getting help" icon={LifeBuoy}>
            <p>
              Raise a <strong>support</strong> or <strong>sales</strong> ticket from <em>Tickets → New ticket</em>.
              You’ll get an email when we reply, and the Tickets link in the sidebar shows a count while a reply is
              waiting for you.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, icon: Icon, children }) {
  return (
    <Card id={id} className="scroll-mt-4 p-5" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="flex items-center gap-2 text-base font-bold text-text">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <div className="help-prose mt-3 text-sm text-text-muted">{children}</div>
    </Card>
  );
}
