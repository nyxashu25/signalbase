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
