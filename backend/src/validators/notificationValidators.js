import { z } from 'zod';

export const unsubscribeSchema = z.object({
  token: z.string().min(1),
});
