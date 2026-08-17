import { Router } from 'express';
import * as searchController from '../controllers/searchController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import {
  searchCompaniesQuerySchema,
  searchPeopleQuerySchema,
} from '../validators/searchValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const searchRouter = Router();

searchRouter.use(requireAuth);

searchRouter.get(
  '/companies',
  validateQuery(searchCompaniesQuerySchema),
  asyncHandler(searchController.companies),
);
searchRouter.get(
  '/people',
  validateQuery(searchPeopleQuerySchema),
  asyncHandler(searchController.people),
);
