import { z } from 'zod';

export const createApiKeySchema = z.object({
  // A label like "Chrome extension — work laptop"; identity only, never parsed.
  name: z.string().trim().min(1, 'Name is required').max(60),
});
