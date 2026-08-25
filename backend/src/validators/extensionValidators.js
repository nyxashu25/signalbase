import { z } from 'zod';
import { DOM_TEXT_MAX_CHARS } from '../services/extensionService.js';

export const observeSchema = z.object({
  linkedinUrl: z.string().min(1).max(2048),
  // Everything below is best-effort parser output — any of it may be
  // missing OR null when LinkedIn's markup shifts (the content script
  // reports unparsed fields as null), and domText is the fallback. That's
  // why these are .nullish(), not .optional(): zod's .optional() accepts
  // absent-but-not-null, and rejecting a whole observation over one
  // unparsed field silently killed the missing-person pipeline in
  // production (every miss 400'd).
  name: z.string().max(300).nullish(),
  jobTitle: z.string().max(500).nullish(),
  location: z.string().max(300).nullish(),
  companyName: z.string().max(300).nullish(),
  // The zod cap is a hard reject well above the service's soft clip — a
  // client sending multi-MB payloads is broken or abusive, not unlucky.
  domText: z.string().max(DOM_TEXT_MAX_CHARS * 2).nullish(),
});
