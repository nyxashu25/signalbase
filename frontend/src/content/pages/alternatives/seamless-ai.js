import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
  WELCOME_GIFT_CREDITS,
  planTotalForInterval,
} from '../../../data/plans.js';

// Seamless.AI facts below come from its own pricing page, help center, product
// pages and Trust Center, read on CHECKED. Pro and Enterprise publish no price
// ("Contact sales"), so this page never states one.
const CHECKED = '2026-09-28';

const plan = (key) => PLANS.find((p) => p.key === key);
const BASIC = plan('BASIC');
const PRO = plan('PROFESSIONAL');
const ORG = plan('ORGANIZATION');
const FREE_REVEALS = Math.floor(FREE_PLAN_MONTHLY_CREDITS / CREDIT_COSTS.REVEAL);
const pct = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);

// A team's DataPit cost at monthly billing: the fewest blocks whose seats
// (paid + free) hold everyone. Matches the factsheet's teamCosts.
function teamCell(p, people) {
  const blocks = Math.ceil(people / (p.block.paidSeats + p.block.freeSeats));
  const total = planTotalForInterval(p.key, 'MONTH', blocks);
  return `$${formatCount(total)} a month (${blocks} ${blocks === 1 ? 'block' : 'blocks'})`;
}

const SEAMLESS_EXTRAS = LIVE.phoneData
  ? 'calling, CRM integrations and an API'
  : 'phone numbers, calling, CRM integrations and an API';

export default {
  meta: {
    path: '/alternatives/seamless-ai',
    section: 'alternatives',
    name: 'Seamless.AI alternative',
    title: 'Seamless.AI Alternative with Public Pricing | DataPit',
    description: `Looking for a Seamless.AI alternative? DataPit publishes its prices: seat blocks from $${BASIC.price} a month and a free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`,
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'Seamless.AI alternative',
    lines: ['Seamless.AI alternative', 'with public pricing'],
    sub: `DataPit is a Seamless.AI alternative for teams that want to see the price before a sales call. Paid plans start at $${BASIC.price} a month for ${BASIC.block.paidSeats} paid seats plus ${BASIC.block.freeSeats} free, and the Free plan gives one user ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} monthly credits. Seamless.AI’s paid plans are quote-only, and it adds ${SEAMLESS_EXTRAS}.`,
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: `DataPit suits small teams that want public prices, free seats and a free plan that renews every month. Stay with Seamless.AI if you need ${LIVE.phoneData ? '' : 'phone numbers, '}calling, CRM integrations or an API, and don’t mind getting a quote from sales.`,
    },

    { type: 'h2', text: 'Why do teams look for a Seamless.AI alternative?' },
    {
      type: 'p',
      text: 'Seamless.AI’s pricing page lists three plans: Free, Pro and Enterprise. Pro is licensed per user with annual credit packages, and Enterprise offers unlimited users with custom packages. Both paid plans are quote-only: the page says “Contact sales” instead of showing a price.',
    },
    {
      type: 'p',
      text: 'At Seamless.AI, contact research, enrichment and AI features spend Universal Credits. Its help center says researching or enriching a contact costs 1 credit, and an AI Assistant interaction or AI-generated message costs 0.2. It also describes a Basic license with 250 credits per user a month, which isn’t on the pricing page and has no published price.',
    },
    {
      type: 'p',
      text: 'The Free plan is one user with 50 credits, and the help center says Free credits don’t replenish. The pricing page mentions an annual discount but states no monthly billing option. A team that wants to compare costs before a sales call has no number to start from.',
    },

    { type: 'h2', text: 'DataPit vs Seamless.AI at a glance' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'Seamless.AI'],
      rows: [
        [
          'Pricing model',
          'Seat blocks: one flat price per block of paid seats plus free seats',
          'Credits. Pro is licensed per user; Enterprise is a custom package',
        ],
        [
          'Lowest paid price',
          `$${BASIC.price} a month for one ${BASIC.name} block, at monthly billing`,
          'Not published. Pro and Enterprise are quote-only',
        ],
        [
          'Billing',
          `Monthly, quarterly (${pct('QUARTER')}% off) or annual (${pct('YEAR')}% off)`,
          'Annual credit packages with an annual discount. No monthly option stated',
        ],
        [
          'Free plan',
          `1 user, ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits every month`,
          '1 user, 50 credits that don’t replenish',
        ],
        [
          'How seats are counted',
          `Per block: ${[BASIC, PRO, ORG]
            .map((p) => `${p.name} ${p.block.paidSeats} paid + ${p.block.freeSeats} free`)
            .join(', ')}`,
          'Pro is per user. Enterprise offers unlimited users',
        ],
        [
          'Credits',
          `Personal monthly credits per seat: ${formatCount(BASIC.block.paidSeatCredits)} or ${formatCount(PRO.block.paidSeatCredits)} per paid seat, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat, plus an owner bonus on ${PRO.name} and ${ORG.name}`,
          'Universal Credits: 1 per contact researched or enriched, 0.2 per AI Assistant interaction or AI-generated message',
        ],
        [
          'Email finding',
          LIVE.emailVerification
            ? `Yes. A reveal (${CREDIT_COSTS.REVEAL} credits) returns the work email on file, or a first.last@ address checked by a verifier`
            : `Yes. A reveal (${CREDIT_COSTS.REVEAL} credits) returns the work email on file, or a first.last@ guess when none is on file. Emails aren’t verified yet`,
          'Yes, on every plan. It describes a 10-step verification process and refunds the credit for an invalid email',
        ],
        [
          'Phone numbers',
          LIVE.phoneData ? 'Yes, in the same reveal, where the record has one' : 'Not yet',
          'Yes, cell phones on every plan, Free included. It says direct dials come with every credit',
        ],
        [
          'Chrome extension',
          `Yes, free on the [Chrome Web Store](${EXTENSION_STORE_URL}). A reveal from it costs ${CREDIT_COSTS.EXTENSION_REVEAL} credits`,
          'Yes, free',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending ? 'Yes, on paid plans' : 'Not yet',
          'Yes. Connect adds email, calls and tasks, on every plan for a limited time',
        ],
        [
          'CRM integrations',
          'Not yet. Export revealed contacts as CSV instead',
          'Yes, including Salesforce, HubSpot, Pipedrive and Zapier. Some are reserved for higher tiers',
        ],
        [
          'API',
          'No general-purpose API. API keys only connect the Chrome extension',
          'Yes, a REST API. Access and credit use depend on the plan',
        ],
        ['Buyer intent data', 'No', 'Add-on on Pro and Enterprise'],
      ],
      note: `Seamless.AI details come from its own website and help center, checked September 28, 2026. Features can differ by plan.`,
    },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'What does Seamless.AI cost for a team compared with DataPit?' },
    {
      type: 'p',
      text: 'Each DataPit price below is the fewest blocks that seat the whole team, at monthly billing. Seamless.AI doesn’t publish prices for Pro or Enterprise, so its column shows quote only.',
    },
    {
      type: 'table',
      head: [
        'Team size',
        `DataPit ${BASIC.name}`,
        `DataPit ${PRO.name}`,
        `DataPit ${ORG.name}`,
        'Seamless.AI Pro or Enterprise',
      ],
      rows: [5, 10, 25].map((n) => [
        `${n} people`,
        teamCell(BASIC, n),
        teamCell(PRO, n),
        teamCell(ORG, n),
        'Quote only',
      ]),
      note: `Prices only: the plans don’t include the same things, so compare credits and features too. DataPit prices are in USD at monthly billing; quarterly billing saves ${pct('QUARTER')}% and annual ${pct('YEAR')}%. Seamless.AI’s pricing page mentions annual credit packages and an annual discount but no prices, and third-party estimates aren’t shown.`,
    },
    {
      type: 'p',
      text: 'Seamless.AI’s Pro plan is licensed per user. A DataPit block’s price stays the same until your team outgrows its seats.',
    },

    { type: 'h2', text: 'When is Seamless.AI the better choice?' },
    {
      type: 'p',
      text: 'Seamless.AI does several things DataPit doesn’t. Choose it if one of these matters most to your team.',
    },
    {
      type: 'list',
      items: [
        LIVE.phoneData
          ? '**Phone numbers matter most.** Seamless.AI includes cell phones on every plan, Free included. Its Phone Finder page says direct dials come with every credit.'
          : '**You need phone numbers.** Seamless.AI includes cell phones on every plan and says direct dials come with every credit. DataPit has no phone data today.',
        LIVE.sequenceSending
          ? '**You want email and calling in one tool.** Connect adds email, calls and tasks, with tracking of sends, opens and replies. The pricing page includes it on every plan for a limited time.'
          : '**You want to send email and make calls from one tool.** Connect adds email, calls and tasks, and the pricing page includes it on every plan for a limited time. DataPit’s sequences don’t send email yet.',
        '**You need CRM integrations or an API.** Seamless.AI lists connectors for Salesforce, HubSpot, Microsoft Dynamics, Zoho, Pipedrive, Salesloft, Outreach and Zapier, plus a REST API. DataPit has no CRM integrations or general-purpose API yet.',
        '**Your security review needs certifications or SSO.** Seamless.AI’s Trust Center lists ISO 27001:2022, ISO 27701:2019 and SOC 2 Type II. Its pricing page offers SSO with Okta and Google, and DataPit has no SAML or Okta single sign-on.',
        '**Database size is your first test.** Seamless.AI says it has 1.3B+ verified contacts and 414M+ verified mobile numbers. These are its own figures, and other Seamless.AI pages give different totals.',
        LIVE.emailVerification
          ? '**You want credits back for bad emails.** Seamless.AI’s homepage says it refunds the credit automatically when an email is invalid.'
          : '**You want credits back for bad emails.** Seamless.AI’s homepage says it refunds the credit automatically when an email is invalid. DataPit doesn’t verify emails yet, so a reveal is charged even when the address is a guess.',
        '**You want buyer intent data.** Seamless.AI sells it as an add-on on Pro and Enterprise. DataPit has no intent data.',
      ],
    },

    { type: 'h2', text: 'When does DataPit fit better?' },
    {
      type: 'p',
      text: 'DataPit fits teams that want public prices, free seats and credits they can plan around.',
    },
    {
      type: 'list',
      items: [
        `**You want to see the price before you talk to sales.** ${BASIC.name} is $${BASIC.price} a month per block, ${PRO.name} $${PRO.price} and ${ORG.name} $${ORG.price}, all on the [pricing page](/pricing). Quarterly billing saves ${pct('QUARTER')}% and annual billing ${pct('YEAR')}%.`,
        `**You want free seats.** Each block includes free seats: ${BASIC.block.paidSeats} paid plus ${BASIC.block.freeSeats} free on ${BASIC.name}, ${PRO.block.paidSeats} plus ${PRO.block.freeSeats} on ${PRO.name} and ${ORG.block.paidSeats} plus ${ORG.block.freeSeats} on ${ORG.name}. Anyone except the workspace owner can take a free seat.`,
        `**Every seat earns its own credits.** Paid seats get ${formatCount(BASIC.block.paidSeatCredits)} credits a month on ${BASIC.name} and ${formatCount(PRO.block.paidSeatCredits)} on ${PRO.name} and ${ORG.name}, and free seats get ${formatCount(FREE_SEAT_MONTHLY_CREDITS)}. Owners get a monthly bonus of ${formatCount(PRO.block.ownerBonus)} on ${PRO.name} or ${formatCount(ORG.block.ownerBonus)} on ${ORG.name}.`,
        `**New teammates start with credits.** Each member gets a one-time ${formatCount(WELCOME_GIFT_CREDITS)}-credit welcome gift the first time a paid plan covers them.`,
        `**Your team pays for each contact once.** A reveal costs ${CREDIT_COSTS.REVEAL} credits in the app. Once anyone on your team reveals a contact, it’s free for the whole workspace.`,
        `**You want a free plan that renews.** The Free plan gives one user ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits every month, enough for ${formatCount(FREE_REVEALS)} in-app reveals. Seamless.AI’s Free plan has 50 credits that don’t replenish.`,
        '**You want to see where credits go.** Each member sees their own credit history. On paid plans, admins can see spend per member by reason and export it as CSV.',
      ],
    },
    {
      type: 'p',
      text: `Searching and filtering cost nothing. Opening a company’s full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time your workspace views it. A CSV export costs ${CREDIT_COSTS.CSV_EXPORT} credits per file of up to 5,000 rows, and contacts you haven’t revealed stay masked in it.`,
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is DataPit cheaper than Seamless.AI?',
          a: `There’s no published price to compare, because Seamless.AI’s Pro and Enterprise plans are quote-only. DataPit’s ${BASIC.name} plan is $${BASIC.price} a month for a block of ${BASIC.block.paidSeats + BASIC.block.freeSeats} seats at monthly billing. Compare that with a Seamless.AI quote, and check what each includes: Seamless.AI adds ${SEAMLESS_EXTRAS}.`,
        },
        {
          q: 'Does DataPit have a free plan?',
          a: `Yes. The Free plan is one user with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, enough for ${formatCount(FREE_REVEALS)} in-app reveals. It includes search, reveals, company profiles, CSV export and the Chrome extension, and team features need a paid plan.`,
        },
        {
          q: 'Does DataPit include phone numbers like Seamless.AI?',
          a: LIVE.phoneData
            ? `Yes, where the record has one. The phone number comes in the same reveal as the email, for ${CREDIT_COSTS.REVEAL} credits.`
            : 'Not yet. A reveal returns a phone number only when the record has one, and DataPit’s records don’t include phone numbers today. If phone numbers matter most, Seamless.AI includes cell phones on every plan.',
        },
        {
          q: 'Can I import my Seamless.AI data into DataPit?',
          a: 'Not today. DataPit has no way to upload your own contacts or CSV files. You search DataPit’s database, reveal the contacts you need and save them to lists.',
        },
        {
          q: 'Does DataPit integrate with Salesforce or HubSpot?',
          a: `Not yet. DataPit has no CRM integrations, Zapier connection or general-purpose API. To move contacts into a CRM today, export your revealed contacts as a CSV file for ${CREDIT_COSTS.CSV_EXPORT} credits.`,
        },
      ],
    },
    {
      type: 'cta',
      title: 'Try DataPit free',
      text: `Start with one user and ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month. Move to a seat block when your team needs it.`,
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        { label: 'Apollo alternative', to: '/alternatives/apollo', text: 'How DataPit compares with Apollo on price and features.' },
        { label: 'ZoomInfo alternative', to: '/alternatives/zoominfo', text: 'How DataPit compares with ZoomInfo on price and features.' },
        { label: 'RocketReach alternative', to: '/alternatives/rocketreach', text: 'How DataPit compares with RocketReach on price and features.' },
        { label: 'Pricing', to: '/pricing', text: `Seat blocks from $${BASIC.price} a month, and a free plan.` },
      ],
    },
    {
      type: 'sources',
      items: [
        { label: 'Seamless.AI pricing page', url: 'https://seamless.ai/pricing', checked: CHECKED },
        {
          label: 'Seamless.AI help center: Seamless Credit and License Types',
          url: 'https://seamless.ai/customers/education/articles/seamless-ai-credit-and-license-types',
          checked: CHECKED,
        },
        { label: 'Seamless.AI Prospector page (database figures)', url: 'https://seamless.ai/products/prospector', checked: CHECKED },
        { label: 'Seamless.AI homepage (database figures, credit refunds)', url: 'https://seamless.ai/', checked: CHECKED },
        {
          label: 'Seamless.AI Email Finder page',
          url: 'https://seamless.ai/products/solutions/features/email-finder',
          checked: CHECKED,
        },
        {
          label: 'Seamless.AI Phone Finder page',
          url: 'https://seamless.ai/products/solutions/features/phone-finder',
          checked: CHECKED,
        },
        { label: 'Seamless.AI Connect page', url: 'https://seamless.ai/products/connect', checked: CHECKED },
        {
          label: 'Seamless.AI help center: Integrations Overview',
          url: 'https://seamless.ai/customers/education/articles/integrations',
          checked: CHECKED,
        },
        { label: 'Seamless.AI Integrations page (plan availability)', url: 'https://seamless.ai/products/integrations', checked: CHECKED },
        { label: 'Seamless.AI API page', url: 'https://seamless.ai/products/api', checked: CHECKED },
        { label: 'Seamless.AI Buyer Intent Data page', url: 'https://seamless.ai/products/buyer-intent-data', checked: CHECKED },
        { label: 'Seamless.AI Chrome Extension page', url: 'https://seamless.ai/products/chrome-extension', checked: CHECKED },
        {
          label: 'Seamless.AI on the Chrome Web Store',
          url: 'https://chromewebstore.google.com/detail/seamlessai/dbepenphjfofmnjmlacfcdehikakmaap',
          checked: CHECKED,
        },
        { label: 'Seamless.AI Trust Center', url: 'https://trust.seamless.ai/', checked: CHECKED },
      ],
    },
  ],
};
