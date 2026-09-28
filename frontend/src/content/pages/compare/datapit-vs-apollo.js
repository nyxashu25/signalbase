import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
  WELCOME_GIFT_CREDITS,
} from '../../../data/plans.js';

// Apollo.io facts below were read on apollo.io, its docs, knowledge base,
// Trust Center and Chrome Web Store listing on 2026-09-28. Every one is
// listed in the sources block.
const CHECKED = '2026-09-28';

// Apollo.io list prices in USD per seat per month, and credits per seat,
// from https://www.apollo.io/pricing. Organization is sold annually only.
const APOLLO = {
  free: { monthlyCredits: 75, yearCredits: 900, sequences: 2, dailySends: 250 },
  basic: { monthly: 65, annual: 49, monthlyCredits: 2500, yearCredits: 30000 },
  professional: { monthly: 99, annual: 79, monthlyCredits: 4000, yearCredits: 48000 },
  organization: { annual: 119, minSeats: 3, monthlyCredits: 6000, yearCredits: 72000 },
  addOn: { monthly: 149, annual: 119 }, // Advanced Dialer, per team
  annualSaving: 24, // the pricing page's annual toggle label
  credits: { email: 1, phone: 8, dialerMinute: 2, enrichMin: 1, enrichMax: 8, research: 1 },
};

const plan = (key) => PLANS.find((p) => p.key === key);
const FREE = plan('FREE');
const BASIC = plan('BASIC');
const PRO = plan('PROFESSIONAL');
const ORG = plan('ORGANIZATION');
const PAID = [BASIC, PRO, ORG];

const usd = (n) => (Number.isInteger(n) ? `$${formatCount(n)}` : `$${n.toFixed(2)}`);
const discount = (key) => BILLING_INTERVALS.find((i) => i.key === key).discount;
const pct = (key) => Math.round(discount(key) * 100);
const seats = (p) => p.block.paidSeats + p.block.freeSeats;
const blocksFor = (p, people) => Math.ceil(people / seats(p));
const reveals = (credits) => formatCount(Math.floor(credits / CREDIT_COSTS.REVEAL));
const phones = (credits) => formatCount(Math.floor(credits / APOLLO.credits.phone));

// Credits a whole block earns in a month, before the owner bonus.
const blockCredits = (p) =>
  p.block.paidSeats * p.block.paidSeatCredits + p.block.freeSeats * FREE_SEAT_MONTHLY_CREDITS;

// "a, b and c"
function joinList(items, word = 'and') {
  return items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

const dataPitPlanRow = (p) => [
  `DataPit ${p.name}`,
  `${usd(p.price)} a month per block`,
  `${usd(Math.round(p.price * (1 - discount('YEAR')) * 100) / 100)} a month per block`,
  `${p.block.paidSeats} paid + ${p.block.freeSeats} free per block`,
  `${formatCount(p.block.paidSeatCredits)} a month per paid seat, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat${p.block.ownerBonus ? `, plus a ${formatCount(p.block.ownerBonus)} owner bonus` : ''}`,
];

const emailCell = LIVE.emailVerification
  ? `${CREDIT_COSTS.REVEAL} credits a reveal in the app, ${CREDIT_COSTS.EXTENSION_REVEAL} from the extension. Where no email is on file, DataPit suggests a first.last address, checked by a verifier; a reveal the verifier rejects is refunded.`
  : `${CREDIT_COSTS.REVEAL} credits a reveal in the app, ${CREDIT_COSTS.EXTENSION_REVEAL} from the extension. Where no email is on file, DataPit suggests a first.last address. Emails aren’t verified yet.`;

const dataPitGaps = [
  'no dialer',
  'no CRM integration',
  'no general API',
  !LIVE.phoneData && 'no phone numbers',
  !LIVE.sequenceSending && 'no sequence sending',
].filter(Boolean);

export default {
  meta: {
    path: '/compare/datapit-vs-apollo',
    section: 'compare',
    name: 'DataPit vs Apollo',
    title: 'DataPit vs Apollo.io: Pricing, Credits and Features',
    description:
      'DataPit vs Apollo.io side by side: every plan’s price, what one credit buys on each, a feature-by-feature table and who each tool is for.',
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'DataPit vs Apollo.io',
    lines: ['DataPit', 'vs Apollo.io'],
    sub: `DataPit and Apollo.io both let you search B2B contacts and reveal work emails. Apollo.io is a wider sales platform, priced per seat, with sequences, a dialer and CRM integrations. DataPit is priced per block of seats: 10 people cost ${usd(blocksFor(BASIC, 10) * BASIC.price)} a month on Basic, against ${usd(10 * APOLLO.basic.annual)} or more on Apollo.io’s paid plans.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Pick DataPit if the price per team matters most and you mainly need search, email reveals and CSV lists. Pick Apollo.io if you want data, outreach, calling and CRM sync in one tool, and a per-seat price fits your budget.',
    },

    { type: 'h2', text: 'What is the difference between DataPit and Apollo.io?' },
    {
      type: 'p',
      text: 'Apollo.io is a sales platform: a B2B database plus email sequences, a dialer, meeting scheduling and CRM integrations. It charges per seat, and each seat gets its own credit allowance.',
    },
    {
      type: 'p',
      text: 'DataPit is a contact data workspace. You search people and companies, reveal work emails for credits and export lists as CSV. It charges per block of seats, and every block includes free seats.',
    },
    { type: 'p', text: 'Apollo.io says it has 240M+ contacts and 30M+ accounts.' },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'How do DataPit and Apollo.io plans compare?' },
    {
      type: 'table',
      caption: 'List prices in US dollars',
      head: ['Plan', 'Billed monthly', 'Billed annually', 'Seats', 'Credits'],
      rows: [
        ['DataPit Free', '$0', '$0', '1 user', `${formatCount(FREE_PLAN_MONTHLY_CREDITS)} a month`],
        ...PAID.map(dataPitPlanRow),
        [
          'Apollo.io Free',
          '$0',
          '$0',
          'Per seat',
          `${APOLLO.free.monthlyCredits} per seat a month (${formatCount(APOLLO.free.yearCredits)} a year)`,
        ],
        [
          'Apollo.io Basic',
          `$${APOLLO.basic.monthly} per seat a month`,
          `$${APOLLO.basic.annual} per seat a month`,
          'Per seat',
          `${formatCount(APOLLO.basic.monthlyCredits)} per seat a month, or ${formatCount(APOLLO.basic.yearCredits)} a year upfront on annual billing`,
        ],
        [
          'Apollo.io Professional',
          `$${APOLLO.professional.monthly} per seat a month`,
          `$${APOLLO.professional.annual} per seat a month`,
          'Per seat',
          `${formatCount(APOLLO.professional.monthlyCredits)} per seat a month, or ${formatCount(APOLLO.professional.yearCredits)} a year upfront on annual billing`,
        ],
        [
          'Apollo.io Organization',
          'Not offered',
          `$${APOLLO.organization.annual} per seat a month`,
          `Per seat, ${APOLLO.organization.minSeats} minimum`,
          `${formatCount(APOLLO.organization.yearCredits)} per seat a year, upfront`,
        ],
      ],
      note: `Annual prices are shown per month but charged a year at a time. DataPit quarterly and annual invoices also grant their months of credits at once. Apollo.io prices exclude taxes.`,
    },
    {
      type: 'p',
      text: `DataPit bills monthly, quarterly (${pct('QUARTER')}% off) or annually (${pct('YEAR')}% off). Apollo.io bills Basic and Professional monthly or annually, and its pricing page says annual billing saves ${APOLLO.annualSaving}%. Organization is annual only.`,
    },
    {
      type: 'p',
      text: `A DataPit block seats ${joinList(PAID.map((p) => `${seats(p)} people on ${p.name}`))}. The owner takes a paid seat, and anyone else can take a free one. For totals at 5, 10 and 25 people, see [the Apollo alternative page](/alternatives/apollo).`,
    },

    { type: 'h2', text: 'What does one credit buy on DataPit and on Apollo.io?' },
    {
      type: 'table',
      head: ['What you get', 'DataPit', 'Apollo.io'],
      rows: [
        [
          'A work email',
          `${CREDIT_COSTS.REVEAL} credits in the app, ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension`,
          `${APOLLO.credits.email} credit`,
        ],
        [
          'A phone number',
          LIVE.phoneData ? 'Included in the email reveal, where the record has one' : 'Not available yet',
          `${APOLLO.credits.phone} credits for a personal number; HQ and corporate numbers cost none`,
        ],
        ['A minute on the US dialer', 'No dialer', `${APOLLO.credits.dialerMinute} credits`],
        ['Enriching a record', 'Not offered', `${APOLLO.credits.enrichMin} to ${APOLLO.credits.enrichMax} credits`],
        ['An AI research run', 'Not offered', `${APOLLO.credits.research} credit`],
      ],
    },
    {
      type: 'p',
      text: `Searching people and companies costs nothing on DataPit. A company’s full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time your workspace opens it. A CSV export costs ${CREDIT_COSTS.CSV_EXPORT} per file, up to 5,000 rows${LIVE.sequenceSending ? `, and a sequence enrollment ${CREDIT_COSTS.SEQUENCE_ENROLLMENT} per contact` : ''}.`,
    },
    {
      type: 'p',
      text: 'Two rules shape DataPit’s costs. Once anyone in your workspace reveals a contact, it’s free for everyone else in it. Credits are personal to each member, and the owner can transfer credits to a member.',
    },

    { type: 'h2', text: 'How many credits do you get on DataPit and Apollo.io?' },
    {
      type: 'table',
      head: ['Seat', 'Credits a month', 'What they buy'],
      rows: [
        [
          `DataPit ${FREE.name} plan (1 user)`,
          formatCount(FREE_PLAN_MONTHLY_CREDITS),
          `${reveals(FREE_PLAN_MONTHLY_CREDITS)} reveals`,
        ],
        [
          `DataPit ${BASIC.name}, paid seat`,
          formatCount(BASIC.block.paidSeatCredits),
          `${reveals(BASIC.block.paidSeatCredits)} reveals`,
        ],
        [
          `DataPit ${PRO.name} or ${ORG.name}, paid seat`,
          formatCount(PRO.block.paidSeatCredits),
          `${reveals(PRO.block.paidSeatCredits)} reveals`,
        ],
        [
          'DataPit free seat, any paid plan',
          formatCount(FREE_SEAT_MONTHLY_CREDITS),
          `${reveals(FREE_SEAT_MONTHLY_CREDITS)} reveals`,
        ],
        ...[
          ['Apollo.io Free seat', APOLLO.free.monthlyCredits],
          ['Apollo.io Basic seat', APOLLO.basic.monthlyCredits],
          ['Apollo.io Professional seat', APOLLO.professional.monthlyCredits],
          ['Apollo.io Organization seat', APOLLO.organization.monthlyCredits],
        ].map(([label, credits]) => [
          label,
          formatCount(credits),
          `${formatCount(credits / APOLLO.credits.email)} emails, or ${phones(credits)} phone numbers`,
        ]),
      ],
      note: `Apollo.io allowances are for monthly billing; Organization is annual only, at ${formatCount(APOLLO.organization.yearCredits)} credits per seat a year. DataPit owner bonuses and the one-time ${formatCount(WELCOME_GIFT_CREDITS)}-credit welcome gift for each newly covered member aren’t included.`,
    },
    {
      type: 'p',
      text: `Per paid seat, Apollo.io gives more credits, and an email costs ${APOLLO.credits.email} credit rather than ${CREDIT_COSTS.REVEAL}. Per team, the numbers change: a $${BASIC.price} DataPit Basic block earns ${formatCount(blockCredits(BASIC))} credits a month across ${seats(BASIC)} people, or ${reveals(blockCredits(BASIC))} reveals. One Apollo.io Basic seat at $${APOLLO.basic.monthly} a month earns ${formatCount(APOLLO.basic.monthlyCredits)}.`,
    },

    { type: 'h2', text: 'How do DataPit and Apollo.io features compare?' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'Apollo.io'],
      rows: [
        [
          'People and company search',
          'Every plan, free to run. Filters for job title, company, seniority, department, and company industry and location.',
          'Every plan; Free has basic filters',
        ],
        ['Work emails', emailCell, `${APOLLO.credits.email} credit per email. Apollo.io says it runs seven-step email verification.`],
        [
          'Phone numbers',
          LIVE.phoneData ? 'Included in the reveal, where the record has one. No phone finder.' : 'Not yet',
          `${APOLLO.credits.phone} credits per personal number`,
        ],
        ['Waterfall enrichment', 'No', 'Paid plans, from 20+ partner providers'],
        [
          'Chrome extension',
          `[Free on the Chrome Web Store](${EXTENSION_STORE_URL}). Looks up LinkedIn profiles; a reveal costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
          'Free on every plan. Works in Gmail, Google Calendar, Salesforce, HubSpot and company websites.',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending
            ? `Paid plans, with email and wait steps. ${CREDIT_COSTS.SEQUENCE_ENROLLMENT} credits per contact enrolled.`
            : 'Not yet',
          `${APOLLO.free.sequences} per team on Free, unlimited on paid plans. Professional adds A/Z testing and unlimited sends.`,
        ],
        [
          'Dialer',
          'No',
          `US dialer on paid plans. The Advanced Dialer add-on is $${APOLLO.addOn.annual} per team a month billed annually, or $${APOLLO.addOn.monthly} monthly.`,
        ],
        ['Intent data', 'No', 'Bombora topics: 1 on Free, 6 on Basic and Professional, 12 on Organization'],
        ['CRM integrations', 'Not yet', 'Salesforce, HubSpot and Pipedrive, on every plan'],
        [
          'API',
          'No general API. API keys only connect the Chrome extension.',
          'REST API on every plan. Free has lower rate limits, and some endpoints may be restricted.',
        ],
        ['AI assistants (MCP)', 'No', 'Connector for Claude, ChatGPT and Perplexity, on every plan'],
        ['Single sign-on', 'No', 'Organization plan'],
      ],
    },

    { type: 'h2', text: 'Who should choose Apollo.io?' },
    {
      type: 'p',
      text: 'Teams that want to find, email and call prospects from one tool, with their CRM kept in sync. The per-seat price buys a wider product: sequences, a dialer, call recording, intent data and native CRM integrations.',
    },
    {
      type: 'p',
      text: 'It also fits teams that need phone numbers, vendor security paperwork or SSO. Apollo.io’s Trust Center lists SOC 2 and ISO/IEC 27001, and SSO comes with the Organization plan.',
    },

    { type: 'h2', text: 'Who should choose DataPit?' },
    {
      type: 'p',
      text: `Teams that mainly need to search contacts and reveal work emails, and want the price to follow the team rather than each seat. A ${PRO.name} block seats ${seats(PRO)} people for $${PRO.price} a month.`,
    },
    {
      type: 'p',
      text: `It suits teams with occasional users, who can sit in free seats. It also suits anyone who wants to start on a Free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. Choose it knowing what it doesn’t do: ${joinList(dataPitGaps)}.`,
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is Apollo.io or DataPit better for a small team?',
          a: `For search and email reveals, DataPit’s paid plans cost less. A team of 5 pays $${BASIC.price} a month on DataPit Basic, against ${usd(5 * APOLLO.basic.annual)} or more on Apollo.io’s paid plans. If you also need calling, CRM sync or intent data, Apollo.io covers them and DataPit doesn’t.`,
        },
        {
          q: 'Is Apollo.io free?',
          a: `Apollo.io has a Free plan with ${APOLLO.free.monthlyCredits} credits per seat a month, ${APOLLO.free.sequences} sequences per team and ${APOLLO.free.dailySends} email sends a day. Basic and Professional also offer a 14-day trial. DataPit’s Free plan gives one user ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
        },
        {
          q: 'Which uses fewer credits per email, DataPit or Apollo.io?',
          a: `Apollo.io. An email costs ${APOLLO.credits.email} Apollo.io credit, against ${CREDIT_COSTS.REVEAL} for a DataPit reveal in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the extension. Allowances and prices differ too, so compare what your whole team’s credits buy.`,
        },
        {
          q: 'Does DataPit have a dialer or email sequences like Apollo.io?',
          a: LIVE.sequenceSending
            ? `DataPit has no dialer. It has email sequences on paid plans, and enrolling a contact costs ${CREDIT_COSTS.SEQUENCE_ENROLLMENT} credits.`
            : 'DataPit has no dialer, and it doesn’t send sequence emails yet. Apollo.io has both: sequences on every plan and a US dialer on paid plans.',
        },
        {
          q: 'Does DataPit have an API like Apollo.io?',
          a: 'No. DataPit API keys only connect the Chrome extension, and there is no general API for search or lists. Apollo.io has a REST API on every plan, though Free has lower rate limits and some endpoints may be restricted.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'See if DataPit fits your team',
      text: `Start on the Free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, then add a seat block when you need one.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        { label: 'Apollo alternative', to: '/alternatives/apollo', text: 'Team prices at 5, 10 and 25 people.' },
        { label: 'DataPit vs ZoomInfo', to: '/compare/datapit-vs-zoominfo', text: 'The same comparison for ZoomInfo.' },
        { label: 'Chrome extension', to: '/chrome-extension', text: 'Look up LinkedIn profiles in DataPit.' },
        { label: 'Pricing', to: '/pricing', text: `A free plan, and seat blocks from $${BASIC.price} a month.` },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'Apollo.io pricing (plans, credits, add-ons and plan features)', url: 'https://www.apollo.io/pricing', checked: CHECKED },
        { label: 'Apollo.io homepage (database size claim)', url: 'https://www.apollo.io/', checked: CHECKED },
        { label: 'Apollo.io B2B Data (email verification claim)', url: 'https://www.apollo.io/product/b2b-data', checked: CHECKED },
        { label: 'Apollo.io Knowledge Base: Access a Prospect’s Phone Number', url: 'https://knowledge.apollo.io/hc/en-us/articles/31969477982221-Access-a-Prospect-s-Phone-Number', checked: CHECKED },
        { label: 'Apollo.io Chrome extension', url: 'https://www.apollo.io/product/chrome-extension', checked: CHECKED },
        { label: 'Chrome Web Store: Apollo.io extension listing', url: 'https://chromewebstore.google.com/detail/apolloio-email-finder-and/alhgpfoeiimagjlnfekdhkjlkiomcapa', checked: CHECKED },
        { label: 'Apollo.io Sales Engagement (call recording, meeting scheduling)', url: 'https://www.apollo.io/product/sales-engagement', checked: CHECKED },
        { label: 'Apollo.io Waterfall Enrichment', url: 'https://www.apollo.io/product/waterfall', checked: CHECKED },
        { label: 'Apollo.io Knowledge Base: Buying Intent Overview', url: 'https://knowledge.apollo.io/hc/en-us/articles/8047704465933-Buying-Intent-Overview', checked: CHECKED },
        { label: 'Apollo.io API docs: Rate Limits', url: 'https://docs.apollo.io/reference/rate-limits', checked: CHECKED },
        { label: 'Apollo.io MCP', url: 'https://www.apollo.io/product/mcp', checked: CHECKED },
        { label: 'Apollo.io Trust Center', url: 'https://trust.apollo.io/', checked: CHECKED },
      ],
    },
  ],
};
