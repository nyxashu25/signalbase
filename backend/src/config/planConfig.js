// Single source of truth for what each plan grants and gates. Mirrors the
// tiers on the public Pricing page (frontend/src/data/plans.js) — keep both
// in sync by hand, since the frontend has no way to import this file.

// Legacy per-plan monthly credits — only still written to the legacy
// Workspace.monthlyCreditGrant column at signup (dropped in a later cleanup
// migration). Real credit amounts live in BLOCK_CONFIG and the FREE
// constants below.
export const PLAN_MONTHLY_CREDITS = {
  FREE: 100,
  BASIC: 500,
  PROFESSIONAL: 1200,
  ORGANIZATION: 2500,
};

// Per-user monthly credits for FREE-plan users (credits are personal since
// the per-user migration): granted at signup and then re-granted monthly by
// the free-user sweep (jobs/processors/monthlyGrantProcessor). Users holding
// a paid/free seat in a paid workspace earn via that seat instead.
export const FREE_PLAN_MONTHLY_CREDITS = 800;

// ---------------------------------------------------------------------------
// Seat-block billing (product decision 2026-08-27). A paid plan is bought in
// BLOCKS: each block bundles a number of PAID seats (billed at priceCents
// per block) plus bonus FREE seats. A workspace buys as many blocks as it
// needs — Workspace.blocks — and capacity = blocks x per-block counts.
//
// Monthly personal credits per member:
//   PAID seat -> paidSeatCredits         FREE seat -> FREE_SEAT_MONTHLY_CREDITS
//   PENDING (not yet payment-covered) -> nothing
// plus a flat ownerBonus to the workspace OWNER each cycle, and a one-time
// WELCOME_GIFT_CREDITS to each member when they first become covered.
// ---------------------------------------------------------------------------
export const BLOCK_CONFIG = {
  BASIC: { priceCents: 2900, paidSeats: 5, freeSeats: 1, paidSeatCredits: 900, ownerBonus: 0 },
  PROFESSIONAL: {
    priceCents: 5900,
    paidSeats: 5,
    freeSeats: 3,
    paidSeatCredits: 2000,
    ownerBonus: 2000,
  },
  ORGANIZATION: {
    priceCents: 9900,
    paidSeats: 14,
    freeSeats: 5,
    paidSeatCredits: 2000,
    ownerBonus: 3000,
  },
};

export const FREE_SEAT_MONTHLY_CREDITS = 1500;
export const WELCOME_GIFT_CREDITS = 1500;

// Sanity ceiling for self-serve checkout — larger deals go through sales.
export const MAX_BLOCKS = 200;

/** Seat capacity a plan grants at a given block count. FREE: 1 solo seat. */
export function seatCapacity(plan, blocks) {
  const config = BLOCK_CONFIG[plan];
  if (!config) return { paid: 1, free: 0 };
  return { paid: blocks * config.paidSeats, free: blocks * config.freeSeats };
}

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

// Team features — inviting teammates, changing their roles, and the team
// credit audit — are paid-only. Free is a solo workspace (branding is still
// free; only the multi-person features are gated).
export function planIncludesTeam(plan) {
  return plan !== 'FREE';
}

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

/**
 * What one invoice charges PER BLOCK at this plan/interval, in USD cents.
 * The checkout multiplies by the block count (Stripe line-item quantity).
 */
export function blockPriceForInterval(plan, interval) {
  const monthly = BLOCK_CONFIG[plan]?.priceCents;
  if (monthly === undefined) return undefined;
  const months = INTERVAL_MONTHS[interval];
  const discount = INTERVAL_DISCOUNT[interval];
  return Math.round(monthly * months * (1 - discount));
}
