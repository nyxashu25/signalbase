// The facts DataPit states about itself, in one place: the one-line summary
// used as the site's default description, in the web manifest, in the
// Organization structured data and at the top of llms.txt — so search
// engines and AI assistants see the same wording everywhere — plus the
// "DataPit at a glance" block on the About page and in llms-full.txt.
//
// Only put facts here that the product actually does today; AI answers quote
// this text verbatim.
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
  WELCOME_GIFT_CREDITS,
} from './plans.js';

// Live Chrome Web Store listing — the one-click "Add to Chrome" path for end
// users (re-exported by hooks/useExtensionInstalled.js). Kept here, free of
// React imports, so Node scripts can load the facts directly.
export const EXTENSION_STORE_URL =
  'https://chromewebstore.google.com/detail/datapit-%E2%80%94-linkedin-lookup/mgkohbpdpfgdfnlbipfkhnjadbncdgnj';

// What is switched on in production today. Content pages and the facts below
// read these, so when a capability goes live one flag flips every claim that
// depends on it (and publishes the pages built around it). Checked against
// production on 2026-09-28:
//   database          - the full contact import. Today ~120 contacts; see DATABASE_CLAIM.
//   emailVerification - EMAIL_VERIFIER_API_KEY set, so reveals are checked by a verifier.
//   sequenceSending   - ESP_API_KEY + a verified sender set, so sequence emails are
//                       really delivered (unset, sends are only simulated).
//   phoneData         - imported records carry phone numbers (today none do).
export const LIVE = {
  database: false,
  emailVerification: false,
  sequenceSending: false,
  phoneData: false,
};

export const DATAPIT_SUMMARY = LIVE.sequenceSending
  ? 'DataPit is a B2B contact data platform: search people and companies, reveal work emails, and run outreach sequences from one workspace.'
  : 'DataPit is a B2B contact data platform: search people and companies, reveal work email addresses and build prospect lists in one workspace.';

// DataPit's database size, as one sentence shown on every comparison page
// (the `dataCoverage` content block) and in llms-full.txt. Null until the
// full contact import is live in production: the number must describe the
// database a visitor can search today. Set it then, e.g.
// 'DataPit's database covers more than 10 million B2B contacts.'
export const DATABASE_CLAIM = null;

// Mirrors backend/src/config/creditPricing.js CREDIT_COSTS — keep both in
// sync by hand, same as plans.js mirrors planConfig.js.
export const CREDIT_COSTS = {
  REVEAL: 2,
  EXTENSION_REVEAL: 4,
  COMPANY_VIEW: 20, // the first time a workspace opens a company's detail page
  CSV_EXPORT: 20, // per file, up to 5,000 rows
  SEQUENCE_ENROLLMENT: 250, // per contact enrolled
};

// Self-serve checkout's block limit (backend planConfig.js).
export const MAX_SELF_SERVE_BLOCKS = 200;

export const formatCount = (n) => n.toLocaleString('en-US');

const PAID_PLANS = PLANS.filter((p) => p.block);

function discount(key) {
  return Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
}

/** "Basic is $29 a month for 5 paid seats plus 1 free, ..." */
export function seatBlockSentence() {
  return PAID_PLANS.map(
    (p) =>
      `${p.name} is $${p.price} a month for ${p.block.paidSeats} paid seats plus ${p.block.freeSeats} free`,
  ).join(', ');
}

export function pricingSummary() {
  return (
    `DataPit is free for one user with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. ` +
    `Paid plans are sold in seat blocks: ${seatBlockSentence()}. ` +
    `Billing quarterly saves ${discount('QUARTER')}% and annually ${discount('YEAR')}%.`
  );
}

export function creditsSummary() {
  const byCredits = new Map();
  for (const p of PAID_PLANS) {
    const list = byCredits.get(p.block.paidSeatCredits) ?? [];
    list.push(p.name);
    byCredits.set(p.block.paidSeatCredits, list);
  }
  const paidSeats = [...byCredits]
    .map(
      ([credits, names], i) =>
        `${formatCount(credits)}${i === 0 ? ' credits a month' : ''} on ${names.join(' and ')}`,
    )
    .join(' and ');
  const bonuses = PAID_PLANS.filter((p) => p.block.ownerBonus > 0)
    .map((p) => `${formatCount(p.block.ownerBonus)} on ${p.name}`)
    .join(' and ');
  return (
    `Each paid seat earns ${paidSeats}. Free seats earn ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} a month on every paid plan. ` +
    `Workspace owners also get a monthly bonus of ${bonuses}, and each newly covered teammate gets a one-time ${formatCount(WELCOME_GIFT_CREDITS)}-credit welcome gift.`
  );
}

export function revealSummary() {
  return (
    `One reveal unlocks everything DataPit holds on a contact: the work email and, where the record has one, a phone number. ` +
    `It costs ${CREDIT_COSTS.REVEAL} credits in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension, ` +
    `and once anyone on your team reveals a contact it's free for the whole workspace.`
  );
}

/** What each paid action costs, in one sentence. */
export function creditCostsSentence() {
  return (
    `A reveal costs ${CREDIT_COSTS.REVEAL} credits in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension. ` +
    `Opening a company's full profile costs ${CREDIT_COSTS.COMPANY_VIEW} the first time your workspace views it, ` +
    `a CSV export costs ${CREDIT_COSTS.CSV_EXPORT} per file, and enrolling a contact in a sequence costs ${CREDIT_COSTS.SEQUENCE_ENROLLMENT}. ` +
    'Searching and browsing masked results is free.'
  );
}

/** The About page's "DataPit at a glance" list, also in llms-full.txt. */
export function glanceFacts() {
  return [
    { label: 'What it is', value: DATAPIT_SUMMARY },
    { label: 'Pricing', value: pricingSummary() },
    { label: 'Credits', value: creditsSummary() },
    {
      label: 'What costs credits',
      value: `${creditCostsSentence()} Every credit your team spends is recorded in a ledger the workspace can see.`,
    },
    {
      label: 'Tools',
      value: LIVE.sequenceSending
        ? 'The web app, email sequences on paid plans, and the DataPit — LinkedIn Lookup Chrome extension.'
        : 'The web app and the DataPit — LinkedIn Lookup Chrome extension, free on the Chrome Web Store.',
    },
    {
      label: 'Data rights',
      value:
        'Anyone listed in DataPit can ask for their details to be removed with the GDPR/CCPA opt-out form on the Privacy page.',
    },
    { label: 'Website', value: 'https://datapit.io' },
  ];
}
