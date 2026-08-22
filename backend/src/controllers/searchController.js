import * as searchService from '../services/searchService.js';
import * as savedSearchService from '../services/savedSearchService.js';
import * as onboardingService from '../services/onboardingService.js';
import { toCsv } from '../utils/csv.js';
import { resolveReservationForCommit } from '../services/creditService.js';
import { prisma } from '../config/db.js';

export async function companies(req, res) {
  const result = await searchService.searchCompanies(req.validatedQuery);
  res.json(result);
}

export async function people(req, res) {
  const result = await searchService.searchPeople({
    ...req.validatedQuery,
    workspaceId: req.auth.workspaceId,
  });
  res.json(result);
  // After the response — a search leaves no data trail of its own, so the
  // getting-started checklist learns about it here. Never throws.
  await onboardingService.recordEvent(req.auth.workspaceId, 'SEARCH_PEOPLE');
}

export async function companyDetail(req, res) {
  const company = await searchService.getCompanyDetail(
    req.auth.workspaceId,
    req.auth.userId,
    req.params.id,
    req.reservationId,
  );
  res.json({ company });
}

function sendCsv(res, filename, csv) {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

const COMPANY_COLUMNS = [
  { header: 'Name', value: (c) => c.name },
  { header: 'Domain', value: (c) => c.domain },
  { header: 'Industry', value: (c) => c.industry },
  { header: 'Headcount Min', value: (c) => c.headcountMin },
  { header: 'Headcount Max', value: (c) => c.headcountMax },
  { header: 'Location', value: (c) => c.location },
  { header: 'Tech Stack', value: (c) => (c.techStack ?? []).join('; ') },
  { header: 'LinkedIn', value: (c) => c.linkedinUrl },
];

const CONTACT_COLUMNS = [
  { header: 'First Name', value: (c) => c.firstName },
  { header: 'Last Name', value: (c) => c.lastName },
  { header: 'Title', value: (c) => c.title },
  { header: 'Company', value: (c) => c.company?.name },
  { header: 'Department', value: (c) => c.department },
  { header: 'Email', value: (c) => c.email },
  { header: 'Email Status', value: (c) => (c.revealed ? 'Revealed' : c.email ? 'Masked' : 'Not found') },
];

// Charged only after the export data is actually produced — a failed ES
// query never touches the reservation (releaseOnError refunds it).
async function chargeCsvExport(req) {
  const { amount } = await resolveReservationForCommit(req.reservationId, {
    workspaceId: req.auth.workspaceId,
  });
  await prisma.creditLedgerEntry.create({
    data: { workspaceId: req.auth.workspaceId, delta: -amount, reason: 'CSV_EXPORT' },
  });
}

export async function exportCompaniesCsv(req, res) {
  const results = await searchService.exportCompanies(req.validatedQuery);
  await chargeCsvExport(req);
  sendCsv(res, 'datapit-companies.csv', toCsv(results, COMPANY_COLUMNS));
}

export async function exportPeopleCsv(req, res) {
  const results = await searchService.exportPeople({
    ...req.validatedQuery,
    workspaceId: req.auth.workspaceId,
  });
  await chargeCsvExport(req);
  sendCsv(res, 'datapit-people.csv', toCsv(results, CONTACT_COLUMNS));
}

export async function listSavedSearches(req, res) {
  const results = await savedSearchService.listSavedSearches(
    req.auth.workspaceId,
    req.validatedQuery,
  );
  res.json({ savedSearches: results });
}

export async function createSavedSearch(req, res) {
  const savedSearch = await savedSearchService.createSavedSearch(
    req.auth.workspaceId,
    req.auth.userId,
    req.body,
  );
  res.status(201).json({ savedSearch });
}

export async function deleteSavedSearch(req, res) {
  await savedSearchService.deleteSavedSearch(req.auth.workspaceId, req.params.id);
  res.status(204).end();
}

export { sendCsv, COMPANY_COLUMNS, CONTACT_COLUMNS };
