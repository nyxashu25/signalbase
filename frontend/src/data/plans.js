// Single source of truth for the four plan tiers, shared by the public
// Pricing page and the in-app Billing page so they can never show different
// numbers for the same plan. `key` matches the backend Plan enum
// (backend/prisma/schema.prisma) and config/planConfig.js's credit grants —
// keep both in sync by hand, since the frontend has no way to import the
// backend config directly.
// `price` is the per-seat monthly rate; `seats` is the FIXED number of seats
// the plan grants (buyers don't pick a quantity). The whole-plan price is
// price x seats (see planTotalForInterval), and monthly credits are the flat
// pool shown in `credits`. `seats` mirrors backend PLAN_INCLUDED_SEATS and
// `credits` mirrors PLAN_MONTHLY_CREDITS x seats — keep both in sync by hand.
export const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: 0,
    seats: 1,
    unit: null,
    credits: '100 credits / month',
    tagline: "Try DataPit's search and reveal on a real workspace.",
    features: [
      'People & company search',
      'Masked email results',
      '100 reveal credits / month',
      '1 saved list',
      '1 seat',
    ],
  },
  {
    key: 'BASIC',
    name: 'Basic',
    price: 29,
    seats: 10,
    unit: 'month, billed annually',
    credits: '5,000 credits / month',
    tagline: 'Take prospecting and outreach further.',
    features: [
      'Everything in Free',
      '10 seats included',
      '5,000 reveal credits / month',
      'Unlimited lists',
      'Sequences with wait steps',
      'Email support',
    ],
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional',
    price: 59,
    seats: 25,
    unit: 'month, billed annually',
    credits: '30,000 credits / month',
    tagline: 'Multi-touch outreach with room to scale a team.',
    popular: true,
    features: [
      'Everything in Basic',
      '25 seats included',
      '30,000 reveal credits / month',
      'Sequence pause/resume & analytics',
      'API access',
      'Priority support',
    ],
  },
  {
    key: 'ORGANIZATION',
    name: 'Organization',
    price: 99,
    seats: 45,
    unit: 'month, billed annually',
    credits: '112,500 credits / month',
    tagline: 'Advanced controls for larger go-to-market teams.',
    features: [
      'Everything in Professional',
      '45 seats included',
      '112,500 reveal credits / month',
      'Single sign-on (SSO)',
      'Dedicated onboarding',
      'Custom credit pooling',
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

/** The per-seat charge for one invoice at this plan/interval, in whole USD. */
export function planPriceForInterval(planKey, intervalKey) {
  const plan = findPlan(planKey);
  const interval = BILLING_INTERVALS.find((i) => i.key === intervalKey);
  if (!plan || !interval) return null;
  return Math.round(plan.price * interval.months * (1 - interval.discount) * 100) / 100;
}

/**
 * What one invoice actually charges for the WHOLE plan (per-seat rate x the
 * plan's fixed seat count), in whole USD — this is the headline price now that
 * seats are bundled. Mirrors backend planPriceForInterval x PLAN_INCLUDED_SEATS.
 */
export function planTotalForInterval(planKey, intervalKey) {
  const plan = findPlan(planKey);
  const perSeat = planPriceForInterval(planKey, intervalKey);
  if (!plan || perSeat == null) return null;
  return Math.round(perSeat * plan.seats * 100) / 100;
}
