import { z } from 'zod';
import { DOM_TEXT_MAX_CHARS } from '../services/extensionService.js';

export const observeSchema = z.object({
  linkedinUrl: z.string().min(1).max(2048),
  // Everything below is best-effort parser output — any of it may be
  // missing when LinkedIn's markup shifts, and domText is the fallback.
  name: z.string().max(300).optional(),
  jobTitle: z.string().max(500).optional(),
  location: z.string().max(300).optional(),
  companyName: z.string().max(300).optional(),
  // The zod cap is a hard reject well above the service's soft clip — a
  // client sending multi-MB payloads is broken or abusive, not unlucky.
  domText: z.string().max(DOM_TEXT_MAX_CHARS * 2).optional(),
});
