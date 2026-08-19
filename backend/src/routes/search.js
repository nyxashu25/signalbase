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
import { reserveCredits, releaseOnError } from '../middleware/reserveCredits.js';
import { reserveCompanyViewCredits } from '../middleware/reserveCompanyViewCredits.js';
import { CREDIT_COSTS } from '../config/creditPricing.js';
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
  reserveCredits(CREDIT_COSTS.CSV_EXPORT),
  asyncHandler(searchController.exportCompaniesCsv),
  releaseOnError,
);
searchRouter.get(
  '/companies/:id',
  reserveCompanyViewCredits(CREDIT_COSTS.COMPANY_DETAIL_VIEW),
  asyncHandler(searchController.companyDetail),
  releaseOnError,
);
searchRouter.get(
  '/people',
  validateQuery(searchPeopleQuerySchema),
  asyncHandler(searchController.people),
);
searchRouter.get(
  '/people/export',
  exportLimiter,
  validateQuery(exportPeopleQuerySchema),
  reserveCredits(CREDIT_COSTS.CSV_EXPORT),
  asyncHandler(searchController.exportPeopleCsv),
  releaseOnError,
);
