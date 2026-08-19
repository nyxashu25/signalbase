import { Router } from 'express';
import * as searchController from '../controllers/searchController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import {
  searchCompaniesQuerySchema,
  searchPeopleQuerySchema,
  exportCompaniesQuerySchema,
  exportPeopleQuerySchema,
} from '../validators/searchValidators.js';
import { rateLimit, byWorkspace } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const searchRouter = Router();

searchRouter.use(requireAuth);

// Exports run an unpaginated (up to 5000-row) ES query — worth capping
// independently of ordinary search traffic.
const exportLimiter = rateLimit({
  limit: 10,
  windowSeconds: 60,
  prefix: 'export',
  keyFn: byWorkspace,
});

searchRouter.get(
  '/companies',
  validateQuery(searchCompaniesQuerySchema),
  asyncHandler(searchController.companies),
);
// Must precede /companies/:id — otherwise "export" is captured as :id.
searchRouter.get(
  '/companies/export',
  exportLimiter,
  validateQuery(exportCompaniesQuerySchema),
  asyncHandler(searchController.exportCompaniesCsv),
);
searchRouter.get('/companies/:id', asyncHandler(searchController.companyDetail));
searchRouter.get(
  '/people',
  validateQuery(searchPeopleQuerySchema),
  asyncHandler(searchController.people),
);
searchRouter.get(
  '/people/export',
  exportLimiter,
  validateQuery(exportPeopleQuerySchema),
  asyncHandler(searchController.exportPeopleCsv),
);
