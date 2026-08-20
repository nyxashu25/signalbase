// Single source of truth for what each plan grants and gates. Mirrors the
// four tiers on the public Pricing page (frontend/src/pages/marketing/
// Pricing.jsx) — keep both in sync by hand, since the frontend has no way
// to import this file directly.
export const PLAN_MONTHLY_CREDITS = {
  FREE: 100,
  BASIC: 500,
  PROFESSIONAL: 1200,
  ORGANIZATION: 2500,
};

// Per-seat monthly price, in USD cents — matches the $0/$29/$59/$99 shown
// on the Pricing page.
export const PLAN_PRICE_USD_CENTS = {
  FREE: 0,
  BASIC: 2900,
  PROFESSIONAL: 5900,
  ORGANIZATION: 9900,
};

// Which plans unlock Sequences (build + enroll). Free is search/reveal
// only — matches the Pricing page's feature list ("Sequences with wait
// steps" first appears under Basic, not Free).
export const PLAN_HAS_SEQUENCES = {
  FREE: false,
  BASIC: true,
  PROFESSIONAL: true,
  ORGANIZATION: true,
};

export function planIncludesSequences(plan) {
  return PLAN_HAS_SEQUENCES[plan] ?? false;
}
