import { z } from 'zod';

const stringArray = z.preprocess(
  (val) => (val === undefined ? [] : Array.isArray(val) ? val : [val]),
  z.array(z.string()),
);

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
};

export const searchCompaniesQuerySchema = z.object({
  q: z.string().trim().optional(),
  industry: stringArray,
  location: stringArray,
  techStack: stringArray,
  ...pagination,
});

export const searchPeopleQuerySchema = z.object({
  q: z.string().trim().optional(),
  seniority: stringArray,
  department: stringArray,
  industry: stringArray,
  location: stringArray,
  ...pagination,
});
