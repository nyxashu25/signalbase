import { CREDIT_COSTS, LIVE, MAX_SELF_SERVE_BLOCKS, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
} from '../../../data/plans.js';

// Apollo.io facts below were read on apollo.io, its docs, knowledge base and
// Trust Center on 2026-09-28. Every one is listed in the sources block.
const CHECKED = '2026-09-28';

// Apollo.io list prices in USD per seat per month, and credits per seat,
// from https://www.apollo.io/pricing. Organization is sold annually only.
const APOLLO = {
  free: { monthlyCredits: 75, yearCredits: 900, sequences: 2, recordLimit: 25 },
  basic: { monthly: 65, annual: 49, monthlyCredits: 2500 },
  professional: { monthly: 99, annual: 79, monthlyCredits: 4000 },
  organization: { annual: 119, minSeats: 3 },
  addOn: { monthly: 149, annual: 119 }, // per team, e.g. the Advanced Dialer
  credits: { email: 1, phone: 8, dialerMinute: 2 },
};

const plan = (key) => PLANS.find((p) => p.key === key);
const BASIC = plan('BASIC');
const PRO = plan('PROFESSIONAL');
const ORG = plan('ORGANIZATION');
const PAID = [BASIC, PRO, ORG];

const usd = (n) => `$${formatCount(n)}`;
const pct = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
const seats = (p) => p.block.paidSeats + p.block.freeSeats;
const freeReveals = FREE_PLAN_MONTHLY_CREDITS / CREDIT_COSTS.REVEAL;

// Monthly-billing cost of a DataPit plan for a team: enough blocks to seat
// everyone, ceil(people / seats per block), as the billing page pre-fills.
const blocksFor = (p, people) => Math.ceil(people / seats(p));
const TEAMS = [5, 10, 25];
const dataPitRow = (p) => [
  `DataPit ${p.name}, billed monthly`,
  ...TEAMS.map((n) => {
    const b = blocksFor(p, n);
    return `${usd(b * p.price)} (${b} ${b === 1 ? 'block' : 'blocks'})`;
  }),
];
const apolloRow = (label, perSeat) => [label, ...TEAMS.map((n) => usd(n * perSeat))];

// "a, b and c"
function joinList(items, word = 'and') {
  return items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

// What Apollo.io offers today that DataPit doesn't; phone data and sequence
// sending drop out of the list when their LIVE flags flip.
const apolloOnly = [
  !LIVE.sequenceSending && 'email sequences',
  'a dialer',
  !LIVE.phoneData && 'phone numbers',
  'intent data',
  'CRM integrations',
].filter(Boolean);
const heroOnly = [!LIVE.sequenceSending && 'email sequences', 'a dialer', 'CRM integrations'].filter(Boolean);

const emailCell = LIVE.emailVerification
  ? `${CREDIT_COSTS.REVEAL} credits a reveal, or ${CREDIT_COSTS.EXTENSION_REVEAL} from the extension. Where no email is on file, DataPit suggests a first.last address, checked by a verifier.`
  : `${CREDIT_COSTS.REVEAL} credits a reveal, or ${CREDIT_COSTS.EXTENSION_REVEAL} from the extension. Where no email is on file, DataPit suggests a first.last address. Emails aren’t verified yet.`;

export default {
  meta: {
    path: '/alternatives/apollo',
    section: 'alternatives',
    name: 'Apollo alternative',
    title: `Apollo Alternative for Teams, from $${BASIC.price} a Month | DataPit`,
    description: `Looking for an Apollo.io alternative? DataPit sells seats in blocks: $${BASIC.price} a month covers ${seats(BASIC)} people. Compare prices, credits and features, and when Apollo fits.`,
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'Apollo alternative',
    lines: ['An Apollo alternative', 'priced per team'],
    sub: `DataPit is an Apollo.io alternative for teams that mainly need to search contacts and reveal work emails. It’s priced per block of seats: Basic is $${BASIC.price} a month for ${BASIC.block.paidSeats} paid seats plus ${BASIC.block.freeSeats} free. Apollo.io does more, including ${joinList(heroOnly)}, from $${APOLLO.basic.annual} per seat a month billed annually.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `DataPit suits teams that want people search and email reveals at a price per team, with a Free plan of ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. Stay with Apollo.io if you need ${joinList(apolloOnly, 'or')} in the same tool.`,
    },

    { type: 'h2', text: 'Why do teams look for an Apollo.io alternative?' },
    {
      type: 'p',
      text: `Apollo.io is priced per seat, so its cost grows with every person you add. Basic is $${APOLLO.basic.annual} per seat a month billed annually, or $${APOLLO.basic.monthly} billed monthly. Professional is $${APOLLO.professional.annual} billed annually, or $${APOLLO.professional.monthly} monthly.`,
    },
    {
      type: 'p',
      text: `Organization is $${APOLLO.organization.annual} per seat a month, billed annually only, with a ${APOLLO.organization.minSeats}-seat minimum. Add-ons such as the Advanced Dialer cost $${APOLLO.addOn.annual} per team a month billed annually, or $${APOLLO.addOn.monthly} monthly.`,
    },
    {
      type: 'p',
      text: `Each seat carries its own credits. On monthly billing, Basic gives ${formatCount(APOLLO.basic.monthlyCredits)} credits per seat a month and Professional ${formatCount(APOLLO.professional.monthlyCredits)}. An email costs ${APOLLO.credits.email} credit and a phone number ${APOLLO.credits.phone}.`,
    },
    {
      type: 'p',
      text: `The Free plan gives ${APOLLO.free.monthlyCredits} credits per seat a month (${formatCount(APOLLO.free.yearCredits)} a year), ${APOLLO.free.sequences} sequences per team and a record selection limit of ${APOLLO.free.recordLimit}.`,
    },

    { type: 'h2', text: 'How does DataPit compare with Apollo.io?' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'Apollo.io'],
      rows: [
        [
          'Pricing model',
          `Per block of seats. Billed monthly, quarterly (${pct('QUARTER')}% off) or annually (${pct('YEAR')}% off).`,
          'Per seat, with credits per seat. Basic and Professional bill monthly or annually; Organization is annual only.',
        ],
        [
          'Lowest paid price',
          `$${BASIC.price} a month for a Basic block of ${BASIC.block.paidSeats} paid seats plus ${BASIC.block.freeSeats} free`,
          `$${APOLLO.basic.annual} per seat a month billed annually, or $${APOLLO.basic.monthly} billed monthly (Basic)`,
        ],
        [
          'Free plan',
          `1 user, ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month (${freeReveals} reveals)`,
          `${APOLLO.free.monthlyCredits} credits per seat a month, ${APOLLO.free.sequences} sequences per team, record selection limit of ${APOLLO.free.recordLimit}`,
        ],
        [
          'How seats are counted',
          `In blocks that include free seats: ${joinList(PAID.map((p) => `${seats(p)} on ${p.name}`))}. The owner takes a paid seat; anyone else can take a free one.`,
          `Every user is a seat. Organization needs at least ${APOLLO.organization.minSeats}.`,
        ],
        [
          'Credits',
          `Personal to each member. ${formatCount(BASIC.block.paidSeatCredits)} a month per paid seat on Basic, ${formatCount(PRO.block.paidSeatCredits)} on Professional and Organization, and ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat. Owners get a bonus on Professional and Organization.`,
          `${formatCount(APOLLO.basic.monthlyCredits)} per seat a month on Basic and ${formatCount(APOLLO.professional.monthlyCredits)} on Professional, billed monthly. Annual plans grant a year of credits upfront.`,
        ],
        ['Email finding', emailCell, `${APOLLO.credits.email} credit per email, on every plan`],
        [
          'Phone numbers',
          LIVE.phoneData ? 'Included in the same reveal, where the record has one' : 'Not yet',
          `${APOLLO.credits.phone} credits per number`,
        ],
        [
          'Chrome extension',
          `Free on the Chrome Web Store. Looks up LinkedIn profiles; a reveal costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
          'Free, on every plan',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending ? 'Yes, on paid plans' : 'Not yet',
          `${APOLLO.free.sequences} per team on Free; unlimited on paid plans`,
        ],
        ['Dialer', 'No', `US dialer on paid plans, at ${APOLLO.credits.dialerMinute} credits a minute`],
        ['CRM integrations', 'Not yet', 'Salesforce, HubSpot and Pipedrive, on every plan'],
        [
          'API',
          'No general API. API keys only connect the Chrome extension.',
          'REST API on every plan. Free has lower rate limits, and some endpoints may be restricted.',
        ],
      ],
    },
    { type: 'p', text: 'Apollo.io says it has 240M+ contacts and 30M+ accounts.' },
    { type: 'dataCoverage' },
    {
      type: 'p',
      text: 'For every plan’s price side by side and what one credit buys on each, see [DataPit vs Apollo.io](/compare/datapit-vs-apollo).',
    },

    { type: 'h2', text: 'What does Apollo.io cost for a team compared with DataPit?' },
    {
      type: 'p',
      text: `Here is the list price a month for teams of 5, 10 and 25 people on every paid plan of both tools. DataPit prices use monthly billing and enough blocks to seat everyone. Quarterly billing saves ${pct('QUARTER')}% and annual ${pct('YEAR')}%.`,
    },
    {
      type: 'table',
      caption: 'Price a month for the whole team, in US dollars',
      head: ['Plan', '5 people', '10 people', '25 people'],
      rows: [
        ...PAID.map(dataPitRow),
        apolloRow('Apollo.io Basic, billed monthly', APOLLO.basic.monthly),
        apolloRow('Apollo.io Basic, billed annually', APOLLO.basic.annual),
        apolloRow('Apollo.io Professional, billed monthly', APOLLO.professional.monthly),
        apolloRow('Apollo.io Professional, billed annually', APOLLO.professional.annual),
        apolloRow('Apollo.io Organization, billed annually', APOLLO.organization.annual),
      ],
      note: `Prices only: the plans don’t include the same things. Apollo.io paid seats carry more credits each, plus ${joinList(apolloOnly.filter((x) => x !== 'phone numbers' && x !== 'intent data'))}. Apollo.io prices are its per-seat price times team size, before tax.`,
    },

    { type: 'h2', text: 'When is Apollo.io the better choice?' },
    {
      type: 'list',
      items: [
        `**You want data, email and calling in one tool.** Apollo.io includes sequences on every plan and a US dialer on paid plans, at ${APOLLO.credits.dialerMinute} credits a minute. It also offers call recording and meeting scheduling, and paid plans add deal management.`,
        `**You need phone numbers.** A phone number costs ${APOLLO.credits.phone} Apollo.io credits, and paid plans add waterfall enrichment from 20+ partner providers to fill gaps.${LIVE.phoneData ? '' : ' DataPit has no phone numbers yet.'}`,
        '**Your team works in a CRM.** Apollo.io integrates with Salesforce, HubSpot and Pipedrive on every plan, and has a REST API. DataPit has no CRM integration or general API yet.',
        '**You use intent data.** Apollo.io includes Bombora buying-intent topics: 1 on Free, 6 on Basic and Professional, and 12 on Organization.',
        '**You need security reviews and SSO.** Apollo.io’s Trust Center lists SOC 2 and ISO/IEC 27001, and its Organization plan includes single sign-on.',
        '**You want a very large database.** Apollo.io says it has 240M+ contacts and 30M+ accounts.',
      ],
    },

    { type: 'h2', text: 'When does DataPit fit better?' },
    {
      type: 'list',
      items: [
        `**You’re paying for a team, not one person.** DataPit sells seats in blocks. Basic is $${BASIC.price} a month for ${BASIC.block.paidSeats} paid seats plus ${BASIC.block.freeSeats} free, so 10 people cost ${usd(blocksFor(BASIC, 10) * BASIC.price)} a month.`,
        `**Some people only search now and then.** Every block includes free seats: ${joinList(PAID.map((p) => `${p.block.freeSeats} on ${p.name}`))}. Anyone but the owner can take one, and each earns ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} credits a month.`,
        `**You want to start free.** The Free plan gives one user ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${freeReveals} reveals at ${CREDIT_COSTS.REVEAL} credits each. Apollo.io’s Free plan gives ${APOLLO.free.monthlyCredits} credits per seat a month.`,
        `**You want monthly billing on every plan.** Every paid DataPit plan has a public price, bills monthly and is self-serve up to ${MAX_SELF_SERVE_BLOCKS} blocks. Apollo.io’s Organization plan is billed annually only.`,
        `**You work from LinkedIn and CSV files, not a CRM.** The free [Chrome extension](/chrome-extension) looks up LinkedIn profiles in DataPit. A CSV export costs ${CREDIT_COSTS.CSV_EXPORT} credits per file of up to 5,000 rows, and contacts you haven’t revealed stay masked in it.`,
      ],
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit cheaper than Apollo.io?',
          a: `On paid plans, yes: DataPit Basic is $${BASIC.price} a month for up to ${seats(BASIC)} people. The same ${seats(BASIC)} people on Apollo.io Basic cost ${usd(seats(BASIC) * APOLLO.basic.monthly)} a month billed monthly, or ${usd(seats(BASIC) * APOLLO.basic.annual)} billed annually. The plans don’t include the same things, so compare features too.`,
        },
        {
          q: 'Does DataPit have a free plan?',
          a: `Yes: one user with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${freeReveals} reveals in the app or ${FREE_PLAN_MONTHLY_CREDITS / CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension. It includes people and company search, lists and CSV export. ${LIVE.sequenceSending ? 'Sequences and team features need a paid plan.' : 'Team features, like invites and shared seats, need a paid plan.'}`,
        },
        {
          q: 'Can I import my Apollo.io data into DataPit?',
          a: 'Not today. DataPit has no import for your own contacts or lists. You search DataPit’s database, build lists there and export them as CSV.',
        },
        {
          q: 'Does DataPit integrate with Salesforce or HubSpot?',
          a: `Not yet. DataPit has no CRM integrations, Zapier connection or webhooks today. To move contacts into a CRM, reveal them and export a CSV, which costs ${CREDIT_COSTS.CSV_EXPORT} credits per file.`,
        },
      ],
    },
    {
      type: 'cta',
      title: 'Try DataPit on the Free plan',
      text: `One user, ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. Upgrade to a seat block when your team joins.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        { label: 'ZoomInfo alternative', to: '/alternatives/zoominfo', text: 'DataPit and ZoomInfo compared.' },
        { label: 'Lusha alternative', to: '/alternatives/lusha', text: 'DataPit and Lusha compared.' },
        { label: 'Hunter alternative', to: '/alternatives/hunter', text: 'DataPit and Hunter compared.' },
        { label: 'Pricing', to: '/pricing', text: `A free plan, and seat blocks from $${BASIC.price} a month.` },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'Apollo.io pricing (plans, credits, add-ons and plan features)', url: 'https://www.apollo.io/pricing', checked: CHECKED },
        { label: 'Apollo.io homepage (database size claim)', url: 'https://www.apollo.io/', checked: CHECKED },
        { label: 'Apollo.io Chrome extension', url: 'https://www.apollo.io/product/chrome-extension', checked: CHECKED },
        { label: 'Apollo.io Sales Engagement (call recording, meeting scheduling)', url: 'https://www.apollo.io/product/sales-engagement', checked: CHECKED },
        { label: 'Apollo.io Waterfall Enrichment', url: 'https://www.apollo.io/product/waterfall', checked: CHECKED },
        { label: 'Apollo.io Knowledge Base: Buying Intent Overview', url: 'https://knowledge.apollo.io/hc/en-us/articles/8047704465933-Buying-Intent-Overview', checked: CHECKED },
        { label: 'Apollo.io API docs: Rate Limits', url: 'https://docs.apollo.io/reference/rate-limits', checked: CHECKED },
        { label: 'Apollo.io Trust Center', url: 'https://trust.apollo.io/', checked: CHECKED },
      ],
    },
  ],
};
