import { reserveCredit, releaseReservation } from '../services/creditService.js';

/**
 * Reserves credits before a costly operation runs, attaching req.reservationId.
 * Throws 402 (via reserveCredit) if the balance is insufficient.
 */
export function reserveCredits(amount = 1) {
  return async (req, res, next) => {
    try {
      req.reservationId = await reserveCredit(req.auth.workspaceId, amount);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Safety net for routes using reserveCredits: if the handler throws without
 * having explicitly committed or released, refund immediately instead of
 * leaving it for the reaper (which is correct, just slower — minutes, not
 * this request). releaseReservation is idempotent, so this is harmless to
 * call even when the handler already resolved the reservation itself.
 *
 * Awaited before calling next(err) — Express doesn't wait for an async
 * error handler's returned promise on its own, but the balance must
 * actually be restored before the error response goes out, not just
 * "eventually" after it. An unawaited fire-and-forget release here would
 * let the client observe a still-reserved balance in the gap.
 */
export async function releaseOnError(err, req, res, next) {
  if (req.reservationId) {
    try {
      await releaseReservation(req.reservationId);
    } catch {
      // Already released/expired, or a transient Redis error — the reaper
      // is the backstop either way; don't let this mask the real error.
    }
  }
  next(err);
}
