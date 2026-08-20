// Single source of truth for the four plan tiers, shared by the public
// Pricing page and the in-app Billing page so they can never show different
// numbers for the same plan. `key` matches the backend Plan enum
// (backend/prisma/schema.prisma) and config/planConfig.js's credit grants —
// keep both in sync by hand, since the frontend has no way to import the
// backend config directly.
export const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: 0,
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
    unit: 'seat / month, billed annually',
    credits: '500 credits / seat / month',
    tagline: 'Take prospecting and outreach further.',
    features: [
      'Everything in Free',
      '500 reveal credits / seat / month',
      'Unlimited lists',
      'Sequences with wait steps',
      'Email support',
    ],
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional',
    price: 59,
    unit: 'seat / month, billed annually',
    credits: '1,200 credits / seat / month',
    tagline: 'Multi-touch outreach with room to scale a team.',
    popular: true,
    features: [
      'Everything in Basic',
      '1,200 reveal credits / seat / month',
      'Sequence pause/resume & analytics',
      'API access',
      'Priority support',
    ],
  },
  {
    key: 'ORGANIZATION',
    name: 'Organization',
    price: 99,
    unit: 'seat / month, min 3 seats, billed annually',
    credits: '2,500 credits / seat / month',
    tagline: 'Advanced controls for larger go-to-market teams.',
    features: [
      'Everything in Professional',
      '2,500 reveal credits / seat / month',
      'Single sign-on (SSO)',
      'Dedicated onboarding',
      'Custom credit pooling',
    ],
  },
];

export function findPlan(key) {
  return PLANS.find((p) => p.key === key);
}
