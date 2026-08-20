// Single source of truth for what a credit package costs, in every currency
// this app can charge in. Priced here — never trusted from the client — so
// a checkout request can never claim a discount by sending an arbitrary
// `credits` value. Exposed to the frontend via GET /billing/packages rather
// than duplicated as a hardcoded array in AddCredits.jsx.
export const CREDIT_PACKAGES = [
  { credits: 250, usdCents: 1500, inrPaise: 125_000 },
  { credits: 600, usdCents: 3000, inrPaise: 250_000, badge: 'Best value' },
  { credits: 1500, usdCents: 6500, inrPaise: 540_000 },
];

export function findPackage(credits) {
  return CREDIT_PACKAGES.find((p) => p.credits === credits) ?? null;
}

export const CUSTOM_CREDITS_MIN = 200;
export const CUSTOM_CREDITS_MAX = 50_000;

/**
 * Prices a custom (non-package) credit amount at the same per-credit rate
 * as whichever preset package is numerically closest — so a custom amount
 * near the 1500 tier costs proportionally what 1500 costs, not some
 * unrelated flat rate. Ties (equidistant from two packages) favor the
 * larger package, i.e. the cheaper per-credit rate.
 */
export function priceCustomCredits(credits) {
  const closest = CREDIT_PACKAGES.reduce((best, pkg) => {
    const diff = Math.abs(pkg.credits - credits);
    const bestDiff = Math.abs(best.credits - credits);
    if (diff < bestDiff) return pkg;
    if (diff === bestDiff && pkg.credits > best.credits) return pkg;
    return best;
  });
  return {
    usdCents: Math.round((closest.usdCents / closest.credits) * credits),
    inrPaise: Math.round((closest.inrPaise / closest.credits) * credits),
  };
}
