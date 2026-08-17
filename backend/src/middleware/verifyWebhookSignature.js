import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from './errorHandler.js';

export function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-signature'];
  if (!signature) {
    return next(new ApiError(401, 'Missing X-Signature header'));
  }

  const expected = createHmac('sha256', env.ESP_WEBHOOK_SECRET).update(req.rawBody).digest('hex');
  const provided = Buffer.from(String(signature), 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  // Constant-time comparison — a timing difference in a naive === compare
  // is itself a side channel an attacker can use to forge a valid signature
  // one byte at a time. Length must match first: timingSafeEqual throws
  // (rather than returning false) on mismatched buffer lengths.
  if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
    return next(new ApiError(401, 'Invalid webhook signature'));
  }

  next();
}
