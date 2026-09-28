import { CREDIT_COSTS, EXTENSION_STORE_URL, LIVE, MAX_SELF_SERVE_BLOCKS, formatCount } from '../../../data/facts.js';
import {
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PLANS,
  WELCOME_GIFT_CREDITS,
  blockPriceForInterval,
} from '../../../data/plans.js';

// ZoomInfo facts come from ZoomInfo's own public pages (and GTM AI, its API
// product), read on this date. Every ZoomInfo price or feature below has its
// page in the sources block. ZoomInfo publishes no price for any platform plan.
const CHECKED = '2026-09-28';

const plan = (key) => PLANS.find((p) => p.key === key);
const BASIC = plan('BASIC');
const PRO = plan('PROFESSIONAL');
const ORG = plan('ORGANIZATION');
const pct = (key) => Math.round(BILLING_INTERVALS.find((i) => i.key === key).discount * 100);
const seatsPerBlock = (p) => p.block.paidSeats + p.block.freeSeats;
const blockSeats = (p) => `${p.block.paidSeats} paid + ${p.block.freeSeats} free`;
const money = (n) => (Number.isInteger(n) ? `$${formatCount(n)}` : `$${n.toFixed(2)}`);
// What a block costs per month when it's billed annually.
const annualPerMonth = (p) => money(Math.round((blockPriceForInterval(p.key, 'YEAR') / 12) * 100) / 100);

function dataPitPlanRow(p) {
  if (!p.block) return [p.name, 'Free', 'Free', '1 seat', `${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits`];
  const bonus = p.block.ownerBonus ? `, plus a ${formatCount(p.block.ownerBonus)} owner bonus` : '';
  return [
    p.name,
    `$${p.price} per block`,
    `${annualPerMonth(p)} per block`,
    `${blockSeats(p)} per block`,
    `${formatCount(p.block.paidSeatCredits)} per paid seat, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat${bonus}`,
  ];
}

export default {
  meta: {
    path: '/compare/datapit-vs-zoominfo',
    section: 'compare',
    name: 'DataPit vs ZoomInfo',
    title: 'DataPit vs ZoomInfo: Pricing, Credits and Features',
    description:
      'DataPit vs ZoomInfo, plan by plan: published seat-block prices against quote-only plans, what one credit buys on each, and which features each one has.',
    updated: '2026-09-28',
    published: true,
    station: 'lens',
  },
  hero: {
    eyebrow: 'Comparison',
    lines: ['DataPit vs', 'ZoomInfo'],
    sub: 'DataPit and ZoomInfo both help sales teams find people and reveal their contact details. ZoomInfo is the broader platform, with intent data, phone numbers, a dialer and CRM integrations, and its paid platform plans are quote-only. DataPit is narrower: people search, email reveals and a LinkedIn extension, with public prices and a free plan.',
  },
  blocks: [
    {
      type: 'callout',
      title: 'In short',
      text: 'Choose ZoomInfo if you need intent data, direct dials, a dialer or CRM sync, and an annual quote suits you. Choose DataPit if you want to start free, pay monthly at a published price and give each teammate their own credits. For team costs, see the [ZoomInfo alternative](/alternatives/zoominfo) page.',
    },

    { type: 'h2', text: 'What’s the difference between DataPit and ZoomInfo?' },
    {
      type: 'p',
      text: 'Scope, and how you buy. ZoomInfo sells a wide go-to-market platform: contact data, intent signals, ABM advertising, website visitor identification, workflows and conversation intelligence. Each platform plan is priced by quote, based on features, licenses and credit usage.',
    },
    {
      type: 'p',
      text: 'DataPit does a smaller set of jobs: search people and companies, reveal work emails, build lists and export them. Its prices are published, and paid plans are sold in blocks of paid and free seats.',
    },

    { type: 'h2', text: 'How do DataPit and ZoomInfo plans compare?' },
    {
      type: 'table',
      caption: 'DataPit plans',
      head: ['Plan', 'Monthly billing', 'Annual billing, per month', 'Seats', 'Monthly credits'],
      rows: PLANS.map(dataPitPlanRow),
      note: `Quarterly billing is ${pct('QUARTER')}% off. Each teammate also gets a one-time ${formatCount(WELCOME_GIFT_CREDITS)}-credit welcome gift when a paid plan first covers them. Self-serve checkout goes up to ${MAX_SELF_SERVE_BLOCKS} blocks, and larger teams can [contact sales](/contact).`,
    },
    {
      type: 'table',
      caption: 'ZoomInfo plans',
      head: ['Plan', 'Price', 'Credits', 'What it includes'],
      rows: [
        [
          'ZoomInfo Lite',
          'Free, with no credit card or annual commitment',
          '10 a month, or 25 with Community Edition; 1 credit per reveal',
          'Advanced search, contact exports, the ReachOut Chrome extension, the mobile app and WebSights Lite',
        ],
        [
          'Professional (Sales)',
          'Quote only',
          'A set number of monthly credits per package',
          'Mobile numbers and business email, search and export, CRM integrations, Chrome extension, AI email generation, intelligent dialing',
        ],
        [
          'Copilot Advanced (Sales)',
          'Quote only',
          'Not published',
          'Professional, plus buyer intent signals, website visitors, account fit score, champion tracking and workflows for automated outreach',
        ],
        [
          'Copilot Enterprise (Sales)',
          'Quote only',
          'Not published',
          'Copilot Advanced, plus real-time and custom intent, custom integrations, advanced workflows and reporting, and a dedicated customer service manager',
        ],
        [
          'Demand (Marketing)',
          'Quote only',
          '75K included credits',
          '25 intent topics, and CRM and marketing automation integrations',
        ],
        [
          'ABM Lite (Marketing)',
          'Quote only',
          'No separate number given',
          'Demand, plus 100 intent topics, the ZoomInfo Display Network and LinkedIn, Facebook and Google retargeting ads',
        ],
        [
          'ABM Enterprise (Marketing)',
          'Quote only',
          '150K included credits',
          'Unlimited intent topics and Display Network campaigns',
        ],
        [
          'GTM AI Free (API, MCP, CLI)',
          '$0, no credit card',
          '1,000 data credits and 1,000 AI credits at signup',
          'Free search, lookup and find-similar',
        ],
        [
          'GTM AI pay-as-you-go',
          'Top-ups from $20',
          '$0.45 per data credit, down to $0.25 at the $25,000 spend tier; $0.05 per AI credit',
          'No contract and no seat fees',
        ],
        [
          'GTM AI Enterprise',
          'Quote only',
          'An annual volume of data and AI credits',
          'Mobile phone data, SSO/SAML and SLA-backed support',
        ],
      ],
      note: 'ZoomInfo’s pricing guide says paid platform plans are annual subscriptions with a minimum number of seats, and monthly billing is not standard. Its pricing page says the sales team will work with you on payment frequency. ZoomInfo’s llms.txt says Copilot is no longer a standalone product, so plan names may change.',
    },

    { type: 'h2', text: 'What does one credit buy on DataPit and ZoomInfo?' },
    {
      type: 'p',
      text: 'A credit isn’t the same unit on both, so compare what each action costs rather than how many credits a plan includes.',
    },
    {
      type: 'table',
      head: ['Action', 'DataPit', 'ZoomInfo'],
      rows: [
        [
          'Reveal a contact',
          `${CREDIT_COSTS.REVEAL} credits in the app, or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension`,
          '1 credit on Lite, for the business email and a direct or in-office phone number',
        ],
        [
          'A contact your team already revealed',
          'Free for everyone in the workspace',
          'Not stated for the platform plans. GTM AI Enterprise doesn’t re-charge an enriched record for 12 months.',
        ],
        [
          'Export',
          `${CREDIT_COSTS.CSV_EXPORT} credits per CSV file, up to 5,000 rows. Contacts you haven’t revealed stay masked.`,
          '1 credit per contact or company profile exported, on paid plans',
        ],
        [
          'Company profile',
          `${CREDIT_COSTS.COMPANY_VIEW} credits the first time your workspace opens it, then free`,
          '1 credit per company profile exported',
        ],
        [
          'Search',
          'Free for people and company search, with contact details masked',
          'Free search, lookup and find-similar on GTM AI',
        ],
        [
          'Enrich a record by API',
          'Not available',
          'GTM AI: 1 data credit per new record, $0.45 down to $0.25 each',
        ],
        [
          'AI actions',
          'Not available',
          'GTM AI: about 1 to 20 AI credits per action, at $0.05 each',
        ],
        ...(LIVE.sequenceSending
          ? [
              [
                'Add a contact to a sequence',
                `${formatCount(CREDIT_COSTS.SEQUENCE_ENROLLMENT)} credits per contact enrolled`,
                'Engage, with sequences and a dialer, is an add-on',
              ],
            ]
          : []),
      ],
    },
    {
      type: 'p',
      text: `Credits also arrive differently. Each DataPit member has a personal balance and earns credits monthly by seat: ${formatCount(BASIC.block.paidSeatCredits)} or ${formatCount(PRO.block.paidSeatCredits)} credits per paid seat, ${formatCount(FREE_SEAT_MONTHLY_CREDITS)} per free seat. ZoomInfo’s paid packages come with a set number of monthly credits based on your needs.`,
    },

    { type: 'h2', text: 'Which features do DataPit and ZoomInfo each have?' },
    {
      type: 'table',
      head: ['Feature', 'DataPit', 'ZoomInfo'],
      rows: [
        [
          'People search',
          'Filters for job title, company, seniority, department, company industry, company location and email status. Saved searches.',
          'Advanced search on Lite, and search and export on Professional',
        ],
        ['Company search', 'Filters for industry, employee count and location', 'Company profiles on the Sales and Marketing plans'],
        [
          'Email finding',
          `The work email on file, or ${LIVE.emailVerification ? 'one first.last@ guess, checked by a verifier,' : 'one unverified first.last@ guess'} when there’s none`,
          'Business emails on Lite and the Sales plans',
        ],
        [
          'Email verification',
          LIVE.emailVerification ? 'Reveals are checked by an email verifier' : 'Not yet',
          'ZoomInfo describes its business emails as verified',
        ],
        [
          'Phone numbers',
          LIVE.phoneData ? 'In a reveal, where the record has one' : 'Not yet',
          'Mobile numbers on Professional; a direct or in-office number on Lite',
        ],
        ['Dialer', 'No', 'Intelligent dialing on Professional, and the Engage add-on'],
        [
          'Chrome extension',
          `[Free on the Chrome Web Store](${EXTENSION_STORE_URL}), for LinkedIn profiles`,
          'ReachOut, free for ZoomInfo customers, on LinkedIn, company sites, your CRM and your inbox',
        ],
        [
          'Email sequences',
          LIVE.sequenceSending ? 'On paid plans, with email and wait steps' : 'Not yet',
          'The Engage add-on, and workflows for automated outreach on Copilot Advanced',
        ],
        ['Intent data', 'No', 'Copilot Advanced and up, and 25 to unlimited topics on the Marketing plans'],
        ['Website visitor identification', 'No', 'Copilot Advanced, and WebSights Lite on the free plan'],
        [
          'ABM advertising',
          'No',
          'Display Network and retargeting ads on ABM Lite, and unlimited Display Network campaigns on ABM Enterprise',
        ],
        [
          'CRM integrations',
          'Not yet',
          'Salesforce, HubSpot, Marketo, Eloqua, Sugar, Zoho, Dynamics, Outreach and Salesloft',
        ],
        [
          'API and AI agents',
          'No general API. API keys only connect the Chrome extension.',
          'An Enterprise API by demo, GTM AI’s API, MCP and CLI, and a ZoomInfo MCP for Claude, ChatGPT and other assistants',
        ],
        ['CSV export', `Yes, ${CREDIT_COSTS.CSV_EXPORT} credits per file`, 'Contact exports on Lite, and export on paid plans'],
        ['Single sign-on', 'No', 'SSO/SAML on GTM AI Enterprise'],
        [
          'Opt-out for people listed',
          'A public opt-out form that redacts matching records',
          'ZoomInfo says it processes opt-out requests in 48 to 72 hours',
        ],
      ],
    },
    {
      type: 'p',
      text: 'On size, ZoomInfo’s Our Data page claims 500M+ verified professional profiles and 122M+ company records. Its llms.txt gives 500M+ contacts and 100M+ companies, so the figures vary by page.',
    },
    { type: 'dataCoverage' },

    { type: 'h2', text: 'Who should choose DataPit?' },
    {
      type: 'list',
      items: [
        `**[Founders](/solutions/founders) and small sales teams** who want to start free and pay monthly, from $${BASIC.price} for a ${seatsPerBlock(BASIC)}-seat block.`,
        `**Teams that want every seat to carry credits,** free seats included, with a monthly owner bonus of ${formatCount(PRO.block.ownerBonus)} on ${PRO.name} or ${formatCount(ORG.block.ownerBonus)} on ${ORG.name}.`,
        '**Teams that share their work.** A contact revealed once is free for everyone in the workspace, and the owner can move credits to a teammate.',
        // /solutions/sdrs is published only when LIVE.sequenceSending is on, so link it only then.
        `**${LIVE.sequenceSending ? '[SDRs](/solutions/sdrs)' : 'SDRs'} who prospect on LinkedIn** with the [DataPit Chrome extension](/chrome-extension).`,
        '**Teams that work from spreadsheets** rather than CRM sync. Admins on paid plans can see each member’s credit spend.',
      ],
    },

    { type: 'h2', text: 'Who should choose ZoomInfo?' },
    {
      type: 'list',
      items: [
        `**Revenue teams that run on intent data, direct dials and a dialer.** ${LIVE.phoneData ? 'DataPit has no intent data or dialer.' : 'DataPit has none of these.'}`,
        '**Companies that want sales and marketing data from one vendor,** including ABM advertising and website visitor identification.',
        '**Teams that keep their CRM enriched,** with ZoomInfo updating contacts and accounts for new records or on a schedule.',
        '**Developers and AI agents** that need pay-as-you-go API, MCP or CLI access through GTM AI.',
        '**Buyers with a security review,** since ZoomInfo states SOC 2 Type II, ISO 27001 and ISO 27701 certification.',
      ],
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is ZoomInfo better than DataPit?',
          a: 'For intent data, phone numbers, dialing, integrations and stated scale, ZoomInfo offers far more. DataPit is simpler to buy, with a free plan and published monthly prices. The better choice depends on whether you need ZoomInfo’s extras.',
        },
        {
          q: 'How is a DataPit credit different from a ZoomInfo credit?',
          a: `A ZoomInfo Lite credit reveals one contact, and on paid plans one credit exports one contact or company profile. A DataPit reveal costs ${CREDIT_COSTS.REVEAL} credits, and a CSV export costs ${CREDIT_COSTS.CSV_EXPORT} credits per file. DataPit credits belong to each member, while ZoomInfo packages include a set monthly amount.`,
        },
        {
          q: 'Can I pay for ZoomInfo monthly?',
          a: `ZoomInfo’s pricing guide says paid plans are annual subscriptions and monthly billing is not standard. Its pricing page says the sales team will work with you on payment frequency. DataPit bills monthly, quarterly or annually, with ${pct('QUARTER')}% and ${pct('YEAR')}% off the longer terms.`,
        },
        {
          q: 'Can I try DataPit and ZoomInfo for free?',
          a: `Yes, both have a free plan. DataPit’s gives one person ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month, and ZoomInfo’s pricing guide says Lite has 10 a month, or 25 with Community Edition. ZoomInfo also offers a free trial of its paid platform, typically 7 days.`,
        },
        {
          q: 'Does DataPit have an API like ZoomInfo?',
          a: 'No. DataPit’s API keys only connect the Chrome extension to your workspace. ZoomInfo offers an Enterprise API, and GTM AI, a pay-as-you-go API, MCP and CLI product.',
        },
      ],
    },
    {
      type: 'cta',
      title: 'See DataPit for yourself',
      text: 'Start on the Free plan, or compare the seat-block prices first.',
      primary: { label: 'Start free', to: '/login?mode=register' },
      secondary: { label: 'See pricing', to: '/pricing' },
    },
    {
      type: 'related',
      items: [
        {
          label: 'ZoomInfo alternative',
          to: '/alternatives/zoominfo',
          text: 'Team costs, and when each tool is the better fit.',
        },
        { label: 'DataPit vs Apollo', to: '/compare/datapit-vs-apollo', text: 'The same comparison, with Apollo.' },
        { label: 'People search', to: '/features/people-search', text: 'The filters, and what search costs.' },
        { label: 'Pricing', to: '/pricing', text: `A free plan, and seat blocks from $${BASIC.price} a month.` },
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
        { label: 'ZoomInfo: Free trial', url: 'https://www.zoominfo.com/free-trial', checked: CHECKED },
        { label: 'ZoomInfo: llms.txt', url: 'https://www.zoominfo.com/llms.txt', checked: CHECKED },
        { label: 'ZoomInfo: Our data', url: 'https://www.zoominfo.com/data', checked: CHECKED },
        {
          label: 'ZoomInfo: CRM data enrichment',
          url: 'https://www.zoominfo.com/features/data-enrichment',
          checked: CHECKED,
        },
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
        { label: 'ZoomInfo: MCP', url: 'https://www.zoominfo.com/solutions/zoominfo-mcp', checked: CHECKED },
        { label: 'GTM AI by ZoomInfo: Pricing', url: 'https://gtm.ai/pricing', checked: CHECKED },
      ],
    },
  ],
};
