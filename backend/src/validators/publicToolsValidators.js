import { z } from 'zod';
import { normalizeDomain } from '../utils/domain.js';

// Syntax is NOT validated here: a malformed address is a normal 200
// answer from the verifier (verdict "invalid", reason "invalid_syntax"),
// not a 400. Only the shape of the request is.
export const publicVerifyEmailSchema = z.object({
  email: z.string().trim().min(1).max(254),
});

const personName = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .transform((s) => s.replace(/\s+/g, ' '));

export const publicFindEmailSchema = z.object({
  firstName: personName,
  lastName: personName,
  // A URL, an email address or a bare domain — normalized to "acme.com".
  domain: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .transform((value, ctx) => {
      const domain = normalizeDomain(value);
      if (!domain) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a company domain, like acme.com',
        });
        return z.NEVER;
      }
      return domain;
    }),
});
