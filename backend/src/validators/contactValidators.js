import { z } from 'zod';

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().min(1).max(2000),
  // 'general' (the public Contact page — no account required) vs 'support'
  // / 'enterprise' (raised from the in-app chat widget, gated to workspace
  // members — see submitContactRequest).
  category: z.enum(['general', 'support', 'enterprise']).default('general'),
});
