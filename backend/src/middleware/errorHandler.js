import { logger } from '../config/logger.js';
import { isProduction } from '../config/env.js';

export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity (4 args)
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode ?? 500;
  const message = statusCode === 500 && isProduction ? 'Internal server error' : err.message;

  if (statusCode >= 500) {
    logger.error({ err, requestId: req.id }, 'Unhandled error');
  } else {
    logger.warn({ requestId: req.id, statusCode, message }, 'Request error');
  }

  res.status(statusCode).json({
    error: {
      message,
      details: err.details,
      requestId: req.id,
    },
  });
}
