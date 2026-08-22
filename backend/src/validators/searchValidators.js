import { z } from 'zod';

const stringArray = z.preprocess(
  (val) => (val === undefined ? [] : Array.isArray(val) ? val : [val]),
  z.array(z.string()),
);

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
};

// Headcount buckets — the same keys drive the ES range filter, the range
// aggregation that powers the facet counts, and the filter rail's labels,
// so they live in one place (see HEADCOUNT_BUCKETS in searchService.js).
export const HEADCOUNT_KEYS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001+'];

export const EMAIL_STATUS_KEYS = ['verified', 'unverified', 'not_found'];

export const COMPANY_SORTS = ['relevance', 'name_asc', 'name_desc', 'headcount_desc', 'newest'];
export const PEOPLE_SORTS = ['relevance', 'name_asc', 'name_desc', 'newest'];

export const searchCompaniesQuerySchema = z.object({
  q: z.string().trim().optional(),
  industry: stringArray,
  location: stringArray,
  techStack: stringArray,
  headcount: z.preprocess(
    (val) => (val === undefined ? [] : Array.isArray(val) ? val : [val]),
    z.array(z.enum(HEADCOUNT_KEYS)),
  ),
  sort: z.enum(COMPANY_SORTS).default('relevance'),
  ...pagination,
});

export const searchPeopleQuerySchema = z.object({
  q: z.string().trim().optional(),
  // Free-text "contains" filters, separate from q so a title filter can be
  // combined with a name search rather than competing with it.
  title: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  seniority: stringArray,
  department: stringArray,
  industry: stringArray,
  location: stringArray,
  emailStatus: z.preprocess(
    (val) => (val === undefined ? [] : Array.isArray(val) ? val : [val]),
    z.array(z.enum(EMAIL_STATUS_KEYS)),
  ),
  sort: z.enum(PEOPLE_SORTS).default('relevance'),
  ...pagination,
});

// Export takes the same filters as search but no pagination — it always
// exports the full (capped) matching set in one shot.
export const exportCompaniesQuerySchema = searchCompaniesQuerySchema.omit({
  page: true,
  pageSize: true,
});
export const exportPeopleQuerySchema = searchPeopleQuerySchema.omit({ page: true, pageSize: true });

// Saved searches: the filter object is stored verbatim (it's whatever the
// frontend would put on the query string) and replayed client-side — the
// backend never interprets it beyond size/shape sanity.
export const savedSearchTypeSchema = z.enum(['PEOPLE', 'COMPANIES']);

export const listSavedSearchesQuerySchema = z.object({
  type: savedSearchTypeSchema.optional(),
});

export const createSavedSearchSchema = z.object({
  type: savedSearchTypeSchema,
  name: z.string().trim().min(1).max(80),
  filters: z.record(z.unknown()).refine((f) => JSON.stringify(f).length <= 4000, {
    message: 'Filters are too large to save',
  }),
});
