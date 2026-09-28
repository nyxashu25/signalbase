import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, MAX_SELF_SERVE_BLOCKS, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
} from '../../../data/plans.js';

// RocketReach facts below were read from rocketreach.co, its help center
// (knowledgebase.rocketreach.co) and its API docs (docs.rocketreach.co) on
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
const usd = (n) => `$${formatCount(Math.round(n))}`;

// RocketReach's single-seat list prices (rocketreach.co/pricing): the
// monthly-billing price per seat, and the per-seat price billed annually.
const RR = [
  { name: 'Essentials', monthly: 49, yearly: 329 },
  { name: 'Pro', monthly: 99, yearly: 829 },
  { name: 'Ultimate', monthly: 209, yearly: 1699 },
];
const rrMonthly = (people) => RR.map((p) => `${p.name}: ${usd(p.monthly * people)}`).join('. ') + '.';
const rrYearly = (people) =>
  RR.map((p) => `${p.name}: ${usd((p.yearly * people) / 12)} (${usd(p.yearly * people)} a year)`).join('. ') + '.';

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

// What RocketReach offers today that DataPit doesn't; phone data and email
// verification drop out of the list when their LIVE flags flip.
const rocketReachOnly = [
  !LIVE.phoneData && 'phone numbers',
  !LIVE.emailVerification && 'verified emails',
  'CRM sync',
  'an API',
].filter(Boolean);

// For the "Is DataPit cheaper?" answer: what every paid RocketReach plan
// includes, and what Pro and Ultimate add, that DataPit lacks today.
const rrEveryPaid = [
  !LIVE.emailVerification && 'verified emails',
  'a general-purpose API',
  !LIVE.sequenceSending && 'sequences that send email',
].filter(Boolean);
const rrProAdds = ['CRM integrations', !LIVE.phoneData && 'phone numbers'].filter(Boolean);

export default {
  meta: {
    path: '/alternatives/rocketreach',
    section: 'alternatives',
    name: 'RocketReach alternative',
    title: 'RocketReach Alternative: Pricing and Features | DataPit',
    description:
      'Compare DataPit and RocketReach on pricing, seats, credits and features. See what a team of 5, 10 or 25 costs, and when RocketReach is the better choice.',
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'RocketReach alternative',
    lines: ['A RocketReach', 'alternative for teams'],
    sub: `DataPit is a RocketReach alternative for teams that search people and reveal work emails, priced per seat block. DataPit ${BASIC.name} is $${BASIC.price} a month for ${blockSeats(BASIC)}, while RocketReach Essentials is $49 per seat a month, billed monthly. RocketReach is the better pick if you need ${joinList(rocketReachOnly)}.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `DataPit suits teams that want to search people and reveal work emails at one price for several seats. Seat blocks start at $${BASIC.price} a month, and every block includes free seats. Stay with RocketReach if you need ${joinList(rocketReachOnly)}, which DataPit doesn’t offer today.`,
    },

    { type: 'h2', text: 'Why do teams look for a RocketReach alternative?' },
    {
      type: 'p',
      text: 'RocketReach prices every paid self-serve plan per seat. Essentials is email only, at $49 per seat a month billed monthly, or $329 per seat a year billed annually. Phone numbers and CRM integrations start on Pro, at $99 per seat a month billed monthly, or $829 per seat a year billed annually.',
    },
    {
      type: 'p',
      text: 'Lookups are capped by plan. On monthly billing, Essentials includes 100 lookups a month, Pro 250 and Ultimate 1,000. Annual plans offer unlimited lookups under a 10,000-a-month fair-use cap, plus 1,200, 3,600 or 20,000 exports a year that don’t refill monthly.',
    },
    {
      type: 'p',
      text: 'The free account needs no credit card, and RocketReach’s pricing FAQ says it includes 5 free lookups. Its help center adds that free credits are email only and aren’t a monthly allowance.',
    },
    {
      type: 'p',
      text: 'With per-seat pricing, each person who needs access adds a seat to the bill. Larger teams can ask for a Custom team plan, which is quote only. RocketReach’s pricing page says these start at $6K a year.',
    },

    { type: 'h2', text: 'How do DataPit and RocketReach compare?' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'RocketReach'],
      rows: [
        [
          'Pricing model',
          'Seat blocks: one price for a set of paid seats plus free seats. Every plan’s price is published.',
          'Per seat, billed monthly or annually. Custom team plans are quote only.',
        ],
        [
          'Lowest paid price',
          `${BASIC.name}: $${BASIC.price} a month for ${blockSeats(BASIC)}. Quarterly billing saves ${pct('QUARTER')}% and annual ${pct('YEAR')}%.`,
          'Essentials: $49 per seat a month billed monthly, or $329 per seat a year billed annually ($27 a month).',
        ],
        [
          'Free plan',
          `1 seat, ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month (${formatCount(freeReveals)} reveals).`,
          '5 free lookups, according to the pricing FAQ. Email only, no credit card.',
        ],
        [
          'How seats are counted',
          `Per block: ${PAID.map((p) => `${p.name} ${p.block.paidSeats} paid + ${p.block.freeSeats} free`).join(', ')}. Anyone but the owner can take a free seat.`,
          'Per seat. The per-seat price drops as you add seats.',
        ],
        [
          'Credits',
          `Personal to each member: ${formatCount(BASIC.block.paidSeatCredits)} a month per paid seat on ${BASIC.name}, ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat. Owners get a bonus on ${PRO.name} and ${ORG.name}.`,
          'Monthly plans: 100, 250 or 1,000 lookups a month. Annual plans: unlimited lookups (10,000 a month fair use) plus 1,200, 3,600 or 20,000 exports a year.',
        ],
        [
          'Email finding',
          `Yes: ${CREDIT_COSTS.REVEAL} credits per reveal in the app, ${CREDIT_COSTS.EXTENSION_REVEAL} in the extension. Where no email is stored, a reveal returns a first.last@ guess at the company domain${LIVE.emailVerification ? ', checked with a verifier' : ', charged like any reveal and not verified yet'}.`,
          'Yes, on every plan. RocketReach says its emails are verified, and it refunds a lookup that returns no verified email or phone.',
        ],
        [
          'Phone numbers',
          LIVE.phoneData ? 'Included in the same reveal, where the record has one' : 'Not yet',
          'Pro and Ultimate: mobile and direct phone numbers. Not on Essentials or free accounts.',
        ],
        [
          'Chrome extension',
          `Yes, [free on the Chrome Web Store](${EXTENSION_STORE_URL}). It works on LinkedIn profiles; a reveal costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
          'Yes, free with any account, using lookup credits. It works on LinkedIn profiles, including Recruiter and Sales Navigator, and on most company websites with RocketReach Everywhere turned on.',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending ? 'Yes, on paid plans' : 'Not yet',
          'Yes, on every paid plan. Sequences send from your own Gmail or Outlook mailbox, up to 500 emails a day.',
        ],
        [
          'CRM integrations',
          'Not yet. Export contacts as CSV instead.',
          'Pro and Ultimate: Salesforce, HubSpot, Outreach, Salesloft and Bullhorn. Not on Essentials.',
        ],
        [
          'API',
          'No general-purpose API. API keys only connect the Chrome extension.',
          'Yes, on every paid plan, with rate limits published per plan.',
        ],
        ['Single sign-on', 'No', 'SAML single sign-on on Ultimate.'],
      ],
      note: 'RocketReach prices are in USD from its pricing page, for 1 seat. Where RocketReach offers both, the table gives monthly and annual billing.',
    },
    {
      type: 'p',
      text: 'RocketReach says it covers 700 million profiles and 60 million companies worldwide.',
    },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'What does RocketReach cost for a team compared with DataPit?' },
    {
      type: 'table',
      head: ['Team size', 'DataPit, billed monthly', 'RocketReach, billed monthly', 'RocketReach, billed annually (per month)'],
      rows: [
        ['5 people', dataPitCosts(5), rrMonthly(5), rrYearly(5)],
        ['10 people', dataPitCosts(10), rrMonthly(10), rrYearly(10)],
        ['25 people', dataPitCosts(25), rrMonthly(25), rrYearly(25)],
      ],
      caption: 'Monthly list price for a whole team',
      note: `Prices only: the plans don’t include the same credits or features. DataPit prices are for monthly billing; quarterly saves ${pct('QUARTER')}% and annual ${pct('YEAR')}%. RocketReach figures are its single-seat list prices times team size, and annual plans are paid upfront.`,
    },
    {
      type: 'p',
      text: 'RocketReach lowers the per-seat price as you add seats: with 2 seats, Essentials shows $43 per seat a month, billed monthly. It doesn’t publish the full discount schedule, so your team’s price can be lower than these figures. Its Custom team plans are quote only.',
    },
    {
      type: 'p',
      text: `A DataPit block holds ${seats(BASIC)} people on ${BASIC.name}, ${seats(PRO)} on ${PRO.name} and ${seats(ORG)} on ${ORG.name}. So the cheapest plan for your team depends on how its size fits the blocks. Self-serve checkout goes up to ${MAX_SELF_SERVE_BLOCKS} blocks, and larger teams go through sales.`,
    },
    {
      type: 'p',
      text: `What each seat gets differs too. A DataPit ${BASIC.name} paid seat earns ${formatCount(BASIC.block.paidSeatCredits)} credits a month, enough for ${formatCount(BASIC.block.paidSeatCredits / CREDIT_COSTS.REVEAL)} reveals in the app. One RocketReach Essentials seat on monthly billing includes 100 lookups a month.`,
    },

    { type: 'h2', text: 'When is RocketReach the better choice?' },
    {
      type: 'list',
      items: [
        !LIVE.phoneData &&
          '**You need phone numbers.** RocketReach Pro and Ultimate include mobile and direct phone numbers. DataPit has no phone data yet.',
        !LIVE.emailVerification &&
          '**You need verified emails today.** RocketReach says its emails are verified, and it refunds a lookup that returns no verified email or phone. DataPit doesn’t verify emails yet.',
        '**You want your CRM connected.** RocketReach Pro and Ultimate sync with Salesforce, HubSpot, Outreach, Salesloft and Bullhorn. DataPit has no CRM integrations.',
        LIVE.sequenceSending
          ? '**You want outreach from your own mailbox.** Every paid RocketReach plan sends sequences from your Gmail or Outlook mailbox, up to 500 emails a day. DataPit sequences send from a DataPit sender address.'
          : '**You want to send sequences today.** Every paid RocketReach plan includes sequences sent from your Gmail or Outlook mailbox, up to 500 emails a day. DataPit’s sequences don’t send email yet.',
        '**You build on an API.** Every paid RocketReach plan includes API access, and the docs cover bulk lookup, webhooks and an MCP server. DataPit has no general-purpose API.',
        '**You research heavily in the app.** Annual plans give unlimited lookups in the web app and the extension, under a 10,000-a-month fair-use cap. Exports, including API and integration use, stay limited.',
        '**You use intent data.** RocketReach lists Intent Topics on its Ultimate plan. DataPit has no intent data.',
        '**Database size matters most.** RocketReach says it covers 700 million profiles and 60 million companies. It describes its coverage of healthcare, legal, founders and technology as unique.',
        '**Your buyers ask for certifications.** RocketReach’s security page claims SOC 2 Type II and ISO 27001 certification. Ultimate adds SAML single sign-on, which DataPit doesn’t have.',
      ].filter(Boolean),
    },

    { type: 'h2', text: 'When does DataPit fit better?' },
    {
      type: 'list',
      items: [
        `**You’re paying for a team, not one seat.** ${BASIC.name} is $${BASIC.price} a month for ${blockSeats(BASIC)}. ${PRO.name} is $${PRO.price} for ${blockSeats(PRO)}, and ${ORG.name} is $${ORG.price} for ${blockSeats(ORG)}.`,
        `**Everyone gets their own credits.** Each paid seat earns ${formatCount(BASIC.block.paidSeatCredits)} credits a month on ${BASIC.name} or ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}, and free seats earn ${formatCount(FREE_SEAT_MONTHLY_CREDITS)}. Owners get an extra ${formatCount(PRO.block.ownerBonus)} a month on ${PRO.name} and ${formatCount(ORG.block.ownerBonus)} on ${ORG.name}.`,
        '**Your team shares reveals.** Once anyone in your workspace reveals a contact, the rest of the team can open it free, in the app or the [Chrome extension](/chrome-extension). Your workspace doesn’t pay twice for the same person.',
        `**You want a free plan that renews.** DataPit Free is 1 seat with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits every month, which is ${formatCount(freeReveals)} reveals at ${CREDIT_COSTS.REVEAL} credits each. RocketReach’s pricing FAQ lists 5 free lookups.`,
        `**You want a published price for the whole team.** Every paid DataPit plan has a published price per block, up to ${MAX_SELF_SERVE_BLOCKS} blocks at self-serve checkout. RocketReach publishes its self-serve seat prices, but not its full multi-seat discount schedule or Custom team plan prices.`,
        '**You want to see where credits go.** Every credit spend is recorded in a ledger with its reason and the member who spent it. Admins on paid plans can see spend per member and export it.',
      ],
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit cheaper than RocketReach?',
          a: `On list price, yes: DataPit ${BASIC.name} is $${BASIC.price} a month for up to ${seats(BASIC)} people, while five RocketReach Essentials seats cost ${usd(RR[0].monthly * 5)} billed monthly. But every paid RocketReach plan includes ${joinList(rrEveryPaid, 'and')}. Pro and Ultimate add ${joinList(rrProAdds, 'and')}, and DataPit has none of these today.`,
        },
        {
          q: 'Does DataPit have a free plan?',
          a: `Yes. The Free plan is 1 seat with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${formatCount(freeReveals)} reveals in the app. It includes people and company search, lists, CSV export and the Chrome extension; sequences and team features need a paid plan.`,
        },
        {
          q: 'Can I import my RocketReach data into DataPit?',
          a: 'No. DataPit has no way to upload your own contact files today, from RocketReach or anywhere else. You build lists from DataPit search results and can export them as CSV.',
        },
        {
          q: 'Does DataPit have phone numbers like RocketReach?',
          a: LIVE.phoneData
            ? 'Yes, where the record has one. A reveal unlocks the phone number along with the email, for the same credits.'
            : 'Not yet. DataPit doesn’t have phone data today, so if you need direct dials, RocketReach Pro or Ultimate is the better choice for now.',
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
        { label: 'Hunter alternative', to: '/alternatives/hunter', text: 'How DataPit compares with Hunter on price, seats and features.' },
        { label: 'Lusha alternative', to: '/alternatives/lusha', text: 'How DataPit compares with Lusha on price, seats and features.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${BASIC.price} a month, and a free plan.` },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'RocketReach pricing: plans, seat prices, lookups, exports, phones, integrations, API, intent, SSO and FAQ', url: 'https://rocketreach.co/pricing', checked: CHECKED },
        { label: 'RocketReach homepage: database size and coverage claims', url: 'https://rocketreach.co/', checked: CHECKED },
        { label: 'RocketReach help center: What are RocketReach credits?', url: 'https://knowledgebase.rocketreach.co/hc/en-us/articles/23024457785243-What-are-RocketReach-Credits', checked: CHECKED },
        { label: 'RocketReach help center: How do Unlimited Lookup plans work?', url: 'https://knowledgebase.rocketreach.co/hc/en-us/articles/28936676766363-How-do-Unlimited-Lookup-plans-work', checked: CHECKED },
        { label: 'RocketReach help center: How does the browser extension work?', url: 'https://knowledgebase.rocketreach.co/hc/en-us/articles/230561248-How-does-the-RocketReach-Browser-Extension-work', checked: CHECKED },
        { label: 'RocketReach Messages: email sequences', url: 'https://rocketreach.co/resources/products/messages/', checked: CHECKED },
        { label: 'RocketReach API docs: overview', url: 'https://docs.rocketreach.co/reference/rocketreach-api', checked: CHECKED },
        { label: 'RocketReach API docs: rate limits', url: 'https://docs.rocketreach.co/reference/rate-limits', checked: CHECKED },
        { label: 'RocketReach security: certifications and SSO', url: 'https://rocketreach.co/resources/security/', checked: CHECKED },
      ],
    },
  ],
};
