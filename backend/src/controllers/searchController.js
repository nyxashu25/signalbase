import * as searchService from '../services/searchService.js';

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
}

export async function companyDetail(req, res) {
  const company = await searchService.getCompanyDetail(req.auth.workspaceId, req.params.id);
  res.json({ company });
}
