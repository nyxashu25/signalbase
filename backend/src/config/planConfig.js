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

// Seat bounds per plan — the Pricing page's "min 3 seats" on Organization,
// and a sanity ceiling for self-serve checkout (larger teams go through
// sales/admin override).
export const PLAN_MIN_SEATS = {
  FREE: 1,
  BASIC: 1,
  PROFESSIONAL: 1,
  ORGANIZATION: 3,
};
export const MAX_SEATS = 50;

// Low to high — index comparison is how a "downgrade" is detected.
export const PLAN_ORDER = ['FREE', 'BASIC', 'PROFESSIONAL', 'ORGANIZATION'];

// Pay-as-you-go model: once a paid plan is taken it can't be downgraded to
// a lower paid tier until the billing interval it was taken at has run its
// course (Workspace.planActivatedAt + billingInterval below) — upgrading is
// always allowed, and this never applies to the Free plan or to a
// super-admin override (a support action, not a purchase).
export const INTERVAL_MONTHS = { MONTH: 1, QUARTER: 3, YEAR: 12 };

// Discount off the monthly rate for committing to a longer billing
// interval — e.g. QUARTER charges 3 * monthly * (1 - 0.10) up front.
export const INTERVAL_DISCOUNT = { MONTH: 0, QUARTER: 0.1, YEAR: 0.2 };

/** What one invoice at this plan/interval actually charges, in USD cents. */
export function planPriceForInterval(plan, interval) {
  const monthly = PLAN_PRICE_USD_CENTS[plan];
  const months = INTERVAL_MONTHS[interval];
  const discount = INTERVAL_DISCOUNT[interval];
  return Math.round(monthly * months * (1 - discount));
}
