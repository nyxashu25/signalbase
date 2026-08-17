import { ApiError } from './errorHandler.js';

/**
 * Validates req.body against a zod schema and replaces it with the parsed
 * (and coerced/defaulted) result. Every mutating route gets one of these —
 * no handler should trust req.body's shape directly.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}

/**
 * Same idea for query strings. Stored separately (req.validatedQuery) rather
 * than overwriting req.query — Express 5 makes req.query a read-only getter,
 * and relying on mutating it is a needless coupling to Express 4 internals.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.flatten()));
    }
    req.validatedQuery = result.data;
    next();
  };
}
