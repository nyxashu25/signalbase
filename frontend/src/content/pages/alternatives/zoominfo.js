import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
} from '../../../data/plans.js';

// ZoomInfo facts come from ZoomInfo's own public pages (and GTM AI, its API
// product), read on this date. Every ZoomInfo price or feature below has its
// page in the sources block. ZoomInfo publishes no price for any platform plan.
const CHECKED = '2026-09-28';

const plan = (key) => PLANS.find((p) => p.key === key);
const BASIC = plan('BASIC');
const PRO = plan('PROFESSIONAL');
const ORG = plan('ORGANIZATION');
const FREE_REVEALS = FREE_PLAN_MONTHLY_CREDITS / CREDIT_COSTS.REVEAL;
const pct = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
const seatsPerBlock = (p) => p.block.paidSeats + p.block.freeSeats;
const blockSeats = (p) => `${p.block.paidSeats} paid + ${p.block.freeSeats} free`;

// Monthly-billing cost of seating n people on plan p: anyone but the owner can
// take a free seat, so a block seats paid + free people.
const blocksFor = (p, n) => Math.ceil(n / seatsPerBlock(p));
const teamPrice = (p, n) => `$${formatCount(p.price * blocksFor(p, n))} a month`;
function teamCost(p, n) {
  const blocks = blocksFor(p, n);
  return `${teamPrice(p, n)} (${blocks} ${blocks === 1 ? 'block' : 'blocks'})`;
}

export default {
  meta: {
    path: '/alternatives/zoominfo',
    section: 'alternatives',
    name: 'ZoomInfo alternative',
    title: 'ZoomInfo Alternative: Public Prices, Free Plan | DataPit',
    description: `DataPit is a ZoomInfo alternative with published prices: a free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month and seat blocks from $${BASIC.price} a month. See team costs and trade-offs.`,
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'ZoomInfo alternative',
    lines: ['A ZoomInfo alternative', 'with public prices'],
    sub: `DataPit is a ZoomInfo alternative with published prices: a free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month and seat blocks from $${BASIC.price} a month. ZoomInfo sells its platform plans by quote, and its pricing guide says they’re annual subscriptions. ZoomInfo does more, with intent data, a dialer and CRM integrations.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `DataPit fits small teams and founders who want public prices, a free plan and a monthly bill for people search and email reveals. ZoomInfo is the better choice if you depend on intent data, a built-in dialer or CRM integrations, which DataPit doesn’t have. The ZoomInfo details below come from its own pages, checked on 28 September 2026.`,
    },

    { type: 'h2', text: 'Why do teams look for a ZoomInfo alternative?' },
    {
      type: 'p',
      text: 'ZoomInfo doesn’t publish a price for any of its platform plans. Its Sales plans (Professional, Copilot Advanced and Copilot Enterprise) and Marketing plans (Demand, ABM Lite and ABM Enterprise) are all quote-only. Its pricing page says the price depends on features, the number of licenses and credit usage.',
    },
    {
      type: 'p',
      text: 'ZoomInfo’s own pricing guide says paid plans are annual subscriptions with a minimum number of seats, and that monthly billing is not standard. Its pricing page says the sales team will work with you on payment frequency and options.',
    },
    {
      type: 'p',
      text: 'The free tier, ZoomInfo Lite, needs no credit card or annual commitment, and each reveal uses one credit. Its pricing guide says Lite includes 10 credits a month, or 25 with Community Edition. You join the Community by connecting your business email account, and ZoomInfo says members contribute the business contacts in it.',
    },
    {
      type: 'p',
      text: 'One ZoomInfo product does publish prices: GTM AI, its API, MCP and CLI product. Its self-serve tier is pay as you go, with credit top-ups from $20 and no seat fees.',
    },

    { type: 'h2', text: 'How does DataPit compare with ZoomInfo?' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'ZoomInfo'],
      rows: [
        [
          'Pricing model',
          `Published prices. Paid plans are sold in seat blocks, billed monthly, quarterly (${pct('QUARTER')}% off) or annually (${pct('YEAR')}% off).`,
          'Quote only, for every platform plan. The price depends on features, licenses and credit usage.',
        ],
        [
          'Lowest paid price',
          `$${BASIC.price} a month for a ${BASIC.name} block (${blockSeats(BASIC)} seat).`,
          'Not published. GTM AI, the API product, sells credit top-ups from $20.',
        ],
        [
          'Free plan',
          `Yes: 1 seat and ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
          'ZoomInfo Lite: 10 credits a month, or 25 with Community Edition, per its pricing guide.',
        ],
        [
          'How seats are counted',
          `By block. ${BASIC.name} is ${blockSeats(BASIC)} seat per block, ${PRO.name} ${blockSeats(PRO)}, ${ORG.name} ${blockSeats(ORG)}.`,
          'By license. The pricing guide says paid plans have a minimum number of seats. No seat price is published.',
        ],
        [
          'Credits',
          `Personal monthly credits by seat: ${formatCount(BASIC.block.paidSeatCredits)} per paid seat on ${BASIC.name}, ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat. Owners get a bonus on ${PRO.name} and ${ORG.name}.`,
          'A set number of monthly credits per package, based on your needs. One credit per contact or company profile exported.',
        ],
        [
          'Email finding',
          `Yes. A reveal costs ${CREDIT_COSTS.REVEAL} credits and shows the work email on file. With none on file, DataPit makes ${LIVE.emailVerification ? 'one first.last@ guess and checks it with a verifier' : 'one unverified first.last@ guess'}.`,
          'Business emails on Lite, at 1 credit per reveal, and on the Sales plans.',
        ],
        [
          'Phone numbers',
          LIVE.phoneData ? 'In a reveal, where the record has one. No dialer.' : 'Not yet.',
          'Mobile numbers and intelligent dialing on Professional. Lite reveals include a direct or in-office phone number.',
        ],
        [
          'Chrome extension',
          `Yes, [free on the Chrome Web Store](${EXTENSION_STORE_URL}). It works on LinkedIn profiles, and a reveal costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
          'Yes, ReachOut, free for ZoomInfo customers. It works on LinkedIn, company sites, your CRM and your inbox.',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending ? 'Yes, on paid plans.' : 'Not yet.',
          'Engage, with sequences and a dialer, is an add-on to base plans. Copilot Advanced adds workflows for automated outreach.',
        ],
        [
          'CRM integrations',
          'Not yet. Export lists to CSV instead.',
          'Salesforce, HubSpot and more on Professional. ZoomInfo says pre-packaged integrations typically have a base cost.',
        ],
        [
          'API',
          'No. API keys only connect the Chrome extension.',
          'An Enterprise API, by demo. GTM AI adds self-serve API, MCP and CLI access, pay as you go.',
        ],
        [
          'Intent data',
          'No.',
          'On Copilot Advanced and above, and on the Marketing plans.',
        ],
      ],
      note: 'ZoomInfo details are from its pricing page, pricing guide and product pages, checked 28 September 2026. ZoomInfo doesn’t publish credit amounts for its Sales plans.',
    },
    {
      type: 'p',
      text: 'ZoomInfo says it has 500M+ contacts and 100M+ companies. That’s ZoomInfo’s own claim, and the figures differ across its pages.',
    },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'What does ZoomInfo cost for a team compared with DataPit?' },
    {
      type: 'table',
      caption: 'Monthly cost by team size',
      head: ['Team size', `DataPit ${BASIC.name}`, `DataPit ${PRO.name}`, `DataPit ${ORG.name}`, 'ZoomInfo Sales plans'],
      rows: [5, 10, 25].map((n) => [
        `${n} people`,
        teamCost(BASIC, n),
        teamCost(PRO, n),
        teamCost(ORG, n),
        'Quote only',
      ]),
      note: `Prices only: the plans don’t include the same things. DataPit prices are at monthly billing, and a block seats ${seatsPerBlock(BASIC)} on ${BASIC.name}, ${seatsPerBlock(PRO)} on ${PRO.name} and ${seatsPerBlock(ORG)} on ${ORG.name}. ZoomInfo publishes no Sales plan prices, and its pricing guide says they’re billed annually.`,
    },
    {
      type: 'p',
      text: 'GTM AI, ZoomInfo’s API product, charges no seat fees on its pay-as-you-go tier, so you pay for credits rather than people. A data credit costs $0.45 at the base tier, down to $0.25 at the $25,000 spend tier. AI credits are $0.05 each.',
    },

    { type: 'h2', text: 'When is ZoomInfo the better choice?' },
    {
      type: 'list',
      items: [
        '**You need intent data.** Copilot Advanced includes buyer intent signals, and the Marketing plans include 25 to unlimited intent topics. DataPit has no intent data.',
        `**You call prospects.** Professional includes mobile numbers and intelligent dialing, and the Engage add-on adds sequences and a dialer. ${LIVE.phoneData ? 'DataPit has no dialer.' : 'DataPit has no phone data yet, and no dialer.'}`,
        '**Your team works in a CRM.** ZoomInfo’s plans connect to Salesforce, HubSpot, Marketo, Dynamics, Outreach, Salesloft and more. DataPit has no CRM integration yet.',
        '**You want an API or AI-agent access.** ZoomInfo offers an Enterprise API, and GTM AI gives 1,000 free data credits at signup for its API, MCP and CLI. DataPit has no general API.',
        '**You have a security review to pass.** ZoomInfo states SOC 2 Type II, ISO 27001, ISO 27701 and TRUSTe certification, plus GDPR and CCPA compliance.',
        '**You want sales and marketing data from one vendor.** ZoomInfo’s packages add ABM advertising, website visitor identification, workflows and conversation intelligence.',
        '**You want researched data at scale.** ZoomInfo says its data is checked by machine learning, third-party partners and 300+ human researchers.',
      ],
    },

    { type: 'h2', text: 'When does DataPit fit better?' },
    {
      type: 'list',
      items: [
        '**You want the price before a sales call.** DataPit’s prices are public on the [pricing page](/pricing), and every paid plan can be billed monthly.',
        `**Your team is small, or growing.** A ${BASIC.name} block is ${BASIC.block.paidSeats} paid seats plus ${BASIC.block.freeSeats} free for $${BASIC.price} a month. Every block includes free seats, and each earns ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} credits a month.`,
        `**Everyone gets their own credits.** Each paid seat earns ${formatCount(BASIC.block.paidSeatCredits)} credits a month on ${BASIC.name} or ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}. The owner gets a monthly bonus of ${formatCount(PRO.block.ownerBonus)} on ${PRO.name} or ${formatCount(ORG.block.ownerBonus)} on ${ORG.name}, and can transfer credits to teammates.`,
        `**You pay for a contact once per team.** A reveal costs ${CREDIT_COSTS.REVEAL} credits. Once anyone on your team reveals a contact, it’s free for the whole workspace.`,
        `**You want to start free.** The Free plan gives one person ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for up to ${formatCount(FREE_REVEALS)} reveals in the app.`,
        `**You prospect on LinkedIn.** The [DataPit Chrome extension](/chrome-extension) checks the profile you’re viewing against DataPit. A reveal from the extension costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits.`,
        `**You work from spreadsheets.** A CSV export costs ${CREDIT_COSTS.CSV_EXPORT} credits per file, up to 5,000 rows. Contacts you haven’t revealed stay masked in the file.`,
        '**You want to see where credits go.** Each grant and spend is recorded with its reason. Admins on paid plans can see spend per member and export it as CSV.',
      ],
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit cheaper than ZoomInfo?',
          a: `ZoomInfo doesn’t publish prices for its platform plans, so you need a quote to compare. DataPit’s paid plans start at $${BASIC.price} a month for ${seatsPerBlock(BASIC)} seats, and 10 people cost ${teamPrice(BASIC, 10)} on ${BASIC.name}. The plans include different things, so compare features as well as price.`,
        },
        {
          q: 'Does DataPit have a free plan?',
          a: `Yes. The Free plan is one seat with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for up to ${formatCount(FREE_REVEALS)} reveals in the app. Team features need a paid plan, and you can [create a free account](/login?mode=register) to try it.`,
        },
        {
          q: 'Can I import my ZoomInfo data into DataPit?',
          a: 'No, not today. DataPit has no import for contacts or lists from other tools. You build lists from DataPit’s own search, and you can export them as CSV.',
        },
        {
          q: 'Does DataPit have intent data or direct dials like ZoomInfo?',
          a: `No intent data. ${LIVE.phoneData ? 'A reveal includes a phone number where the record has one, but there is no dialer.' : 'Phone numbers aren’t available yet, and there is no dialer.'} DataPit focuses on people search and work email reveals.`,
        },
        {
          q: 'Does DataPit integrate with Salesforce or HubSpot?',
          a: `Not yet. DataPit has no CRM integrations, Zapier connection or general API. You can export search results and lists as CSV for ${CREDIT_COSTS.CSV_EXPORT} credits per file.`,
        },
      ],
    },
    {
      type: 'cta',
      title: 'Try DataPit without a sales call',
      text: `Start on the Free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, or compare the seat-block prices.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        {
          label: 'DataPit vs ZoomInfo',
          to: '/compare/datapit-vs-zoominfo',
          text: 'Plan by plan, feature by feature, and what one credit buys.',
        },
        { label: 'Apollo alternative', to: '/alternatives/apollo', text: 'How DataPit compares with Apollo.' },
        { label: 'Cognism alternative', to: '/alternatives/cognism', text: 'How DataPit compares with Cognism.' },
        { label: 'Lusha alternative', to: '/alternatives/lusha', text: 'How DataPit compares with Lusha.' },
        {
          label: 'Pricing',
          to: '/pricing',
          text: `A free plan, and seat blocks from $${BASIC.price} a month.`,
        },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'ZoomInfo: Pricing', url: 'https://www.zoominfo.com/pricing', checked: CHECKED },
        {
          label: 'ZoomInfo: Pricing (archived copy of 27 September 2026)',
          url: 'https://web.archive.org/web/20260927023303/https://www.zoominfo.com/pricing',
          checked: CHECKED,
        },
        {
          label: 'ZoomInfo: How much does ZoomInfo cost (pricing guide)',
          url: 'https://pipeline.zoominfo.com/sales/how-much-does-zoominfo-cost',
          checked: CHECKED,
        },
        {
          label: 'ZoomInfo help center: ZoomInfo Lite credits explained',
          url: 'https://help.zoominfo.com/s/article/ZoomInfo-Lite-Credits-Explained',
          checked: CHECKED,
        },
        {
          label: 'ZoomInfo help center: How to sign up for ZoomInfo Lite',
          url: 'https://help.zoominfo.com/s/article/How-to-Sign-Up-for-ZoomInfo-Lite',
          checked: CHECKED,
        },
        {
          label: 'ZoomInfo: Community Edition',
          url: 'https://pipeline.zoominfo.com/sales/community-edition-promotes-fairness-protects-data',
          checked: CHECKED,
        },
        { label: 'ZoomInfo: llms.txt', url: 'https://www.zoominfo.com/llms.txt', checked: CHECKED },
        { label: 'ZoomInfo: Our data', url: 'https://www.zoominfo.com/data', checked: CHECKED },
        {
          label: 'Chrome Web Store: ZoomInfo extension',
          url: 'https://chromewebstore.google.com/detail/zoominfo/fofjcndophjadilglgimelemjkjblgpf?hl=en-US',
          checked: CHECKED,
        },
        {
          label: 'ZoomInfo: Enterprise API',
          url: 'https://www.zoominfo.com/solutions/data-as-a-service/enterprise-api',
          checked: CHECKED,
        },
        { label: 'GTM AI by ZoomInfo: Pricing', url: 'https://gtm.ai/pricing', checked: CHECKED },
      ],
    },
  ],
};
