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
import { LIVE } from './live.js';

// Live Chrome Web Store listing — the one-click "Add to Chrome" path for end
// users (re-exported by hooks/useExtensionInstalled.js). Kept here, free of
// React imports, so Node scripts can load the facts directly.
export const EXTENSION_STORE_URL =
  'https://chromewebstore.google.com/detail/datapit-%E2%80%94-linkedin-lookup/mgkohbpdpfgdfnlbipfkhnjadbncdgnj';

// The Chrome extension. EXTENSION_VERSION is extension/manifest.json's
// version (the download on the site); EXTENSION_STORE_VERSION is the one the
// Chrome Web Store serves. Bump the store version once Google approves an
// upload — until then, pages note that the newest surfaces are download-only.
export const EXTENSION_NAME = 'DataPit — Contact Lookup';
export const EXTENSION_VERSION = '0.6.0';
export const EXTENSION_STORE_VERSION = '0.5.0';
export const EXTENSION_SURFACES =
  'LinkedIn, Sales Navigator, company websites, Gmail, Google Calendar, HubSpot and Salesforce';

/** One sentence when the store lags the download, else ''. */
export function extensionStoreNote() {
  if (EXTENSION_STORE_VERSION === EXTENSION_VERSION) return '';
  return `Version ${EXTENSION_VERSION}, which adds Sales Navigator, company websites, Gmail, Google Calendar, HubSpot and Salesforce, is available to download from DataPit now and reaches the Chrome Web Store once Google approves the update.`;
}

// DataPit's official profiles on other sites, as { name, url } — e.g.
// { name: 'LinkedIn', url: 'https://www.linkedin.com/company/…' }, then
// Crunchbase, G2, Product Hunt, X. Empty until the owner creates them. This
// one list feeds the Organization structured data's `sameAs` (seo/site.js),
// the Profiles section of the /press page and the Profiles group in llms.txt
// (seo/llms.js), so a profile added here shows up in all three on the next
// build. Only profiles DataPit itself controls belong here: the Chrome Web
// Store listing is a product page (EXTENSION_STORE_URL), not a profile.
export const PROFILES = [];

// What is switched on in production today (see live.js). Defined in its own
// module so plans.js can read it too without an import cycle; re-exported
// here, where pages and content files import it from.
export { LIVE };

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

// One formatter for every count on the site: `toLocaleString('en-US')` builds
// a fresh one per call, and the pages make hundreds of calls while they load.
const COUNT_FORMAT = new Intl.NumberFormat('en-US');
export const formatCount = (n) => COUNT_FORMAT.format(n);

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

// The company description in two longer lengths, for the /press page and for
// the "About" fields of DataPit's profiles (PROFILES) — paste these rather than
// writing a new one, so every site describes DataPit the same way. The
// one-line version is DATAPIT_SUMMARY itself; both start with it.
const LOWEST_PLAN = PAID_PLANS[0];
const HIGHEST_PLAN = PAID_PLANS[PAID_PLANS.length - 1];

/** About 50 words. */
export const BOILERPLATE_SHORT =
  `${DATAPIT_SUMMARY} Paid seat blocks start at $${LOWEST_PLAN.price} a month for ` +
  `${LOWEST_PLAN.block.paidSeats} paid seats plus ${LOWEST_PLAN.block.freeSeats} free, and the free plan includes ` +
  `${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. A contact revealed once is free for the whole workspace.`;

/** About 100 words. */
export const BOILERPLATE_MEDIUM =
  `${DATAPIT_SUMMARY} Each seat earns its own monthly credits, and a contact revealed once is free for ` +
  'everyone in the workspace. Lists export to CSV, and a credit ledger records what each credit was spent on. ' +
  `Paid plans are sold in seat blocks, from $${LOWEST_PLAN.price} a month for ${LOWEST_PLAN.block.paidSeats} paid ` +
  `seats plus ${LOWEST_PLAN.block.freeSeats} free to $${HIGHEST_PLAN.price} for ${HIGHEST_PLAN.block.paidSeats} paid ` +
  `plus ${HIGHEST_PLAN.block.freeSeats} free, and the free plan includes ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} ` +
  'credits a month. DataPit also offers a free Chrome extension and a free email verifier.' +
  (DATABASE_CLAIM ? ` ${DATABASE_CLAIM}` : '');

export function pricingSummary() {
  return (
    `DataPit is free for one user with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. ` +
    'Paid plans are sold in seat blocks. ' +
    PAID_PLANS.map(
      (p) => `${p.name} is $${p.price} a month for ${p.block.paidSeats} paid seats plus ${p.block.freeSeats} free.`,
    ).join(' ') +
    ` Billing quarterly saves ${discount('QUARTER')}% and annually ${discount('YEAR')}%.`
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
    `Workspace owners also get a monthly bonus of ${bonuses}. ` +
    `Each newly covered teammate gets a one-time ${formatCount(WELCOME_GIFT_CREDITS)}-credit welcome gift.`
  );
}

export function revealSummary() {
  return (
    (LIVE.phoneData
      ? 'One reveal unlocks everything DataPit holds on a contact: the work email and, where the record has one, a phone number. '
      : 'A reveal unlocks the work email DataPit holds on a contact. ') +
    (LIVE.emailVerification
      ? 'With no email on file, DataPit checks a first.last guess, and a guess the verifier rejects costs nothing. '
      : 'With no email on file, you get a first.last guess, charged like any reveal. ') +
    `A reveal costs ${CREDIT_COSTS.REVEAL} credits in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension. ` +
    "Once anyone on your team reveals a contact, it's free for the whole workspace."
  );
}

/** What each paid action costs, in one sentence. */
export function creditCostsSentence() {
  return (
    `A reveal costs ${CREDIT_COSTS.REVEAL} credits in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension. ` +
    `Opening a company's full profile costs ${CREDIT_COSTS.COMPANY_VIEW} the first time your workspace views it. ` +
    `A CSV export costs ${CREDIT_COSTS.CSV_EXPORT} per file, and enrolling a contact in a sequence costs ${CREDIT_COSTS.SEQUENCE_ENROLLMENT}. ` +
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
        ? `The web app, email sequences on paid plans, and the free ${EXTENSION_NAME} Chrome extension for ${EXTENSION_SURFACES}.`
        : `The web app and the free ${EXTENSION_NAME} Chrome extension, which works on ${EXTENSION_SURFACES}.`,
    },
    {
      label: 'Data rights',
      value:
        'Anyone listed in DataPit can ask for their details to be removed with the GDPR/CCPA opt-out form on the Privacy page.',
    },
    { label: 'Website', value: 'https://datapit.io' },
  ];
}
