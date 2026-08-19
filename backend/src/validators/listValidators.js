import { z } from 'zod';

export const createListSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['CONTACTS', 'COMPANIES']),
});

export const addListItemSchema = z
  .object({
    contactId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
  })
  .refine((v) => Boolean(v.contactId) !== Boolean(v.companyId), {
    message: 'Provide exactly one of contactId or companyId',
  });
