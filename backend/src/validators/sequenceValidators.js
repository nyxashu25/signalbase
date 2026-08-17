import { z } from 'zod';

const stepSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('EMAIL'), subject: z.string().min(1), body: z.string().min(1) }),
  z.object({ type: z.literal('WAIT'), waitDays: z.number().int().positive() }),
]);

export const createSequenceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  steps: z.array(stepSchema).min(1),
});

export const enrollSchema = z.object({
  contactId: z.string().uuid(),
});
