import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, MAX_SELF_SERVE_BLOCKS, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
} from '../../../data/plans.js';

// Lusha facts below were read from lusha.com and docs.lusha.com on
// 2026-09-28; every one is listed in the sources block at the end.
const CHECKED = '2026-09-28';

const PAID = PLANS.filter((p) => p.block);
const plan = (key) => PLANS.find((p) => p.key === key);
const BASIC = plan('BASIC');
const PRO = plan('PROFESSIONAL');
const ORG = plan('ORGANIZATION');

const pct = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
const seats = (p) => p.block.paidSeats + p.block.freeSeats;
const blockSeats = (p) => `${p.block.paidSeats} paid seats plus ${p.block.freeSeats} free`;
const freeReveals = FREE_PLAN_MONTHLY_CREDITS / CREDIT_COSTS.REVEAL;

// Monthly-billing cost of a DataPit plan for a team: blocks are
// ceil(people / seats per block), as the billing page pre-fills them.
function teamCost(p, people) {
  const blocks = Math.ceil(people / seats(p));
  return `${p.name}: $${formatCount(blocks * p.price)} (${blocks} ${blocks === 1 ? 'block' : 'blocks'})`;
}
const dataPitCosts = (people) => PAID.map((p) => teamCost(p, people)).join('. ') + '.';

// "a, b or c" / "a, b and c"
function joinList(items, word = 'or') {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

// What Lusha offers today that DataPit doesn't; phone data and sequence
// sending drop out of the list when their LIVE flags flip.
const lushaOnly = [
  !LIVE.phoneData && 'phone numbers',
  'CRM integrations',
  'an API',
  !LIVE.sequenceSending && 'email sequences',
].filter(Boolean);

export default {
  meta: {
    path: '/alternatives/lusha',
    section: 'alternatives',
    name: 'Lusha alternative',
    title: 'Lusha Alternative: Pricing and Features Compared | DataPit',
    description:
      'Compare DataPit and Lusha on pricing, seats, credits and features. See what a team of 5, 10 or 25 costs, and when Lusha is the better choice.',
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'Lusha alternative',
    lines: ['A Lusha alternative', 'priced for teams'],
    sub: `DataPit is a Lusha alternative for teams that search contacts and reveal work emails. Paid plans are seat blocks: ${BASIC.name} is $${BASIC.price} a month for ${blockSeats(BASIC)}, and each member earns their own credits. Lusha is the better fit if you need ${joinList(lushaOnly)} today.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `DataPit suits teams that mainly need work emails and want one low price for several seats. ${BASIC.name} is $${BASIC.price} a month for up to ${seats(BASIC)} people; Lusha Starter is $49.90 billed monthly for 1 seat. Stay with Lusha if you rely on ${joinList([...lushaOnly, 'buying signals', 'published security certifications'])}.`,
    },

    { type: 'h2', text: 'How does Lusha pricing work?' },
    {
      type: 'p',
      text: 'Lusha prices by plan, with a set number of seats in each: Starter includes 1, Pro 2 and Premium 5. Credits are listed per plan, not per seat. Its enterprise plan, Scale, is quote only.',
    },
    {
      type: 'p',
      text: 'The lowest paid plan, Starter, is $49.90 a month on monthly billing, or $37.45 a month billed yearly. Pro and Premium add seats at $49.90 a month each on monthly billing. Lusha’s pricing FAQ asks teams of more than 5 users to contact sales.',
    },
    {
      type: 'p',
      text: 'The Free plan is 1 seat with 40 credits a month and needs no credit card. An email reveal costs 1 credit and a phone number costs 5. So the Free plan covers up to 40 emails or 8 phone numbers a month.',
    },

    { type: 'h2', text: 'DataPit vs Lusha at a glance' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'Lusha'],
      rows: [
        [
          'Pricing model',
          'Seat blocks: one price for a set of paid seats plus free seats.',
          'Per plan, with seats included. Pro and Premium can add seats; Scale is quote only.',
        ],
        [
          'Lowest paid price',
          `${BASIC.name}: $${BASIC.price} a month for ${blockSeats(BASIC)}. Quarterly billing saves ${pct('QUARTER')}% and annual ${pct('YEAR')}%.`,
          'Starter: $49.90 a month billed monthly, or $37.45 a month billed yearly, for 1 seat.',
        ],
        [
          'Free plan',
          `1 seat, ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month (${formatCount(freeReveals)} in-app reveals).`,
          '1 seat, 40 credits a month, no credit card.',
        ],
        [
          'How seats are counted',
          `Per block: ${PAID.map((p) => `${p.name} ${p.block.paidSeats} paid + ${p.block.freeSeats} free`).join(', ')}. Anyone but the owner can take a free seat.`,
          'Starter 1 seat, Pro 2, Premium 5. Extra Pro and Premium seats cost $49.90 a month each, or $37.40 a month billed yearly.',
        ],
        [
          'Credits',
          `Personal to each member: ${formatCount(BASIC.block.paidSeatCredits)} a month per paid seat on ${BASIC.name}, ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat. Owners get a bonus on ${PRO.name} and ${ORG.name}.`,
          'Listed per plan: Starter 400 a month, Pro 600, Premium 3,400 on monthly billing. Pro and Premium credits roll over up to 2x.',
        ],
        [
          'Email finding',
          `Yes: ${CREDIT_COSTS.REVEAL} credits per reveal in the app, ${CREDIT_COSTS.EXTENSION_REVEAL} in the extension. Where no email is on file, the reveal returns a first.last@ guess at the company domain${LIVE.emailVerification ? ', checked with a verifier' : ', which isn’t verified today'}.`,
          'Yes, on every plan including Free: 1 credit per email.',
        ],
        [
          'Phone numbers',
          LIVE.phoneData ? 'Included in the same reveal, where the record has one' : 'Not yet',
          'Yes, on every plan including Free: 5 credits per phone number.',
        ],
        [
          'Chrome extension',
          `Yes, [free on the Chrome Web Store](${EXTENSION_STORE_URL}). [The DataPit extension](/chrome-extension) works on LinkedIn profiles; a reveal costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
          'Yes, free to install. Lusha lists LinkedIn, Sales Navigator, company websites, Gmail, Google Calendar and CRMs.',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending ? 'Yes, on paid plans' : 'Not yet',
          'Yes: Lusha Engage, on every plan at no extra charge. It sends from your Gmail or Outlook account, up to 1,000 emails a day.',
        ],
        [
          'CRM integrations',
          'Not yet. You can export revealed contacts as CSV instead.',
          'Native Salesforce, HubSpot, Microsoft Dynamics, Pipedrive, Zoho and Bullhorn integrations, plus Zapier, Make, n8n and Workato.',
        ],
        [
          'API',
          'No. API keys only connect the Chrome extension.',
          'Yes. Free and Starter have strict rate limits, Pro adds webhooks and Premium gets API Advanced.',
        ],
        [
          'Buying intent and signals',
          'No',
          'Yes, intent topics on paid plans: Starter includes 5 and Scale 25. Lusha also tracks signals such as job changes, hiring surges and funding.',
        ],
      ],
      note: 'Lusha prices are in USD from its pricing page. Where Lusha offers both, the table gives monthly and yearly billing.',
    },
    {
      type: 'p',
      text: 'Lusha says it has 290M+ contacts and 29M+ companies, and claims 165M+ emails and 117M+ direct dials. It also publishes its own coverage figures by country, such as 87.8M in the US and 9.8M in the UK.',
    },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'What does Lusha cost for a team compared with DataPit?' },
    {
      type: 'table',
      head: ['Team size', 'DataPit, billed monthly', 'Lusha, billed monthly', 'Lusha, billed yearly (per month)'],
      rows: [
        [
          '5 people',
          dataPitCosts(5),
          'Pro with 3 added seats: $219.60. Premium, 5 seats included: $399.90.',
          'Pro with 3 added seats: $164.65. Premium, 5 seats included: $299.95.',
        ],
        [
          '10 people',
          dataPitCosts(10),
          'Contact sales: Lusha’s pricing FAQ asks teams larger than 5 users to reach out to its sales team.',
          'Contact sales',
        ],
        [
          '25 people',
          dataPitCosts(25),
          'Contact sales: Lusha’s pricing FAQ asks teams larger than 5 users to reach out to its sales team.',
          'Contact sales',
        ],
      ],
      caption: 'Monthly list price for a whole team',
      note: `Prices only: the plans don’t include the same credits or features. DataPit prices are for monthly billing; quarterly saves ${pct('QUARTER')}% and annual ${pct('YEAR')}%. Lusha’s Pro figures are the plan price plus $49.90 a month per added seat, or $37.40 a month billed yearly.`,
    },
    {
      type: 'p',
      text: `A DataPit block holds ${seats(BASIC)} people on ${BASIC.name}, ${seats(PRO)} on ${PRO.name} and ${seats(ORG)} on ${ORG.name}. So the cheapest plan for your team depends on how its size fits the blocks. Self-serve checkout goes up to ${MAX_SELF_SERVE_BLOCKS} blocks, and larger teams go through sales.`,
    },

    { type: 'h2', text: 'When is Lusha the better choice?' },
    {
      type: 'list',
      items: [
        `**You need phone numbers.** Lusha reveals phone numbers on every plan, Free included, for 5 credits each.${LIVE.phoneData ? '' : ' DataPit has no phone data yet.'}`,
        '**You want your CRM connected.** Lusha has native Salesforce, HubSpot, Microsoft Dynamics, Pipedrive, Zoho and Bullhorn integrations, plus Zapier, Make, n8n and Workato. DataPit has none of these yet.',
        '**You build on an API.** Lusha’s API covers person, company, prospecting and signals data, and Pro adds webhooks. DataPit has no general-purpose API.',
        LIVE.sequenceSending
          ? '**You want outreach from your own mailbox.** Lusha Engage sends sequences from your Gmail or Outlook account, on every plan.'
          : '**You want to send sequences today.** Lusha Engage sends email sequences from your Gmail or Outlook account, on every plan. DataPit’s sequences don’t send email yet.',
        '**You use buying signals.** Lusha offers buying intent topics on paid plans and tracks signals such as job changes, hiring surges and funding. DataPit has no intent data.',
        '**Your buyers ask for certifications.** Lusha’s trust center lists SOC 2 Type II, ISO/IEC 27001, 27701, 27017 and 42001, ISO 31700 and TRUSTe. It says customer personal data is mainly stored in EU regions.',
        '**You prospect outside LinkedIn.** Lusha’s extension also works on company websites, Gmail, Google Calendar and CRMs. The DataPit extension works on LinkedIn profiles only.',
        '**You want to judge coverage before you buy.** Lusha publishes its database size and a country-by-country breakdown, by its own figures.',
      ],
    },

    { type: 'h2', text: 'When does DataPit fit better?' },
    {
      type: 'list',
      items: [
        `**You’re paying for a team, not one seat.** ${BASIC.name} is $${BASIC.price} a month for ${blockSeats(BASIC)}. ${PRO.name} is $${PRO.price} a month for ${blockSeats(PRO)}, and ${ORG.name} is $${ORG.price} for ${blockSeats(ORG)}.`,
        `**Everyone gets their own credits.** Each paid seat earns ${formatCount(BASIC.block.paidSeatCredits)} credits a month on ${BASIC.name} or ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}, and free seats earn ${formatCount(FREE_SEAT_MONTHLY_CREDITS)}. Owners get an extra ${formatCount(PRO.block.ownerBonus)} a month on ${PRO.name} and ${formatCount(ORG.block.ownerBonus)} on ${ORG.name}.`,
        '**Your team shares reveals.** Once anyone in your workspace reveals a contact, it’s free for everyone else in it. Nobody pays twice for the same person.',
        `**You want more free credits.** The DataPit Free plan has ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month for 1 seat, enough for ${formatCount(freeReveals)} in-app reveals at ${CREDIT_COSTS.REVEAL} credits each. Lusha Free gives 40 credits a month.`,
        `**You want a list price for a bigger team.** Every DataPit plan has a published block price, for up to ${MAX_SELF_SERVE_BLOCKS} blocks at self-serve checkout. Lusha publishes three paid plans, but its FAQ asks teams larger than 5 users to contact sales.`,
        '**You want to see where credits go.** Credit spends are recorded in a ledger with the reason and the member who spent them. Admins on paid plans can see spend per member and export it.',
      ],
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit cheaper than Lusha?',
          a: `On list price, yes, for the team sizes Lusha publishes. DataPit ${BASIC.name} is $${BASIC.price} a month for up to ${seats(BASIC)} people, while 5 seats on Lusha Pro cost $219.60 a month billed monthly. Lusha includes things DataPit doesn’t yet, such as ${joinList(lushaOnly.filter((x) => x !== 'an API'), 'and')}.`,
        },
        {
          q: 'Does DataPit have a free plan?',
          a: `Yes: 1 seat with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${formatCount(freeReveals)} reveals in the app. It includes people and company search, lists, CSV export and the Chrome extension. Sequences and team features need a paid plan.`,
        },
        {
          q: 'Can I import my Lusha data into DataPit?',
          a: 'No. DataPit has no way to upload your own contact files, from Lusha or anywhere else. You build lists by searching DataPit and revealing contacts, and you can export them as CSV.',
        },
        {
          q: 'Does DataPit have phone numbers like Lusha?',
          a: LIVE.phoneData
            ? 'Yes, where the record has one. A reveal unlocks the phone number along with the email, for the same credits.'
            : 'Not yet. DataPit doesn’t have phone data today, so if you need direct dials, Lusha is the better choice for now.',
        },
        {
          q: 'Does DataPit integrate with Salesforce or HubSpot?',
          a: `Not yet. DataPit has no CRM integrations, Zapier connector or general-purpose API today. You can move revealed contacts out with a CSV export for ${CREDIT_COSTS.CSV_EXPORT} credits per file.`,
        },
      ],
    },
    {
      type: 'cta',
      title: 'Try DataPit free',
      text: `The Free plan gives you ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. Move to a seat block when your team needs it.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        { label: 'Apollo alternative', to: '/alternatives/apollo', text: 'How DataPit compares with Apollo on price, seats and features.' },
        { label: 'ZoomInfo alternative', to: '/alternatives/zoominfo', text: 'How DataPit compares with ZoomInfo on price, seats and features.' },
        { label: 'Cognism alternative', to: '/alternatives/cognism', text: 'How DataPit compares with Cognism on price, seats and features.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${BASIC.price} a month, and a free plan.` },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'Lusha pricing: plans, seats, credits, credit costs, extra seats, API, intent topics and FAQ', url: 'https://www.lusha.com/pricing/', checked: CHECKED },
        { label: 'Lusha homepage: database size claims', url: 'https://www.lusha.com/', checked: CHECKED },
        { label: 'Lusha data page: coverage by country', url: 'https://www.lusha.com/data/', checked: CHECKED },
        { label: 'Lusha Chrome extension page', url: 'https://www.lusha.com/lusha-extension/', checked: CHECKED },
        { label: 'Lusha on the Chrome Web Store', url: 'https://chromewebstore.google.com/detail/lusha-easily-find-b2b-con/mcebeofpilippmndlpcghpmghcljajna', checked: CHECKED },
        { label: 'Lusha Engage: email sequences', url: 'https://www.lusha.com/engage/', checked: CHECKED },
        { label: 'Lusha docs: native CRM integrations', url: 'https://docs.lusha.com/user-guide/native-crm-integrations', checked: CHECKED },
        { label: 'Lusha integrations marketplace', url: 'https://www.lusha.com/integrations/', checked: CHECKED },
        { label: 'Lusha docs: API fundamentals', url: 'https://docs.lusha.com/tutorials/api_fundamentals', checked: CHECKED },
        { label: 'Lusha buying signals', url: 'https://www.lusha.com/buying-signals/', checked: CHECKED },
        { label: 'Lusha Trust Center: compliance', url: 'https://www.lusha.com/trust-center/tc-compliance/', checked: CHECKED },
      ],
    },
  ],
};
