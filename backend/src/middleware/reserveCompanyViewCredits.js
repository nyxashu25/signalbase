import { prisma } from '../config/db.js';
import { reserveCredit } from '../services/creditService.js';

/**
 * Like reserveCredits, but skips reserving entirely if this workspace has
 * already paid to view this company — CompanyDetailView's unique constraint
 * makes a view workspace-wide and one-time, same as EmailReveal. Unlike
 * skipIfAlreadyRevealed (which short-circuits with a response), this always
 * calls next() — the controller still needs to run to actually return the
 * company data, it just won't have a req.reservationId to commit.
 */
export function reserveCompanyViewCredits(amount) {
  return async (req, res, next) => {
    try {
      const companyId = req.params.id;
      const existing = await prisma.companyDetailView.findUnique({
        where: { workspaceId_companyId: { workspaceId: req.auth.workspaceId, companyId } },
      });

      if (existing) {
        req.reservationId = null;
        return next();
      }

      // Credits are personal — the reservation debits the CALLER's balance.
      req.reservationId = await reserveCredit(req.auth.userId, req.auth.workspaceId, amount);
      next();
    } catch (err) {
      next(err);
    }
  };
}
