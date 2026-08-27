// Single source of truth for the plan tiers, shared by the public Pricing
// page and the in-app Billing page so they can never show different numbers
// for the same plan. `key` matches the backend Plan enum and `block` mirrors
// backend/src/config/planConfig.js's BLOCK_CONFIG — keep both in sync by
// hand, since the frontend has no way to import the backend config directly.
//
// Paid plans are bought in BLOCKS: each block is a bundle of paid seats
// (billed) plus bonus free seats. Every member earns PERSONAL monthly
// credits by the seat they occupy — paid seats at the plan rate, free seats
// at a flat 1,500 — plus a flat monthly bonus to the workspace owner and a
// one-time 1,500 welcome gift when a member is first covered by payment.
export const FREE_SEAT_MONTHLY_CREDITS = 1500;
export const WELCOME_GIFT_CREDITS = 1500;
export const FREE_PLAN_MONTHLY_CREDITS = 800;

export const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: 0,
    block: null,
    credits: '800 credits / month',
    tagline: "Try DataPit's search and reveal on a real workspace.",
    features: [
      'People & company search',
      'Masked email results',
      '800 personal credits / month',
      '1 saved list',
      'Solo workspace (1 seat)',
    ],
  },
  {
    key: 'BASIC',
    name: 'Basic',
    price: 29,
    block: { paidSeats: 5, freeSeats: 1, paidSeatCredits: 900, ownerBonus: 0 },
    credits: '900 credits / paid seat / month',
    tagline: 'Take prospecting and outreach further.',
    features: [
      'Everything in Free',
      'Per block: 5 paid + 1 free seat',
      '900 credits / paid seat / month',
      '1,500 credits / free seat / month',
      'Unlimited lists',
      'Sequences with wait steps',
    ],
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional',
    price: 59,
    block: { paidSeats: 5, freeSeats: 3, paidSeatCredits: 2000, ownerBonus: 2000 },
    credits: '2,000 credits / paid seat / month',
    tagline: 'Multi-touch outreach with room to scale a team.',
    popular: true,
    features: [
      'Everything in Basic',
      'Per block: 5 paid + 3 free seats',
      '2,000 credits / paid seat / month',
      '+2,000 monthly owner bonus',
      'Sequence pause/resume & analytics',
      'API access',
    ],
  },
  {
    key: 'ORGANIZATION',
    name: 'Organization',
    price: 99,
    block: { paidSeats: 14, freeSeats: 5, paidSeatCredits: 2000, ownerBonus: 3000 },
    credits: '2,000 credits / paid seat / month',
    tagline: 'Advanced controls for larger go-to-market teams.',
    features: [
      'Everything in Professional',
      'Per block: 14 paid + 5 free seats',
      '2,000 credits / paid seat / month',
      '+3,000 monthly owner bonus',
      'Single sign-on (SSO)',
      'Dedicated onboarding',
    ],
  },
];

export function findPlan(key) {
  return PLANS.find((p) => p.key === key);
}

// Mirrors backend/src/config/planConfig.js's INTERVAL_MONTHS/INTERVAL_DISCOUNT
// — keep both in sync by hand, same as PLANS above.
export const BILLING_INTERVALS = [
  { key: 'MONTH', label: 'Monthly', months: 1, discount: 0 },
  { key: 'QUARTER', label: 'Quarterly', months: 3, discount: 0.1 },
  { key: 'YEAR', label: 'Annually', months: 12, discount: 0.2 },
];

/** The per-BLOCK charge for one invoice at this plan/interval, in whole USD. */
export function blockPriceForInterval(planKey, intervalKey) {
  const plan = findPlan(planKey);
  const interval = BILLING_INTERVALS.find((i) => i.key === intervalKey);
  if (!plan || !interval) return null;
  return Math.round(plan.price * interval.months * (1 - interval.discount) * 100) / 100;
}

/** What one invoice charges for N blocks of this plan/interval, in whole USD. */
export function planTotalForInterval(planKey, intervalKey, blocks = 1) {
  const perBlock = blockPriceForInterval(planKey, intervalKey);
  if (perBlock == null) return null;
  return Math.round(perBlock * blocks * 100) / 100;
}
