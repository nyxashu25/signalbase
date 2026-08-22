import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { Globe, MapPin, Users, Briefcase } from 'lucide-react';
import { LinkedInIcon } from '../components/LinkedInIcon.jsx';
import { searchApi, useGetCompanyDetailQuery } from '../api/searchApi.js';
import { useRevealContactMutation } from '../api/contactsApi.js';
import { AddToListButton } from '../components/AddToListButton.jsx';
import { ContactRow } from '../components/ContactRow.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Card, TableFrame, thClass } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton, SkeletonRows } from '../components/ui/Skeleton.jsx';
import { LetterAvatar } from '../components/ui/LetterAvatar.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';

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

  async function handleReveal(contactId) {
    const result = await revealContact({ contactId, idempotencyKey: crypto.randomUUID() }).unwrap();

    dispatch(
      searchApi.util.updateQueryData('getCompanyDetail', id, (draft) => {
        const contact = draft.contacts.find((c) => c.id === contactId);
        if (contact) {
          contact.email = result.email;
          contact.emailVerified = result.emailVerified;
          contact.phone = result.phone ?? contact.phone;
          contact.revealed = true;
        }
      }),
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl">
        <PageHeader backTo="/app/companies" backLabel="Companies" title="Company" />
        {error?.status === 402 ? (
          <Banner tone="warning" title="Not enough credits to view this company" action="Add credits" actionTo="/app/billing/add-credits">
            Viewing a company profile for the first time costs credits; repeat views are free.
          </Banner>
        ) : (
          <Banner tone="danger" title="Company not found">
            It may have been removed, or the link is out of date.
          </Banner>
        )}
      </div>
    );
  }

  if (isLoading || !company) {
    return (
      <div className="max-w-5xl">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-72" />
        <Card className="mt-5 p-5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </Card>
        <TableFrame className="mt-6">
          <table className="w-full">
            <tbody>
              <SkeletonRows rows={5} columns={5} />
            </tbody>
          </table>
        </TableFrame>
      </div>
    );
  }

  const headcount = headcountLabel(company.headcountMin, company.headcountMax);

  return (
    <div className="max-w-5xl">
      <PageHeader
        backTo="/app/companies"
        backLabel="Companies"
        title={
          <span className="flex items-center gap-3">
            <LetterAvatar name={company.name} size="lg" square />
            {company.name}
          </span>
        }
        actions={<AddToListButton type="COMPANIES" companyId={company.id} />}
      />

      {company.viewCost > 0 && (
        <Banner tone="info" className="mb-4" dismissible>
          Viewing this profile used {company.viewCost} credits — revisiting it later is free.
        </Banner>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
          <a
            href={`https://${company.domain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <Globe className="h-4 w-4" aria-hidden="true" />
            {company.domain}
          </a>
          {company.linkedinUrl && (
            <a
              href={company.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <LinkedInIcon className="h-4 w-4" />
              LinkedIn
            </a>
          )}
          {company.industry && (
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              {company.industry}
            </span>
          )}
          {company.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {company.location}
            </span>
          )}
          {headcount && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden="true" />
              {headcount}
            </span>
          )}
        </div>

        {company.techStack?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {company.techStack.map((tech) => (
              <StatusPill key={tech}>{tech}</StatusPill>
            ))}
          </div>
        )}
      </Card>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">
          Contacts <span className="font-medium text-text-muted">· {company.contacts.length}</span>
        </h2>
      </div>
      <TableFrame>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Title</th>
              <th className={thClass}>
                <span className="sr-only">LinkedIn</span>
              </th>
              <th className={thClass}>Company</th>
              <th className={thClass}>Department</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Phone</th>
              <th className={thClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {company.contacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={{ ...contact, company: { id: company.id, name: company.name } }}
                onReveal={handleReveal}
              />
            ))}
            {company.contacts.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState compact icon={Users} title="No contacts on file yet">
                    We don&rsquo;t have people for this company in the database yet.
                  </EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableFrame>
      <div className="mt-3">
        <Button variant="ghost" size="sm" to="/app/companies">
          Back to companies
        </Button>
      </div>
    </div>
  );
}
